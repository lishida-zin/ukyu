import type { RefreshSummary as RefreshSummaryData } from '../logic/refresh-balance';

interface Props {
  summary: RefreshSummaryData;
}

export function RefreshSummary({ summary }: Props) {
  const expiringOrExpiredDays = summary.expiringSoonDays + summary.expiredDays;
  // 予定をすべて消化したと仮定したときの、じっさいに自由につかえるのこり
  const remainingAfterPlanned = summary.totalRemaining - summary.totalPlanned;

  return (
    <section className="rounded-2xl border-2 border-mint/70 bg-surface-bright p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold leading-relaxed text-mint-dark">
          🌿 リフレッシュ休暇
        </h2>
        <span className="rounded-full border border-mint bg-mint-light px-2 py-0.5 text-xs font-bold leading-relaxed text-mint-dark">
          種別 リ
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon="🌱"
          label="のこり"
          value={summary.totalRemaining}
          unit="日"
          color="mint"
          sub={summary.totalPlanned > 0 ? `よていをひくと ${remainingAfterPlanned}日` : undefined}
        />
        <StatCard
          icon="🎉"
          label="つかった"
          value={summary.totalUsed}
          unit="日"
          color="peach"
        />
        <StatCard
          icon="⏳"
          label="消滅"
          value={expiringOrExpiredDays}
          unit="日"
          color={expiringOrExpiredDays > 0 ? 'warn' : 'lavender'}
        />
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
  sub,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  color: 'lavender' | 'peach' | 'mint' | 'warn';
  sub?: string;
}) {
  const styles = {
    lavender: 'bg-lavender-light/40 text-lavender-dark border-lavender/50',
    peach: 'bg-peach-light/40 text-peach-dark border-peach/50',
    mint: 'bg-mint-light/40 text-mint-dark border-mint/50',
    warn: 'bg-amber-50 text-amber-600 border-amber-300/50',
  };

  return (
    <div className={`rounded-2xl border-2 px-4 py-3 ${styles[color]}`}>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-bold opacity-80">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-base font-medium opacity-70">{unit}</span>
      </div>
      {sub && <p className="mt-0.5 text-xs opacity-60">{sub}</p>}
    </div>
  );
}
