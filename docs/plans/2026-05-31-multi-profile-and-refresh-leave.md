# マルチプロフィール ＋ リフレッシュ休暇 Implementation Plan

> **For Claude/Codex:** タスクは番号順に実装する。各タスクは TDD（失敗テスト→最小実装→pass→commit）。`Implements:` は `docs/specs/2026-05-31-multi-profile-and-refresh-leave.md`（spec）の受け入れ基準/決定事項への参照。spec にない要件は追加しない（スコープクリープ防止）。

**Goal:** 1 端末で複数プロフィールを切り替えて有給を独立管理し、有給とは別バケツのリフレッシュ休暇をルール設定（起点日・周期・日数・次回更新で消滅）で管理できるようにする。

**Architecture:** 単一 Dexie DB を v1→v2 にマイグレーションし、`profiles` / `refreshRules` テーブルを追加、既存 4 テーブルに `profileId` を付与。アクティブプロフィールは React Context + localStorage で保持し、全データ hook を profile スコープ化。リフレッシュ休暇は `Grant.leaveKind='refresh'` フラグで表現し、純粋関数 `generateRefreshGrants` でハイブリッド生成。

**Tech Stack:** React 19, TypeScript 5.9 (strict), Vite 7, Tailwind v4, Dexie 4 + dexie-react-hooks, Vitest 4 + @testing-library/react + fake-indexeddb。

**検証コマンド:**
- 型: `npx tsc --noEmit`
- テスト: `npx vitest run`（現状 111 件 green がベースライン）
- ビルド: `npx vite build`

**前提（既存パターン）:**
- 全データ hook は `db.<table>.toArray()` でグローバル読み（`src/hooks/*.ts`）。
- 付与生成は純粋関数＋`today?` 注入（`src/logic/auto-grant.ts`）。リフレッシュ生成もこの流儀を踏襲。
- 日付は `'YYYY-MM-DD'` 文字列。ローカル解釈は `new Date(s + 'T00:00:00')`（`grant-cycle.ts` 準拠）。
- 設定は単一行（`useSettings`）。`hireDate` は今回 `Profile` へ移設。

---

## フェーズ構成

- **Phase A** — 型 ＋ Dexie v2 スキーマ ＋ マイグレーション backfill（基盤）
- **Phase B** — アクティブプロフィール Context ＋ profile CRUD ＋ 既存 hook の profile スコープ化
- **Phase C** — プロフィール切替 UI ＋ 設定画面のプロフィール管理
- **Phase D** — リフレッシュ休暇ロジック（型・`generateRefreshGrants`・ハイブリッド同期）
- **Phase E** — リフレッシュ残高（別バケツ集計）＋ サマリー/カレンダー/設定 UI
- **Phase F** — export/import v2 ＋ 自動付与の profile 対応 ＋ 統合検証

---

# Phase A — 型・スキーマ・マイグレーション

### Task A1: ドメイン型の追加（profileId 必須化）

**Implements:** Spec 決定事項（データ分離=単一DB+profileId / 休暇種別=leaveKind）、受け入れ基準 8

**Files:**
- Modify: `src/db/types.ts`

**Step 1: 型を更新**

```typescript
export type UsageType = 'full' | 'am' | 'pm';
export type UsageStatus = 'planned' | 'confirmed' | 'used';
export type GrantSource = 'new' | 'carried';
export type LeaveKind = 'paid' | 'refresh';
export type IntervalUnit = 'month' | 'year';

export interface Profile {
  id?: number;
  name: string;
  color: string;        // hex 例 '#C4B5FD'
  hireDate: string;     // 'YYYY-MM-DD'（旧 Settings.hireDate を移設）
  order: number;        // 表示順
  createdAt: string;    // ISO 文字列
}

export interface RefreshRule {
  id?: number;
  profileId: number;
  startDate: string;        // 'YYYY-MM-DD' 起点日
  intervalValue: number;    // 周期の数値（例 5）
  intervalUnit: IntervalUnit; // 'month' | 'year'
  grantDays: number;        // 1 回あたり付与日数
  enabled: boolean;
}

export interface Grant {
  id?: number;
  profileId: number;        // NEW
  leaveKind: LeaveKind;     // NEW（既存は 'paid'）
  fiscalYear: number;
  grantDate: string;
  expiryDate: string;
  totalDays: number;
  source: GrantSource;
  auto?: boolean;           // NEW: リフレッシュのルール自動生成分は true
  ruleKey?: string;         // NEW: `${ruleId}#${k}` 冪等キー（自動生成分のみ）
  overridden?: boolean;     // NEW: 自動生成分を手動修正したら true（再生成で保護）
}

