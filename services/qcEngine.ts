import * as XLSX from 'xlsx';
import { ValidationRule, MasterData, RowQCResult, ProcessedData, UploadType } from '../types';

const normalize = (val: any): string => String(val || '').trim().toLowerCase();

const getSheetData = (wb: XLSX.WorkBook) => {
  const name = wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' }) as any[];
};

export const runQCValidation = async (
  files: Record<UploadType, XLSX.WorkBook>
): Promise<ProcessedData> => {
  const brandRows = getSheetData(files[UploadType.MASTER_BRANDS]);
  const colorRows = getSheetData(files[UploadType.MASTER_COLORS]);
  const sizeRows = getSheetData(files[UploadType.MASTER_SIZES]);
  const categoryRows = getSheetData(files[UploadType.MASTER_CATEGORIES]);
  const templateExportRows = getSheetData(files[UploadType.MASTER_TEMPLATE_EXPORT]);

  const master: MasterData = {
    brands: new Set(brandRows.map(r => normalize(Object.values(r)[0]))),
    colors: new Set(colorRows.map(r => normalize(Object.values(r)[0]))),
    sizes: new Set(sizeRows.map(r => normalize(Object.values(r)[0]))),
    categories: new Map(),
    templateRules: new Map()
  };

  categoryRows.forEach(row => {
    const cat = normalize(row['Category'] || row['Category Name'] || Object.values(row)[0]);
    const template = String(row['Template Name'] || row['Template'] || '').trim();
    if (cat && template) master.categories.set(cat, template);
  });

  templateExportRows.forEach(row => {
    const tName = String(row['Template Name'] || row['Template'] || '').trim();
    const fName = String(row['Field Name'] || row['Attribute'] || '').trim();
    if (!tName || !fName) return;

    const fTypeRaw = normalize(row['Field Type'] || row['Input Type']);
    let selectionType: 'select' | 'multi-select' | 'open' = 'open';
    if (fTypeRaw.includes('multi')) selectionType = 'multi-select';
    else if (fTypeRaw.includes('select') || fTypeRaw.includes('dropdown')) selectionType = 'select';

    const rule: ValidationRule = {
      templateName: tName,
      fieldName: fName,
      fieldType: fTypeRaw,
      selectionType,
      mandatory: normalize(row['Mandatory'] || row['Required']) === 'yes',
      allowedValues: String(row['Allowed Values'] || row['Values'] || '').split('|').map(v => normalize(v)).filter(Boolean)
    };

    if (!master.templateRules.has(tName)) master.templateRules.set(tName, []);
    master.templateRules.get(tName)!.push(rule);
  });

  const userRows = getSheetData(files[UploadType.USER_SHEET]);
  const userSheet = files[UploadType.USER_SHEET].Sheets[files[UploadType.USER_SHEET].SheetNames[0]];
  const headersRaw = (XLSX.utils.sheet_to_json(userSheet, { header: 1 })[0] as string[]) || [];
  const normalizedUserHeaders = headersRaw.map(h => normalize(h));

  let catErrors = 0;
  let valErrors = 0;
  let templateErrors = 0;

  const qcResults: RowQCResult[] = userRows.map((row) => {
    const rowErrors: string[] = [];
    const userCatValue = row['1st Category'] || '';
    const userFirstCat = normalize(String(userCatValue).split('>')[0]);
    
    // 1. Template Identification
    const expectedTemplate = master.categories.get(userFirstCat);
    const userTemplateName = String(row['Template Name'] || row['Template'] || '').trim();
    const activeRules = master.templateRules.get(userTemplateName) || [];

    // 2. Header QC Logic
    const mandatoryFields = activeRules.filter(r => r.mandatory).map(r => normalize(r.fieldName));
    const missingHeaders = mandatoryFields.filter(f => !normalizedUserHeaders.includes(f));
    const headerQCStatus = missingHeaders.length === 0 ? 'Passed' : `Failed: Missing ${missingHeaders.join(', ')}`;

    // 3. Category & Template Status
    let categoryStatus: RowQCResult['categoryStatus'] = 'Passed';
    if (!userFirstCat) { categoryStatus = 'Failed'; rowErrors.push("1st Category Missing"); }
    else if (!expectedTemplate) { categoryStatus = 'Failed'; rowErrors.push(`Category "${userFirstCat}" unknown`); }

    let templateStatus: RowQCResult['templateStatus'] = 'Passed';
    if (!userTemplateName) { templateStatus = 'Failed'; rowErrors.push("Template missing"); }
    else if (expectedTemplate && normalize(userTemplateName) !== normalize(expectedTemplate)) {
      templateStatus = 'Failed';
      rowErrors.push(`Template mismatch: Expected "${expectedTemplate}"`);
    }

    // 4. Value QC Logic
    const valueErrors: string[] = [];
    activeRules.forEach(rule => {
      const userVal = row[rule.fieldName];
      const normKey = normalize(rule.fieldName);
      const strValue = String(userVal || '').trim();

      // Mandatory check
      if (rule.mandatory && !strValue) {
        valueErrors.push(`${rule.fieldName} is Mandatory`);
        return;
      }

      if (!strValue) return;

      // Type & Content Check
      let valuesToCheck: string[] = [];
      if (rule.selectionType === 'select') {
        if (strValue.includes('|')) valueErrors.push(`${rule.fieldName}: Single value expected, found multiple`);
        valuesToCheck = [normalize(strValue)];
      } else if (rule.selectionType === 'multi-select') {
        valuesToCheck = strValue.split('|').map(v => normalize(v));
      } else {
        valuesToCheck = [normalize(strValue)];
      }

      valuesToCheck.forEach(val => {
        // Global Authority Check
        const isColor = normKey.includes('color name') || normKey.includes('colour name');
        const isSize = normKey.includes('size name');
        const isBrand = normKey === 'brand' || normKey === 'brand name';

        if (isBrand && !master.brands.has(val)) valueErrors.push(`Brand "${val}" invalid`);
        else if (isColor && !master.colors.has(val)) valueErrors.push(`Color "${val}" invalid`);
        else if (isSize && !master.sizes.has(val)) valueErrors.push(`Size "${val}" invalid`);

        // Template Specific Allowed Values
        if (rule.allowedValues.length > 0 && !rule.allowedValues.includes(val)) {
          valueErrors.push(`${rule.fieldName}: "${val}" not allowed`);
        }
      });
    });

    if (categoryStatus === 'Failed') catErrors++;
    if (templateStatus === 'Failed') templateErrors++;
    if (valueErrors.length > 0) valErrors++;

    const isSuccess = categoryStatus === 'Passed' && templateStatus === 'Passed' && valueErrors.length === 0 && headerQCStatus === 'Passed';

    return {
      categoryStatus,
      templateStatus,
      valueStatus: valueErrors.length === 0 ? 'Passed' : 'Failed',
      headerQCStatus, // Custom field for exact mapping
      errorSummary: isSuccess ? 'Passed' : 'Failed',
      criticalErrors: [...rowErrors, ...valueErrors]
    };
  });

  return {
    headers: headersRaw,
    rows: userRows,
    qcResults,
    fileName: `Babyshop_QC_Audit_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
    stats: {
      total: userRows.length,
      passed: qcResults.filter(r => r.errorSummary === 'Passed').length,
      failed: qcResults.filter(r => r.errorSummary === 'Failed').length,
      catErrors,
      valErrors,
      templateErrors
    }
  };
};

export const exportToExcel = (data: ProcessedData) => {
  const wsData = data.rows.map((row, idx) => {
    const res = data.qcResults[idx] as any;
    return {
      ...row,
      'Header QC': res.headerQCStatus,
      'Values QC': res.criticalErrors.join(' | ') || 'All Values Passed',
      'QC Summary': res.errorSummary === 'Passed' ? 'Passed' : `Failed - ${res.criticalErrors.slice(0, 3).join(' | ')}${res.criticalErrors.length > 3 ? '...' : ''}`
    };
  });

  const ws = XLSX.utils.json_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Babyshop QC Audit');
  XLSX.writeFile(wb, data.fileName);
};