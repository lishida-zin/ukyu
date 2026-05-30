export type UsageType = 'full' | 'am' | 'pm';
export type UsageStatus = 'planned' | 'confirmed' | 'used';
export type GrantSource = 'new' | 'carried';
export type LeaveKind = 'paid' | 'refresh';
export type IntervalUnit = 'month' | 'year';

export interface Profile {
  id?: number;
  name: string;
  color: string;
  hireDate: string;
  order: number;
  createdAt: string;
}

export interface RefreshRule {
  id?: number;
  profileId: number;
  startDate: string;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  grantDays: number;
  enabled: boolean;
}

export interface Grant {
  id?: number;
  profileId: number;
  leaveKind: LeaveKind;
  fiscalYear: number;
  grantDate: string;
  expiryDate: string;
  totalDays: number;
  source: GrantSource;
  auto?: boolean;
  ruleKey?: string;
  overridden?: boolean;
}

export interface Usage {
  id?: number;
  profileId: number;
  date: string;
  type: UsageType;
  status: UsageStatus;
  grantId: number;
  memo: string;
}

export interface Settings {
  id?: number;
  profileId: number;
  fiscalYearStart: string; // "MM-DD"
  defaultGrantDate: string; // "MM-DD"
}

export interface GrantRule {
  id?: number;
  profileId: number;
  yearsOfService: number;
  grantDays: number;
}