export interface Usage {
  id?: number;
  profileId: number;        // NEW
  date: string;
  type: UsageType;
  status: UsageStatus;
  grantId: number;
  memo: string;
}

export interface Settings {
  id?: number;
  profileId: number;        // NEW（プロフィールごとに 1 行）
  fiscalYearStart: string;  // "MM-DD"
  defaultGrantDate: string; // "MM-DD"
  // hireDate は Profile へ移設（ここから削除）
}

export interface GrantRule {
  id?: number;
  profileId: number;        // NEW
  yearsOfService: number;
  grantDays: number;
}
```

**Step 2: tsc で影響箇所を洗い出す**

Run: `npx tsc --noEmit`
Expected: FAIL — `profileId` 欠落・`hireDate` 参照エラーが多数列挙される。この一覧が以降の修正チェックリスト。**この時点ではコミットしない**（後続タスクで段階的に解消）。

---

### Task A2: Dexie v2 スキーマ ＋ マイグレーション backfill の純粋ヘルパー

**Implements:** Spec 受け入れ基準 3（マイグレーション）

**Files:**
- Create: `src/logic/migration.ts`
- Test: `src/logic/__tests__/migration.test.ts`

**Step 1: 失敗テストを書く**

```typescript
import { describe, expect, it } from 'vitest';
import { buildDefaultProfile } from '../migration';

