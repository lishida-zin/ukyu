export type UsageType = 'full' | 'am' | 'pm';
export type UsageStatus = 'planned' | 'confirmed' | 'used';
export type GrantSource = 'new' | 'carried';

export interface Grant {
  id?: number;
  fiscalYear: number;
  grantDate: string;
  expiryDate: string;
  totalDays: number;
  source: GrantSource;
}

export interface Usage {
  id?: number;
  date: string;
  type: UsageType;
  status: UsageStatus;
  grantId: number;
  memo: string;
}

export interface Settings {
  id?: number;
  fiscalYearStart: string; // "MM-DD"
  defaultGrantDate: string; // "MM-DD"
  hireDate: string; // "YYYY-MM-DD"
}

export interface GrantRule {
  id?: number;
  yearsOfService: number;
  grantDays: number;
}
