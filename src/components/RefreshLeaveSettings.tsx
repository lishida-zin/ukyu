import { useState } from 'react';
import { GrantForm } from './GrantForm';
import { Modal } from './Modal';
import { useGrants } from '../hooks/useGrants';
import { useRefreshRule } from '../hooks/useRefreshRule';
import type { IntervalUnit, Grant } from '../db/types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RefreshLeaveSettings() {
  const { rule, upsertRule, syncRefreshGrants } = useRefreshRule();
  const { grants, addGrant, updateGrant } = useGrants();
  const [showManualForm, setShowManualForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const refreshGrants = [...(grants ?? [])]
    .filter((grant) => grant.leaveKind === 'refresh')
    .sort((a, b) => b.grantDate.localeCompare(a.grantDate));
  const autoGrants = refreshGrants.filter((grant) => grant.auto);
  const manualGrants = refreshGrants.filter((grant) => !grant.auto);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const intervalUnit: IntervalUnit = formData.get('intervalUnit') === 'month' ? 'month' : 'year';
    const intervalValue = Math.max(1, Number(formData.get('intervalValue') ?? 1) || 1);
    const grantDays = Math.max(0, Number(formData.get('grantDays') ?? 0) || 0);
    setSaving(true);
    setMessage('');
    try {
      await upsertRule({
        startDate: String(formData.get('startDate') ?? todayISO()),
        intervalValue,
        intervalUnit,
        grantDays,
        enabled: formData.get('enabled') === 'on',
      });
      await syncRefreshGrants();
      setMessage('保存しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddManualGrant(data: {
    fiscalYear: number;
    grantDate: string;
    expiryDate: string;
    totalDays: number;
  }) {
    await addGrant({ ...data, source: 'new', leaveKind: 'refresh', auto: false });
    setShowManualForm(false);
  }

  async function handleOverrideGrant(id: number | undefined, changes: Partial<Grant>) {
    if (id === undefined) return;
    await updateGrant(id, { ...changes, overridden: true });
  }

  return (
    <div className="space-y-5">
      <form
        key={rule?.id ?? 'new-refresh-rule'}
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border-2 border-mint/60 bg-mint-light/30 p-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="refresh-start-date" className="block text-sm font-bold leading-relaxed">
              起点日
            </label>
            <input
              id="refresh-start-date"
              name="startDate"
              type="date"
              defaultValue={rule?.startDate ?? todayISO()}
              required
              className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
            />
          </div>

          <div>
            <label htmlFor="refresh-grant-days" className="block text-sm font-bold leading-relaxed">
              付与日数
            </label>
            <input
              id="refresh-grant-days"
              name="grantDays"
              type="number"
              min={0}
              step={0.5}
              defaultValue={rule?.grantDays ?? 5}
              required
              className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
          <div>
            <label htmlFor="refresh-interval-value" className="block text-sm font-bold leading-relaxed">
              周期
            </label>
            <input
              id="refresh-interval-value"
              name="intervalValue"
              type="number"
              min={1}
              defaultValue={rule?.intervalValue ?? 5}
              required
              className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
            />
          </div>

          <div>
            <label htmlFor="refresh-interval-unit" className="block text-sm font-bold leading-relaxed">
              単位
            </label>
            <select
              id="refresh-interval-unit"
              name="intervalUnit"
              defaultValue={rule?.intervalUnit ?? 'year'}
              className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
            >
              <option value="month">月</option>
              <option value="year">年</option>
            </select>
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-mint bg-surface-bright px-3 py-2 text-base font-bold leading-relaxed text-mint-dark">
          <span>リフレッシュ休暇を有効にする</span>
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={rule?.enabled ?? false}
            className="h-5 w-5 accent-mint-dark"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] rounded-xl bg-mint-dark px-4 py-2 text-base font-bold leading-relaxed text-surface-bright transition-transform active:scale-95 disabled:bg-surface disabled:text-text-sub"
          >
            保存して同期
          </button>
          {message && (
            <span className="text-sm font-bold leading-relaxed text-mint-dark">
              {message}
            </span>
          )}
        </div>
      </form>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold leading-relaxed text-text">
            自動生成の付与
          </h3>
          <span className="rounded-full border border-mint bg-mint-light px-2 py-0.5 text-xs font-bold leading-relaxed text-mint-dark">
            修正すると保護
          </span>
        </div>
        {autoGrants.length > 0 ? (
          <ul className="space-y-2">
            {autoGrants.map((grant) => (
              <li
                key={grant.id ?? grant.ruleKey}
                className="rounded-2xl border-2 border-surface bg-surface p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
                  <span className="font-bold text-text">{grant.grantDate}</span>
                  <span className="rounded-full border border-mint bg-mint-light px-2 py-0.5 text-xs font-bold text-mint-dark">
                    自動
                  </span>
                  {grant.overridden && (
                    <span className="rounded-full border border-peach bg-peach-light px-2 py-0.5 text-xs font-bold text-peach-dark">
                      手動修正
                    </span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold leading-relaxed text-text">
                    日数
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={grant.totalDays}
                      onChange={(e) => {
                        void handleOverrideGrant(grant.id, { totalDays: Number(e.target.value) });
                      }}
                      className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
                    />
                  </label>
                  <label className="text-sm font-bold leading-relaxed text-text">
                    消滅日
                    <input
                      type="date"
                      value={grant.expiryDate}
                      onChange={(e) => {
                        void handleOverrideGrant(grant.id, { expiryDate: e.target.value });
                      }}
                      className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-surface bg-surface px-3 py-2 text-sm leading-relaxed text-text-sub">
            自動生成された付与はまだありません
          </p>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold leading-relaxed text-text">
            手動付与
          </h3>
          <button
            type="button"
            onClick={() => setShowManualForm(true)}
            className="min-h-[44px] rounded-xl border-2 border-dashed border-mint px-3 py-2 text-base font-bold leading-relaxed text-mint-dark transition-colors hover:bg-mint-light"
          >
            + 追加
          </button>
        </div>
        {manualGrants.length > 0 ? (
          <ul className="space-y-2">
            {manualGrants.map((grant) => (
              <li
                key={grant.id}
                className="rounded-2xl border-2 border-surface bg-surface px-3 py-2 text-sm leading-relaxed"
              >
                <span className="font-bold text-text">{grant.grantDate}</span>
                <span className="ml-2 text-text-sub">{grant.totalDays}日</span>
                <span className="ml-2 text-text-sub">〜 {grant.expiryDate}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-surface bg-surface px-3 py-2 text-sm leading-relaxed text-text-sub">
            手動付与はまだありません
          </p>
        )}
      </section>

      <Modal
        open={showManualForm}
        onClose={() => setShowManualForm(false)}
        title="🌿 リフレッシュ休暇をついか"
      >
        <GrantForm
          onSubmit={handleAddManualGrant}
          onCancel={() => setShowManualForm(false)}
        />
      </Modal>
    </div>
  );
}