describe('buildDefaultProfile', () => {
  it('既存の hireDate を引き継いだ既定プロフィールを作る', () => {
    const p = buildDefaultProfile('2022-06-01', '2026-05-31T00:00:00.000Z');
    expect(p.name).toBe('わたし');
    expect(p.hireDate).toBe('2022-06-01');
    expect(p.order).toBe(0);
    expect(p.color).toMatch(/^#/);
    expect(p.createdAt).toBe('2026-05-31T00:00:00.000Z');
  });

  it('hireDate が無ければ空文字で作る', () => {
    const p = buildDefaultProfile(undefined, '2026-05-31T00:00:00.000Z');
    expect(p.hireDate).toBe('');
  });
});
```

**Step 2: 失敗確認**

Run: `npx vitest run src/logic/__tests__/migration.test.ts`
Expected: FAIL（`buildDefaultProfile is not a function`）

**Step 3: 実装**

```typescript
// src/logic/migration.ts
import type { Profile } from '../db/types';

const DEFAULT_PROFILE_COLOR = '#C4B5FD';

/** 既定プロフィールを生成（マイグレーション/初期化で使用）。now は ISO 文字列を注入。 */
export function buildDefaultProfile(
  hireDate: string | undefined,
  now: string,
): Omit<Profile, 'id'> {
  return {
    name: 'わたし',
    color: DEFAULT_PROFILE_COLOR,
    hireDate: hireDate ?? '',
    order: 0,
    createdAt: now,
  };
}
```

**Step 4: pass 確認**

Run: `npx vitest run src/logic/__tests__/migration.test.ts`
Expected: PASS

**Step 5: コミット**

```bash
git add src/logic/migration.ts src/logic/__tests__/migration.test.ts
git commit -m "feat: add default profile builder for v2 migration"
```

---

### Task A3: Dexie v2 ストア定義 ＋ upgrade フック

**Implements:** Spec 受け入れ基準 3、決定事項（マイグレーション 1 回）

**Files:**
- Modify: `src/db/index.ts`
- Test: `src/db/__tests__/migration.test.ts`

**Step 1: 失敗テスト（fake-indexeddb で v1→v2）**

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { UkyuDatabase } from '../index';

async function seedV1(name: string) {
  // v1 スキーマを手動定義して既存データを投入
  const v1 = new Dexie(name);
  v1.version(1).stores({
    grants: '++id, fiscalYear, grantDate, expiryDate, source',
    usages: '++id, date, grantId, status',
    settings: '++id',
    grantRules: '++id, yearsOfService',
  });
  await v1.open();
  await v1.table('settings').add({ fiscalYearStart: '04-01', defaultGrantDate: '04-01', hireDate: '2022-06-01' });
  await v1.table('grants').add({ fiscalYear: 2022, grantDate: '2022-12-01', expiryDate: '2024-11-30', totalDays: 10, source: 'new' });
  await v1.table('usages').add({ date: '2023-01-10', type: 'full', status: 'planned', grantId: 1, memo: '' });
  await v1.table('grantRules').add({ yearsOfService: 0.5, grantDays: 10 });
  v1.close();
}

describe('Dexie v1 -> v2 migration', () => {
  beforeEach(async () => {
    await Dexie.delete('migrate-test');
  });

  it('既定プロフィールを作り、既存行へ profileId を backfill する', async () => {
    await seedV1('migrate-test');

    const db = new UkyuDatabase('migrate-test');
    await db.open(); // v2 upgrade が走る

    const profiles = await db.profiles.toArray();
    expect(profiles).toHaveLength(1);
    const pid = profiles[0].id!;
    expect(profiles[0].hireDate).toBe('2022-06-01');

    const grants = await db.grants.toArray();
    expect(grants[0].profileId).toBe(pid);
    expect(grants[0].leaveKind).toBe('paid');

    const usages = await db.usages.toArray();
    expect(usages[0].profileId).toBe(pid);

    const rules = await db.grantRules.toArray();
    expect(rules[0].profileId).toBe(pid);

    const settings = await db.settings.toArray();
    expect(settings[0].profileId).toBe(pid);
    expect((settings[0] as Record<string, unknown>).hireDate).toBeUndefined();

    db.close();
  });
});
```

**Step 2: 失敗確認** — Run: `npx vitest run src/db/__tests__/migration.test.ts` → FAIL（`db.profiles` undefined）

**Step 3: 実装**

```typescript
// src/db/index.ts
import Dexie, { type Table } from 'dexie';
import type { Grant, Usage, Settings, GrantRule, Profile, RefreshRule } from './types';
import { buildDefaultProfile } from '../logic/migration';

export class UkyuDatabase extends Dexie {
  grants!: Table<Grant, number>;
  usages!: Table<Usage, number>;
  settings!: Table<Settings, number>;
  grantRules!: Table<GrantRule, number>;
  profiles!: Table<Profile, number>;
  refreshRules!: Table<RefreshRule, number>;

  constructor(name = 'ukyu') {
    super(name);

    // v1（既存）— 互換のため残す
    this.version(1).stores({
      grants: '++id, fiscalYear, grantDate, expiryDate, source',
      usages: '++id, date, grantId, status',
      settings: '++id',
      grantRules: '++id, yearsOfService',
    });

    // v2 — profileId 軸 + profiles/refreshRules
    this.version(2)
      .stores({
        grants: '++id, profileId, fiscalYear, grantDate, expiryDate, source, leaveKind, ruleKey',
        usages: '++id, profileId, date, grantId, status',
        settings: '++id, profileId',
        grantRules: '++id, profileId, yearsOfService',
        profiles: '++id, order',
        refreshRules: '++id, profileId',
      })
      .upgrade(async (tx) => {
        const oldSettings = await tx.table('settings').toCollection().first();
        const hireDate: string | undefined = oldSettings?.hireDate;
        const profileId = await tx
          .table('profiles')
          .add(buildDefaultProfile(hireDate, new Date().toISOString()));

        await tx.table('grants').toCollection().modify((g: Grant) => {
          g.profileId = profileId;
          if (!g.leaveKind) g.leaveKind = 'paid';
        });
        await tx.table('usages').toCollection().modify((u: Usage) => {
          u.profileId = profileId;
        });
        await tx.table('grantRules').toCollection().modify((r: GrantRule) => {
          r.profileId = profileId;
        });
        await tx.table('settings').toCollection().modify((s: Settings & { hireDate?: string }) => {
          s.profileId = profileId;
          delete s.hireDate;
        });
      });
  }
}

export const db = new UkyuDatabase();
```

**Step 4: pass 確認** — Run: `npx vitest run src/db/__tests__/migration.test.ts` → PASS

**Step 5: コミット**

```bash
git add src/db/index.ts src/db/__tests__/migration.test.ts
git commit -m "feat: add Dexie v2 schema and profileId backfill migration"
```

---

# Phase B — Context・プロフィール CRUD・hook スコープ化

### Task B1: アクティブプロフィール Context（localStorage 永続）

**Implements:** Spec 受け入れ基準 1（切替）、決定事項（複数人=プロフィール切替）

**Files:**
- Create: `src/contexts/ActiveProfileContext.tsx`
- Create: `src/hooks/useProfiles.ts`
- Test: `src/hooks/__tests__/useProfiles.test.tsx`

**設計:**
- `useProfiles()`: `db.profiles.orderBy('order').toArray()` を購読。`addProfile/updateProfile/deleteProfile/ensureDefaultProfile` を提供。**最後の 1 件は削除不可**（受け入れ基準 2）。`deleteProfile` はそのプロフィールの grants/usages/settings/grantRules/refreshRules も連鎖削除。
- `ActiveProfileProvider`: `activeProfileId` を state + `localStorage('ukyu.activeProfileId')` で保持。プロフィール一覧が読めたら、保存 ID が存在しなければ先頭にフォールバック。`useActiveProfileId()` / `useSetActiveProfile()` を公開。
- アプリ初回（プロフィール 0 件＝v2 新規インストール）の場合、`ensureDefaultProfile()` で `buildDefaultProfile(undefined, new Date().toISOString())` を 1 件作る。

**ensureDefaultProfile の純粋部分はテスト対象**（Task A2 で済）。hook 統合テストは fake-indexeddb で「addProfile→一覧に出る」「最後の 1 件は deleteProfile が拒否」を最小検証。

**コミット:** `feat: add active profile context and profiles hook`

---

### Task B2: 既存データ hook を profile スコープ化

**Implements:** Spec 受け入れ基準 1、非機能（既存挙動の非破壊）

**Files:**
- Modify: `src/hooks/useGrants.ts`, `src/hooks/useUsages.ts`, `src/hooks/useGrantRules.ts`, `src/hooks/useSettings.ts`, `src/hooks/useLeaveBalance.ts`

**方針:** 各 hook は `useActiveProfileId()` を読み、クエリを `where('profileId').equals(activeId)` に変更。`add*` 系は `profileId: activeId` を自動付与。`activeId` 未確定（undefined）の間は空配列/未ロードを返す。

**例: useGrants.ts**

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Grant } from '../db/types';
import { useActiveProfileId } from '../contexts/ActiveProfileContext';

