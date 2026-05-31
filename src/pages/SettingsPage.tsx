import { useState, useRef } from 'react';
import { Card } from '../components/Card';
import { Collapsible } from '../components/Collapsible';
import { Modal } from '../components/Modal';
import { GrantForm } from '../components/GrantForm';
import { GrantRuleSettings } from '../components/GrantRuleSettings';
import { ProfileSettings } from '../components/ProfileSettings';
import { RefreshLeaveSettings } from '../components/RefreshLeaveSettings';
import { useGrants } from '../hooks/useGrants';
import { useSettings } from '../hooks/useSettings';
import { useGrantRules } from '../hooks/useGrantRules';
import { useActiveProfile } from '../contexts/ActiveProfileContext';
import { getDefaultGrantRules } from '../logic/grant-rules';
import { requestNotificationPermission } from '../logic/notifications';
import { exportToJson, normalizeImportDataForV2, parseImportData } from '../logic/export-import';
import { generateAutoGrants } from '../logic/auto-grant';
import { db } from '../db';

function FiscalYearStartField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  // ローカル state で入力し onBlur で確定（入力中の DB 書込→再レンダによるカーソル飛びを防ぐ）
  const [local, setLocal] = useState(value);
  return (
    <input
      id="fiscal-year-start"
      type="text"
      placeholder="04-01"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onCommit(local);
      }}
      enterKeyHint="done"
      className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-4 py-3 text-base leading-relaxed text-text focus:border-lavender focus:outline-none focus:ring-2 focus:ring-lavender/40"
    />
  );
}

interface SettingsPageProps {
  initialOpenSection?: 'refresh';
}

