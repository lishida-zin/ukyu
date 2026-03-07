/**
 * Get the fiscal year for a given date.
 * If fiscalYearStart is "04-01", then 2025-03-31 belongs to FY2024 and 2025-04-01 belongs to FY2025.
 */
export function getFiscalYear(date: string, fiscalYearStart: string): number {
  const [startMonth, startDay] = fiscalYearStart.split('-').map(Number);
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (month > startMonth || (month === startMonth && day >= startDay)) {
    return year;
  }
  return year - 1;
}

/**
 * Get the date range for a fiscal year.
 * Returns start (inclusive) and end (inclusive) dates as YYYY-MM-DD strings.
 */
export function getFiscalYearRange(
  fiscalYear: number,
  fiscalYearStart: string,
): { start: string; end: string } {
  const [startMonth, startDay] = fiscalYearStart.split('-').map(Number);

  const start = `${fiscalYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;

  // End date is the day before the next fiscal year starts
  const endDate = new Date(fiscalYear + 1, startMonth - 1, startDay);
  endDate.setDate(endDate.getDate() - 1);
  const endYear = endDate.getFullYear();
  const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
  const endDay = String(endDate.getDate()).padStart(2, '0');
  const end = `${endYear}-${endMonth}-${endDay}`;

  return { start, end };
}