export function useGrants() {
  const profileId = useActiveProfileId();
  const grants = useLiveQuery(
    () => (profileId === undefined ? [] : db.grants.where('profileId').equals(profileId).toArray()),
    [profileId],
  );

  async function addGrant(grant: Omit<Grant, 'id' | 'profileId'>): Promise<number> {
    if (profileId === undefined) throw new Error('no active profile');
    return db.grants.add({ ...grant, profileId });
  }
  async function updateGrant(id: number, changes: Partial<Grant>): Promise<void> {
    await db.grants.update(id, changes);
  }
  async function deleteGrant(id: number): Promise<void> {
    await db.usages.where('grantId').equals(id).delete();
    await db.grants.delete(id);
  }
  return { grants, addGrant, updateGrant, deleteGrant };
}
```

- `useUsages` / `useGrantRules` も同様に `profileId` 絞込＋付与。`useGrants(fiscalYear)` / `useUsages(grantId)` の引数オーバーロードは**現状未使用なら削除**（YAGNI、surgical に確認の上）。
- `useSettings`: `db.settings.where('profileId').equals(profileId).first()`。`updateSettings` は profile 単位 upsert。`DEFAULT_SETTINGS` から `hireDate` を削除（Profile 管理へ）。
- `useLeaveBalance`: 先頭で `const profileId = useActiveProfileId()` を読み、`db.grants` / `db.usages` / `db.settings` 取得を profile 絞込に変更。**さらに `grants` を `leaveKind === 'paid'` で絞る**（リフレッシュは別集計＝Phase E）。`hireDate` は `settings?.hireDate` ではなく**アクティブプロフィールの hireDate** から取得するよう変更（`db.profiles.get(profileId)`）。

**検証:** `npx tsc --noEmit` で Task A1 が出した hook 関連エラーが解消へ向かう。`npx vitest run` の既存テストはこの段階で一部 fixture 不足により赤いままで良い（Task B3 で解消）。

**コミット:** `feat: scope data hooks by active profile`

---

### Task B3: 呼び出し側・テスト fixture の profileId 追従

**Implements:** Spec 受け入れ基準 8（既存テキスト契約不変・fixture 修正は機械的最小限）

**Files:**
- Modify: `src/App.tsx`（後述 Phase F で自動付与も）、`src/pages/CalendarPage.tsx`、`src/pages/SettingsPage.tsx`、`src/components/__tests__/Calendar.test.tsx` ほか `npx tsc --noEmit` が指摘する全箇所

**手順:**
1. Run: `npx tsc --noEmit` で残エラー一覧を取得。
2. 各エラーを機械的に解消：
   - コンポーネントに渡す `Usage`/`Grant` 型 fixture に `profileId: 1, leaveKind: 'paid'`（Grant）/`profileId: 1`（Usage）を追加。
   - `SettingsPage` の `settings.hireDate` 参照は**プロフィールの hireDate** へ付け替え（`useActiveProfile()` で hireDate を取得・更新）。
   - `App.tsx` の `settings.hireDate` 参照も同様（詳細は Task F2）。
   - export/import の型は Task F1 で扱う。`db.test.ts` の既存 CRUD テストは `profileId`/`leaveKind` を fixture に追加。
3. **「全予」「午前済」等のテキストは絶対に変更しない**（`TYPE_LABEL`/`STATUS_LABEL` を触らない）。

**検証:**
- Run: `npx tsc --noEmit` → exit 0
- Run: `npx vitest run` → 既存テスト全 green（追加した migration/profile テスト含む）

**コミット:** `refactor: thread profileId through call sites and fixtures`

---

# Phase C — プロフィール切替 UI ＋ 管理

### Task C1: プロフィール切替バー（メイン画面上部）

**Implements:** Spec 受け入れ基準 1、7（多重符号化）

**Files:**
- Create: `src/components/ProfileSwitcher.tsx`
- Modify: `src/App.tsx`（`<main>` 直下、`CalendarPage` の上に配置）

**仕様:**
- `useProfiles()` ＋ `useActiveProfileId()`/`useSetActiveProfile()` を使用。
- 横スクロールのチップ列。各チップ＝アバター色丸 ＋ 名前。選択中のみ枠線濃色＋`shadow-sm`（色だけに頼らずテキスト＋枠線で識別）。
- min-h 54px、`role="tablist"` / 各チップ `role="tab"` + `aria-pressed`（既存 ViewToggle と統一）。
- 末尾に「＋ ついか」チップ → 設定のプロフィール管理へ誘導（または簡易追加モーダル）。
- プロフィールが 1 件のみのときも表示（将来の追加導線として）。表示が冗長なら「1 件のみなら名前ラベルのみ」に縮約しても良い（任意）。

**テスト（`src/components/__tests__/ProfileSwitcher.test.tsx`）:** 2 件のプロフィールを描画→2 番目クリックで `setActiveProfile` が 2 番目の id で呼ばれる。

**コミット:** `feat: add profile switcher bar`

---

### Task C2: 設定画面にプロフィール管理セクション

**Implements:** Spec 受け入れ基準 2

**Files:**
- Create: `src/components/ProfileSettings.tsx`
- Modify: `src/pages/SettingsPage.tsx`（先頭付近に新 `Collapsible title="👥 プロフィール"`）

**仕様:**
- 一覧（並べ替え `order`、改名、色選択、入社日 `hireDate` 編集）。
- 追加（名前入力→`addProfile`）。
- 削除（確認付き、連鎖削除）。**最後の 1 件は削除ボタンを無効化**（受け入れ基準 2）。
- 入社日はここで編集（旧「きほん設定」の `hireDate` 入力はプロフィール側へ移管。`SettingsPage` の「きほん設定」からは `hireDate` 入力を削除し、`fiscalYearStart` のみ残す）。

**テスト:** 「最後の 1 件は削除不可」を最小検証（削除ボタン disabled）。

**コミット:** `feat: add profile management in settings`

---

# Phase D — リフレッシュ休暇ロジック

### Task D1: 周期加算ヘルパー ＋ generateRefreshGrants

**Implements:** Spec 受け入れ基準 4・5、決定事項（ハイブリッド/起点日+周期/次回更新リセット）

**Files:**
- Create: `src/logic/refresh-leave.ts`
- Test: `src/logic/__tests__/refresh-leave.test.ts`

**Step 1: 失敗テスト**

```typescript
import { describe, expect, it } from 'vitest';
import { addInterval, generateRefreshGrants } from '../refresh-leave';
import type { RefreshRule, Grant } from '../../db/types';