export function SettingsPage({ initialOpenSection }: SettingsPageProps = {}) {
  const { grants, addGrant, deleteGrant } = useGrants();
  const { settings, updateSettings } = useSettings();
  const { rules } = useGrantRules();
  const activeProfile = useActiveProfile();

  const [showGrantForm, setShowGrantForm] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(
    () => 'Notification' in window && Notification.permission === 'granted',
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAutoGrant() {
    if (!activeProfile?.hireDate) {
      alert('さきに「プロフィール」でにゅうしゃ日を入力してね');
      return;
    }
    const activeRules = rules && rules.length > 0 ? rules : getDefaultGrantRules();
    const newGrants = generateAutoGrants(
      activeProfile.hireDate,
      activeRules,
      grants ?? [],
    );
    if (newGrants.length === 0) {
      alert('ついかするふよはないよ');
      return;
    }
    for (const g of newGrants) {
      await addGrant(g);
    }
    alert(`${newGrants.length}件のふよをついかしたよ！`);
  }

  async function handleAddGrant(data: {
    fiscalYear: number;
    grantDate: string;
    expiryDate: string;
    totalDays: number;
  }) {
    await addGrant({ ...data, source: 'new', leaveKind: 'paid' });
    setShowGrantForm(false);
  }

  async function handleToggleNotification() {
    if (notificationEnabled) {
      setNotificationEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    setNotificationEnabled(granted);
    if (!granted) {
      alert('つうちのきょかが取れませんでした');
    }
  }

  async function handleExport() {
    if (!settings) return;
    try {
      const [allGrants, allUsages, allGrantRules, profiles, refreshRules] = await Promise.all([
        db.grants.toArray(),
        db.usages.toArray(),
        db.grantRules.toArray(),
        db.profiles.toArray(),
        db.refreshRules.toArray(),
      ]);
      const json = exportToJson({
        grants: allGrants,
        usages: allUsages,
        settings,
        grantRules: allGrantRules,
        profiles,
        refreshRules,
      });
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ukyu-backup-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('エクスポートに失敗しました');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = parseImportData(text);

      const confirmed = window.confirm(
        'いまのデータをすべてけして、よみこんだデータにおきかえるよ。いい？',
      );
      if (!confirmed) return;

      const normalized = normalizeImportDataForV2(data, new Date().toISOString());
      await db.transaction(
        'rw',
        [db.profiles, db.refreshRules, db.grants, db.usages, db.settings, db.grantRules],
        async () => {
          await db.profiles.clear();
          await db.refreshRules.clear();
          await db.grants.clear();
          await db.usages.clear();
          await db.settings.clear();
          await db.grantRules.clear();

          if (normalized.profiles.length > 0) {
            await db.profiles.bulkAdd(normalized.profiles);
          }
          if (normalized.refreshRules.length > 0) {
            await db.refreshRules.bulkAdd(normalized.refreshRules);
          }
          if (normalized.grants.length > 0) {
            await db.grants.bulkAdd(normalized.grants);
          }
          if (normalized.usages.length > 0) {
            await db.usages.bulkAdd(normalized.usages);
          }
          await db.settings.add(normalized.settings);
          if (normalized.grantRules.length > 0) {
            await db.grantRules.bulkAdd(normalized.grantRules);
          }
        }
      );

      alert('データをよみこみました');
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'よみこみに失敗しました',
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const today = new Date().toISOString().slice(0, 10);
  const sortedGrants = [...(grants ?? [])].sort((a, b) =>
    b.grantDate.localeCompare(a.grantDate),
  );

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-xl font-bold leading-relaxed">せってい</h1>

      <Collapsible title="👥 プロフィール" defaultOpen={true}>
        <Card>
          <ProfileSettings />
        </Card>
      </Collapsible>

      {/* 1. 有給のふよ */}
      <Collapsible title="🎁 有給のふよ" defaultOpen={true}>
        <Card>
          {sortedGrants.length > 0 ? (
            <ul className="space-y-2">
              {sortedGrants.map((grant) => {
                const expired = grant.expiryDate < today;
                return (
                  <li
                    key={grant.id}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      expired ? 'bg-gray-100 opacity-60' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-sm leading-relaxed">
                      <span className="font-bold">{grant.fiscalYear}年度</span>
                      <span className="ml-2 text-text-sub">
                        {grant.totalDays}日
                      </span>
                      <span className="ml-2 text-text-sub">
                        〜 {grant.expiryDate}
                      </span>
                      {expired && (
                        <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-text-sub">
                          きげんぎれ
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => grant.id && deleteGrant(grant.id)}
                      className="ml-2 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center text-red-400 hover:text-red-600 active:scale-95 transition-transform"
                      aria-label="ふよを削除"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-text-sub">
              まだふよがありません
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleAutoGrant}
              className="flex-1 rounded-xl bg-lavender-dark py-2 text-sm font-bold leading-relaxed text-surface-bright active:scale-95 transition-transform"
            >
              🪄 じどうふよ
            </button>
            <button
              type="button"
              onClick={() => setShowGrantForm(true)}
              className="flex-1 rounded-xl border-2 border-dashed border-gray-200 py-2 text-sm font-bold leading-relaxed text-text-sub hover:border-lavender hover:text-lavender-dark active:scale-95 transition-transform"
            >
              + しゅどうついか
            </button>
          </div>
        </Card>
      </Collapsible>

      {/* 2. きほん設定 */}
      <Collapsible title="👤 きほん設定" defaultOpen={false}>
        <Card>
          <div className="space-y-4">
            <div>
              <label htmlFor="fiscal-year-start" className="block text-sm font-bold leading-relaxed">
                ねんどのはじまり
              </label>
              <FiscalYearStartField
                value={settings?.fiscalYearStart ?? ''}
                onCommit={(v) => updateSettings({ fiscalYearStart: v })}
              />
              <p className="mt-1 text-xs text-text-sub leading-relaxed">
                れい: 04-01（4がつ1にち）
              </p>
            </div>
          </div>
        </Card>
      </Collapsible>

      {/* 3. ふよルール */}
      <Collapsible title="📊 ふよルール" defaultOpen={false}>
        <Card>
          <GrantRuleSettings />
        </Card>
      </Collapsible>

      <Collapsible title="🌿 リフレッシュ休暇" defaultOpen={initialOpenSection === 'refresh'} color="mint">
        <Card>
          <RefreshLeaveSettings />
        </Card>
      </Collapsible>

      {/* 5. つうち */}
      <Collapsible title="🔔 つうち" defaultOpen={false}>
        <Card>
          <button
            type="button"
            onClick={handleToggleNotification}
            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold leading-relaxed active:scale-95 transition-transform ${
              notificationEnabled
                ? 'bg-lavender-light text-lavender-dark'
                : 'bg-gray-50 text-text-sub'
            }`}
          >
            <span>つうち</span>
            <span className="text-lg">{notificationEnabled ? 'ON' : 'OFF'}</span>
          </button>
          <p className="mt-2 text-xs text-text-sub leading-relaxed">
            有給のきげんがちかづいたら おしらせするよ
          </p>
        </Card>
      </Collapsible>

      {/* 6. データのかんり */}
      <Collapsible title="💾 データのかんり" defaultOpen={false}>
        <Card>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="flex-1 rounded-xl bg-lavender-dark py-2 text-sm font-bold leading-relaxed text-surface-bright active:scale-95 transition-transform"
            >
              エクスポート
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-xl border border-lavender-dark py-2 text-sm font-bold leading-relaxed text-lavender-dark active:scale-95 transition-transform"
            >
              インポート
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
          <p className="mt-2 text-xs text-text-sub leading-relaxed">
            データをバックアップしたり、ほかのデバイスにうつせるよ
          </p>
        </Card>
      </Collapsible>

      {/* Grant form modal */}
      <Modal
        open={showGrantForm}
        onClose={() => setShowGrantForm(false)}
        title="🎁 有給をついか"
      >
        <GrantForm
          onSubmit={handleAddGrant}
          onCancel={() => setShowGrantForm(false)}
        />
      </Modal>
    </div>
  );
}
