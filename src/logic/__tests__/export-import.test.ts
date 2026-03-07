import { describe, it, expect } from 'vitest';
import { exportToJson, parseImportData } from '../export-import';
import type { ExportData } from '../export-import';

const validData: ExportData = {
  grants: [
    {
      id: 1,
      fiscalYear: 2025,
      grantDate: '2025-04-01',
      expiryDate: '2027-03-31',
      totalDays: 20,
      source: 'new',
    },
  ],
  usages: [
    {
      id: 1,
      date: '2025-05-01',
      type: 'full',
      status: 'used',
      grantId: 1,
      memo: 'テスト',
    },
  ],
  settings: {
    id: 1,
    fiscalYearStart: '04-01',
    defaultGrantDate: '04-01',
    hireDate: '2020-04-01',
  },
};

const validDataWithRules: ExportData = {
  ...validData,
  grantRules: [
    { id: 1, yearsOfService: 0.5, grantDays: 10 },
    { id: 2, yearsOfService: 1.5, grantDays: 11 },
  ],
};

describe('exportToJson', () => {
  it('should return valid JSON string', () => {
    const result = exportToJson(validData);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should preserve all data fields', () => {
    const result = exportToJson(validData);
    const parsed = JSON.parse(result);
    expect(parsed.grants).toHaveLength(1);
    expect(parsed.usages).toHaveLength(1);
    expect(parsed.settings.fiscalYearStart).toBe('04-01');
  });

  it('should include grantRules when provided', () => {
    const result = exportToJson(validDataWithRules);
    const parsed = JSON.parse(result);
    expect(parsed.grantRules).toHaveLength(2);
    expect(parsed.grantRules[0].yearsOfService).toBe(0.5);
    expect(parsed.grantRules[1].grantDays).toBe(11);
  });

  it('should not include grantRules when not provided', () => {
    const result = exportToJson(validData);
    const parsed = JSON.parse(result);
    expect(parsed.grantRules).toBeUndefined();
  });
});

describe('parseImportData', () => {
  it('should parse valid JSON', () => {
    const json = JSON.stringify(validData);
    const result = parseImportData(json);
    expect(result.grants).toHaveLength(1);
    expect(result.usages).toHaveLength(1);
    expect(result.settings.hireDate).toBe('2020-04-01');
  });

  it('should parse data with grantRules', () => {
    const json = JSON.stringify(validDataWithRules);
    const result = parseImportData(json);
    expect(result.grantRules).toHaveLength(2);
    expect(result.grantRules![0].yearsOfService).toBe(0.5);
  });

  it('should accept data without grantRules (backward compatible)', () => {
    const json = JSON.stringify(validData);
    const result = parseImportData(json);
    expect(result.grantRules).toBeUndefined();
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseImportData('not json')).toThrow('JSONの形式が正しくありません');
  });

  it('should throw on missing grants array', () => {
    const json = JSON.stringify({ usages: [], settings: {} });
    expect(() => parseImportData(json)).toThrow('データの形式が正しくありません');
  });

  it('should throw on missing settings object', () => {
    const json = JSON.stringify({ grants: [], usages: [] });
    expect(() => parseImportData(json)).toThrow('データの形式が正しくありません');
  });

  it('should throw on null input', () => {
    expect(() => parseImportData('null')).toThrow('データの形式が正しくありません');
  });

  it('should throw when grant is missing fiscalYear', () => {
    const data = {
      ...validData,
      grants: [{ grantDate: '2025-04-01', expiryDate: '2027-03-31', totalDays: 20, source: 'new' }],
    };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'grants[0] に必須フィールド「fiscalYear」がありません',
    );
  });

  it('should throw when grant is missing grantDate', () => {
    const data = {
      ...validData,
      grants: [{ fiscalYear: 2025, expiryDate: '2027-03-31', totalDays: 20, source: 'new' }],
    };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'grants[0] に必須フィールド「grantDate」がありません',
    );
  });

  it('should throw when grant is missing expiryDate', () => {
    const data = {
      ...validData,
      grants: [{ fiscalYear: 2025, grantDate: '2025-04-01', totalDays: 20, source: 'new' }],
    };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'grants[0] に必須フィールド「expiryDate」がありません',
    );
  });

  it('should throw when grant is missing totalDays', () => {
    const data = {
      ...validData,
      grants: [{ fiscalYear: 2025, grantDate: '2025-04-01', expiryDate: '2027-03-31', source: 'new' }],
    };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'grants[0] に必須フィールド「totalDays」がありません',
    );
  });

  it('should throw when usage is missing date', () => {
    const data = {
      ...validData,
      usages: [{ type: 'full', status: 'used', grantId: '1', memo: '' }],
    };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'usages[0] に必須フィールド「date」がありません',
    );
  });

  it('should throw when usage is missing type', () => {
    const data = {
      ...validData,
      usages: [{ date: '2025-05-01', status: 'used', grantId: '1', memo: '' }],
    };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'usages[0] に必須フィールド「type」がありません',
    );
  });

  it('should throw when usage is missing status', () => {
    const data = {
      ...validData,
      usages: [{ date: '2025-05-01', type: 'full', grantId: '1', memo: '' }],
    };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'usages[0] に必須フィールド「status」がありません',
    );
  });

  it('should throw when grant element is not an object', () => {
    const data = { ...validData, grants: ['not-an-object'] };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'grants[0] がオブジェクトではありません',
    );
  });

  it('should throw when usage element is not an object', () => {
    const data = { ...validData, usages: [null] };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'usages[0] がオブジェクトではありません',
    );
  });

  it('should throw when grantRules is not an array', () => {
    const data = { ...validData, grantRules: 'not-array' };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'grantRules が配列ではありません',
    );
  });

  it('should validate second element in grants array', () => {
    const data = {
      ...validData,
      grants: [
        validData.grants[0],
        { fiscalYear: 2026, grantDate: '2026-04-01', expiryDate: '2028-03-31' },
      ],
    };
    expect(() => parseImportData(JSON.stringify(data))).toThrow(
      'grants[1] に必須フィールド「totalDays」がありません',
    );
  });
});