const baseRule: RefreshRule = {
  id: 1, profileId: 1, startDate: '2020-04-01',
  intervalValue: 5, intervalUnit: 'year', grantDays: 5, enabled: true,
};

describe('addInterval', () => {
  it('年単位で加算する', () => {
    expect(addInterval(new Date('2020-04-01T00:00:00'), 5, 'year').getFullYear()).toBe(2025);
  });
  it('月単位で加算する', () => {
    const d = addInterval(new Date('2020-01-01T00:00:00'), 18, 'month');
    expect(d.getFullYear()).toBe(2021);
    expect(d.getMonth()).toBe(6); // 7月(0-indexed)
  });
});

describe('generateRefreshGrants', () => {
  it('起点日から周期ごとに asOf までの付与を生成し、消滅日=次回付与日の前日', () => {
    const grants = generateRefreshGrants(baseRule, '2026-05-31', []);
    // 2020-04-01, 2025-04-01 の 2 件（2030 は未来）
    expect(grants.map((g) => g.grantDate)).toEqual(['2020-04-01', '2025-04-01']);
    expect(grants[0].leaveKind).toBe('refresh');
    expect(grants[0].totalDays).toBe(5);
    expect(grants[0].expiryDate).toBe('2025-03-31'); // 次回(2025-04-01)の前日
    expect(grants[0].ruleKey).toBe('1#0');
    expect(grants[0].auto).toBe(true);
  });

  it('enabled=false なら空', () => {
    expect(generateRefreshGrants({ ...baseRule, enabled: false }, '2026-05-31', [])).toEqual([]);
  });

  it('overridden な ruleKey は再生成からスキップする', () => {
    const existing: Grant[] = [{
      id: 9, profileId: 1, leaveKind: 'refresh', fiscalYear: 2020,
      grantDate: '2020-04-01', expiryDate: '2025-03-31', totalDays: 7,
      source: 'new', auto: true, ruleKey: '1#0', overridden: true,
    }];
    const grants = generateRefreshGrants(baseRule, '2026-05-31', existing);
    expect(grants.map((g) => g.ruleKey)).toEqual(['1#1']); // 1#0 は保護されスキップ
  });
});
```

**Step 2: 失敗確認** — Run: `npx vitest run src/logic/__tests__/refresh-leave.test.ts` → FAIL

**Step 3: 実装**

```typescript
// src/logic/refresh-leave.ts
import type { Grant, RefreshRule, IntervalUnit } from '../db/types';

