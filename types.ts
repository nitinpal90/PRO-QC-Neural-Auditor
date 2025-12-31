
export interface ValidationRule {
  templateName: string;
  fieldName: string;
  fieldType: string; // 'select', 'multi-select', 'text', etc.
  selectionType: 'select' | 'multi-select' | 'open';
  mandatory: boolean;
  allowedValues: string[];
}

export interface CategoryMapping {
  category: string;
  expectedTemplate: string;
}

export interface MasterData {
  brands: Set<string>;
  categories: Map<string, string>; // Category -> TemplateName
  colors: Set<string>;
  sizes: Set<string>;
  templateRules: Map<string, ValidationRule[]>; // TemplateName -> Rules[]
}

export interface RowQCResult {
  categoryStatus: 'Passed' | 'Failed';
  templateStatus: 'Passed' | 'Failed';
  valueStatus: 'Passed' | 'Failed';
  errorSummary: string;
  criticalErrors: string[];
}

export interface ProcessedData {
  headers: string[];
  rows: any[];
  qcResults: RowQCResult[];
  fileName: string;
  stats: {
    total: number;
    passed: number;
    failed: number;
    catErrors: number;
    valErrors: number;
    templateErrors: number;
  };
}

export enum UploadType {
  MASTER_BRANDS = 'MASTER_BRANDS',
  MASTER_COLORS = 'MASTER_COLORS',
  MASTER_SIZES = 'MASTER_SIZES',
  MASTER_CATEGORIES = 'MASTER_CATEGORIES',
  MASTER_TEMPLATE_EXPORT = 'MASTER_TEMPLATE_EXPORT',
  USER_SHEET = 'USER_SHEET'
}
