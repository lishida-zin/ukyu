import { useState } from 'react';

interface Props {
  onSubmit: (grant: {
    fiscalYear: number;
    grantDate: string;
    expiryDate: string;
    totalDays: number;
  }) => void;
  onCancel: () => void;
}

function addYearsMinusOneDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 2);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function GrantForm({ onSubmit, onCancel }: Props) {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [grantDate, setGrantDate] = useState('');
  const [totalDays, setTotalDays] = useState(10);

  const expiryDate = grantDate ? addYearsMinusOneDay(grantDate) : '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!grantDate) return;
    onSubmit({ fiscalYear, grantDate, expiryDate, totalDays });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="grant-fiscal-year" className="block text-sm font-bold leading-relaxed">ねんど</label>
        <input
          id="grant-fiscal-year"
          type="number"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-base leading-relaxed"
        />
      </div>

      <div>
        <label htmlFor="grant-date" className="block text-sm font-bold leading-relaxed">ふよ日</label>
        <input
          id="grant-date"
          type="date"
          value={grantDate}
          onChange={(e) => setGrantDate(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-base leading-relaxed"
        />
      </div>

      <div>
        <label htmlFor="grant-total-days" className="block text-sm font-bold leading-relaxed">日数</label>
        <input
          id="grant-total-days"
          type="number"
          min={0}
          max={40}
          value={totalDays}
          onChange={(e) => setTotalDays(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-base leading-relaxed"
        />
      </div>

      {expiryDate && (
        <p className="text-sm leading-relaxed text-text-sub">
          しっこう日: {expiryDate}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-2 font-bold leading-relaxed"
        >
          やめる
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl bg-lavender-dark py-2 font-bold leading-relaxed text-surface-bright"
        >
          とうろく
        </button>
      </div>
    </form>
  );
}