export function addInterval(date: Date, value: number, unit: IntervalUnit): Date {
  const d = new Date(date);
  if (unit === 'year') d.setFullYear(d.getFullYear() + value);
  else d.setMonth(d.getMonth() + value);
  return d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * リフレッシュ休暇ルールから付与 Grant を生成（ハイブリッド）。
 * - grantDate(k) = startDate + intervalValue*k（asOf 以前のみ）
 * - expiryDate(k) = grantDate(k+1) の前日（= 次回更新でリセット）
 * - ruleKey = `${rule.id}#${k}`（冪等キー）
 * - existing 内で overridden=true の ruleKey はスキップ（手動修正を保護）
 * - now/asOf は呼び出し側が 'YYYY-MM-DD' で注入（DI、テスト容易性）
 */
export function generateRefreshGrants(
  rule: RefreshRule,
  asOf: string,
  existing: Grant[],
): Omit<Grant, 'id'>[] {
  if (!rule.enabled || !rule.startDate || rule.grantDays <= 0 || rule.id === undefined) {
    return [];
  }
  const asOfDate = new Date(asOf + 'T00:00:00');
  const start = new Date(rule.startDate + 'T00:00:00');
  const overriddenKeys = new Set(
    existing.filter((g) => g.overridden && g.ruleKey).map((g) => g.ruleKey),
  );

  const out: Omit<Grant, 'id'>[] = [];
  for (let k = 0; k < 500; k++) {
    const grantDate = addInterval(start, rule.intervalValue * k, rule.intervalUnit);
    if (grantDate > asOfDate) break;

    const next = addInterval(start, rule.intervalValue * (k + 1), rule.intervalUnit);
    const expiry = new Date(next);
    expiry.setDate(expiry.getDate() - 1); // 次回付与日の前日

    const ruleKey = `${rule.id}#${k}`;
    if (overriddenKeys.has(ruleKey)) continue;

    out.push({
      profileId: rule.profileId,
      leaveKind: 'refresh',
      fiscalYear: grantDate.getFullYear(),
      grantDate: toISO(grantDate),
      expiryDate: toISO(expiry),
      totalDays: rule.grantDays,
      source: 'new',
      auto: true,
      ruleKey,
    });
  }
  return out;
}
```

**Step 4: pass 確認** — Run: `npx vitest run src/logic/__tests__/refresh-leave.test.ts` → PASS

**Step 5: コミット**

```bash
git add src/logic/refresh-leave.ts src/logic/__tests__/refresh-leave.test.ts
git commit -m "feat: add refresh leave grant generation logic"
```

---

### Task D2: リフレッシュルール hook ＋ 冪等同期

**Implements:** Spec 受け入れ基準 4・5

**Files:**
- Create: `src/hooks/useRefreshRule.ts`

**仕様:**
- `useRefreshRule()`: アクティブプロフィールの `refreshRules` から 1 件（または無し）を購読。`upsertRule(partial)` で起点日・周期・日数・enabled を保存。
- `syncRefreshGrants()`: 以下を実行する非同期関数。
  1. ルール取得（無効/未設定なら何もしない）。
  2. `existing = db.grants.where({profileId}).filter(leaveKind==='refresh').toArray()`。
  3. `desired = generateRefreshGrants(rule, todayISO(), existing)`。
  4. `desired` を ruleKey で upsert：同 ruleKey の既存があり `overridden!==true` なら `update`（日数/日付差分）、無ければ `add`。`overridden` 分は触らない。
  5. ルールから外れた（もう生成されない ruleKey の）auto 且つ非 overridden の孤児 grant は削除（任意・YAGNI 判断で初期は据え置き可）。
- `todayISO()` は `new Date().toISOString().slice(0,10)`。ロジックは純粋関数側（D1）に寄せているので hook は薄く。

**コミット:** `feat: add refresh rule hook with idempotent grant sync`

---

# Phase E — リフレッシュ残高・UI

### Task E1: 別バケツ残高集計（純粋関数）

**Implements:** Spec 受け入れ基準 6（別バケツ集計）

**Files:**
- Create: `src/logic/refresh-balance.ts`
- Test: `src/logic/__tests__/refresh-balance.test.ts`

**仕様（純粋関数 `computeRefreshSummary(grants, usages, now)`）:**
- 入力 grants は `leaveKind==='refresh'` のみ前提（呼び側で絞る）。
- 各 grant: `remaining = totalDays - used`（used = 紐づく usage の `getUsageDays`、status!=='planned'）。`isExpired = expiryDate < now`。
- 返却: `{ totalRemaining, totalUsed, totalPlanned, expiringSoonDays, perGrant[] }`。有給の cycle 概念は使わない（リフレッシュは独自周期）。
- `getUsageDays` は既存 `src/logic/leave-calculator.ts` を再利用。

**テスト:** 付与 5 日・used 2 日 → remaining 3。期限切れ grant の remaining は 0、expiredDays に計上。

**コミット:** `feat: add refresh leave balance computation`

---

### Task E2: リフレッシュ残高 hook ＋ サマリーカード

**Implements:** Spec 受け入れ基準 6・7

**Files:**
- Create: `src/hooks/useRefreshBalance.ts`
- Create: `src/components/RefreshSummary.tsx`
- Modify: `src/pages/CalendarPage.tsx`（CalendarSummary の直後に、リフレッシュルールが有効なときのみ `RefreshSummary` を表示）

**仕様:**
- `useRefreshBalance()`: profile 絞込＋`leaveKind==='refresh'` の grants/usages を読み、`computeRefreshSummary` を適用。
- `RefreshSummary`: 既存 `CalendarSummary` の `StatCard` と同じ見た目で「リフレッシュ のこり/つかった/消滅」を**別カード**として表示。タイトル行に「🌿 リフレッシュ休暇」見出し＋種別ラベル。色だけに頼らず見出しテキスト＋枠線で区別（受け入れ基準 7）。
- リフレッシュルール未設定時は非表示（既存単一ユーザー体験を変えない＝非機能要件）。

**コミット:** `feat: show refresh leave summary card`

---

### Task E3: カレンダー/リストでのリフレッシュ種別表示

**Implements:** Spec 受け入れ基準 7

**Files:**
- Modify: `src/components/Calendar.tsx`、`src/pages/CalendarPage.tsx`（PlannedList/UsageHistory）

**仕様:**
- Usage の種別（paid/refresh）は `grantId` 経由で判定する必要がある。`Calendar`/リストに「refresh な grantId の集合」を渡し、該当 usage に種別バッジ（例「リ」）＋枠線を付与（色だけに頼らない）。
- 既存の「全予」「午前済」ラベルは不変。種別は**追加**のマーカーとして付与。
- 実装簡素化のため、`useRefreshBalance`/`useGrants` から `refreshGrantIds: Set<number>` を導出し props で渡す。

**テスト:** refresh grant に紐づく usage のセルに「リ」マーカーが付く最小検証（Calendar.test.tsx に 1 ケース追加。既存ケースは不変）。

**コミット:** `feat: distinguish refresh leave in calendar and list`

---

### Task E4: 設定画面にリフレッシュ休暇ルール ＋ 手動付与

**Implements:** Spec 受け入れ基準 4・5

**Files:**
- Create: `src/components/RefreshLeaveSettings.tsx`
- Modify: `src/pages/SettingsPage.tsx`（新 `Collapsible title="🌿 リフレッシュ休暇"`）

**仕様:**
- ルールフォーム：起点日（date）・周期数値＋単位（月/年セレクト）・付与日数・有効化トグル。保存で `upsertRule` → `syncRefreshGrants()`。
- 手動付与：既存 `GrantForm` を流用しつつ `leaveKind:'refresh', auto:false` で追加（`addGrant`）。自動生成分の一覧表示と、手動修正時に `overridden:true` を立てる導線。
- 入力 `text-base`（iOS ズーム防止、既存方針）。LD 配色方針（純白/純黒禁止・枠線併用）。

**コミット:** `feat: add refresh leave settings UI`

---

# Phase F — export/import・自動付与・統合検証

### Task F1: export/import を v2 対応（後方互換）

**Implements:** Spec 受け入れ基準 3・8、非機能（既存挙動の非破壊）

**Files:**
- Modify: `src/logic/export-import.ts`、`src/pages/SettingsPage.tsx`（handleExport/handleImport）
- Test: `src/logic/__tests__/export-import.test.ts`（既存 22 件を壊さず追加）

**仕様:**
- `ExportData` に `profiles?: Profile[]` / `refreshRules?: RefreshRule[]` を追加（optional）。
- `parseImportData`: 既存必須フィールド検証は維持（`profileId` は必須にしない＝v1 バックアップ互換）。`profiles`/`refreshRules` が配列でなければエラー（present 時のみ）。
- import 実行（SettingsPage）：
  - v2 データ（profiles あり）→ そのまま全テーブル置換。
  - v1 データ（profiles なし）→ 既定プロフィールを 1 件作り、全 grants/usages/settings/grantRules に `profileId` 付与（`leaveKind` 無ければ 'paid'）してから投入。
- **既存 22 テストは入力形が変わらないため green を維持**。v1 互換・v2 往復の新ケースを追加。

**検証:** `npx vitest run src/logic/__tests__/export-import.test.ts` → 既存 + 新規 PASS

**コミット:** `feat: support multi-profile in export/import with v1 compatibility`

---

### Task F2: 自動付与（有給）の profile 対応

**Implements:** Spec 非機能（既存挙動の非破壊）、決定事項（profile 軸）

**Files:**
- Modify: `src/App.tsx`、`src/pages/SettingsPage.tsx`

**仕様:**
- `App.tsx` の auto-grant effect は**アクティブプロフィールの hireDate**（`useActiveProfile()`）と profile 絞込 grants/rules を使う。生成 grant は `addGrant`（profileId 自動付与・`leaveKind:'paid'`）。`autoGrantRan` はプロフィール切替で再評価できるよう `useRef(false)` を profileId 依存に変更（profileId が変わったらフラグをリセット）。
- 加えて App マウント時に `syncRefreshGrants()`（D2）をアクティブプロフィールに対して 1 回実行。
- `SettingsPage.handleAutoGrant` も `settings.hireDate` → アクティブプロフィール hireDate に変更。

**検証:** `npx tsc --noEmit` exit 0 / `npx vitest run` 全 green。

**コミット:** `feat: make paid-leave auto-grant profile-aware`

---

### Task F3: 統合検証 ＋ 仕上げ

**Implements:** Spec 受け入れ基準 全般

**手順（@verification-before-completion の規律で、主張の前に実行）:**
1. Run: `npx tsc --noEmit` → exit 0
2. Run: `npx vitest run` → 全 green（既存 111 + 追加分）
3. Run: `npx vite build` → exit 0
4. 手動スモーク（`npx vite` で起動、任意）：プロフィール追加→切替でデータが分離→リフレッシュルール設定で別カード出現→カレンダーに種別マーカー。
5. spec の受け入れ基準 1〜8 を 1 つずつ突き合わせ、未達があれば該当タスクへ戻る。

**コミット:** `test: verify multi-profile and refresh leave end-to-end`

---

## リスク・留意点

- **profileId 必須化の波及**: Task A1 直後は tsc が大量に赤くなる。これは想定内で、B/C で順に潰す（tsc 出力＝チェックリスト）。
- **既存テキスト契約**: `TYPE_LABEL`/`STATUS_LABEL`（「全予」「午前済」）と既存テスト文言は不変厳守。
- **マイグレーションの一回性**: v2 upgrade は冪等でない（1 回だけ走る）。テストは毎回 `Dexie.delete` で初期化。
- **リフレッシュの孤児 grant**: ルール変更で過去 ruleKey が変わると孤児が残り得る。初期は据え置き、必要なら D2 step5 の掃除を有効化（YAGNI）。
- **DI 徹底**: 日付依存ロジック（`generateRefreshGrants`/balance/migration helper）は `now`/`asOf` 注入済み。hook 側のみ `new Date()` を読む。
