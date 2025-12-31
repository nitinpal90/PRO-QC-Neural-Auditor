
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

  let catErrors = 0;
  let valErrors = 0;
  let templateErrors = 0;

  const qcResults: RowQCResult[] = userRows.map((row) => {
    const rowErrors: string[] = [];
    const userCatValue = row['1st Category'] || '';
    const userFirstCat = normalize(String(userCatValue).split('>')[0]);
    let categoryStatus: RowQCResult['categoryStatus'] = 'Passed';
    
    const expectedTemplate = master.categories.get(userFirstCat);
    
    if (!userFirstCat) {
      categoryStatus = 'Failed';
      rowErrors.push("1st Category Missing");
    } else if (!expectedTemplate) {
      categoryStatus = 'Failed';
      rowErrors.push(`Category "${userFirstCat}" unknown`);
    }

    const userTemplateName = String(row['Template Name'] || row['Template'] || '').trim();
    let templateStatus: RowQCResult['templateStatus'] = 'Passed';
    
    if (!userTemplateName) {
      templateStatus = 'Failed';
      rowErrors.push("Template missing");
    } else if (expectedTemplate && normalize(userTemplateName) !== normalize(expectedTemplate)) {
      templateStatus = 'Failed';
      rowErrors.push(`Template mismatch: Expected "${expectedTemplate}"`);
    }

    const activeRules = master.templateRules.get(userTemplateName) || [];
    const valueErrors: string[] = [];

    activeRules.forEach(rule => {
      const userVal = row[rule.fieldName];
      if (rule.mandatory && !String(userVal || '').trim()) {
        valueErrors.push(`Mandatory: ${rule.fieldName}`);
      }
    });

    Object.keys(row).forEach(key => {
      const rawValue = row[key];
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') return;

      const normKey = normalize(key);
      const strValue = String(rawValue).trim();
      const rule = activeRules.find(r => normalize(r.fieldName) === normKey);

      let valuesToCheck: string[] = [];
      if (rule?.selectionType === 'select') {
        if (strValue.includes('|')) valueErrors.push(`${key}: Only one value allowed`);
        valuesToCheck = [normalize(strValue)];
      } else if (rule?.selectionType === 'multi-select') {
        if (strValue.includes(' |') || strValue.includes('| ')) valueErrors.push(`${key}: Pipe spaces error`);
        valuesToCheck = strValue.split('|').map(v => normalize(v));
      } else {
        valuesToCheck = [normalize(strValue)];
      }

      valuesToCheck.forEach(val => {
        // STRICT CHECK: Only validate against names, ignore any variation/id columns
        const isColorNameCol = normKey === 'color name' || normKey === 'colour name' || (normKey.includes('color') && normKey.includes('name'));
        const isSizeNameCol = normKey === 'size name' || (normKey.includes('size') && normKey.includes('name'));
        const isBrandCol = normKey === 'brand' || normKey === 'brand name';

        if (isBrandCol) {
          if (!master.brands.has(val)) valueErrors.push(`Brand "${val}" invalid`);
        }
        else if (isColorNameCol) {
          if (!master.colors.has(val)) valueErrors.push(`Color "${val}" invalid`);
        }
        else if (isSizeNameCol) {
          if (!master.sizes.has(val)) valueErrors.push(`Size "${val}" invalid`);
        }

        if (rule && rule.allowedValues.length > 0) {
          if (!rule.allowedValues.includes(val)) {
            valueErrors.push(`${key}: "${val}" not allowed`);
          }
        }
      });
    });

    if (categoryStatus === 'Failed') catErrors++;
    if (templateStatus === 'Failed') templateErrors++;
    if (valueErrors.length > 0) valErrors++;

    const isSuccess = categoryStatus === 'Passed' && templateStatus === 'Passed' && valueErrors.length === 0;

    return {
      categoryStatus,
      templateStatus,
      valueStatus: valueErrors.length === 0 ? 'Passed' : 'Failed',
      errorSummary: isSuccess ? 'Success' : 'Failed',
      criticalErrors: [...rowErrors, ...valueErrors]
    };
  });

  return {
    headers: headersRaw,
    rows: userRows,
    qcResults,
    fileName: `Babyshop_QC_Success_Report_${new Date().getTime()}.xlsx`,
    stats: {
      total: userRows.length,
      passed: qcResults.filter(r => r.errorSummary === 'Success').length,
      failed: qcResults.filter(r => r.errorSummary === 'Failed').length,
      catErrors,
      valErrors,
      templateErrors
    }
  };
};

export const exportToExcel = (data: ProcessedData) => {
  const wsData = data.rows.map((row, idx) => {
    const res = data.qcResults[idx];
    return {
      ...row,
      'QC Final Status': res.errorSummary,
      'QC Remarks': res.errorSummary === 'Success' ? 'All checks passed' : res.criticalErrors.join(' | ')
    };
  });

  const ws = XLSX.utils.json_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'QC Report');
  XLSX.writeFile(wb, data.fileName);
};
