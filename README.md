# ukyu - 有給休暇管理 PWA

有給休暇をかんたんに管理するモバイルファーストの PWA（Progressive Web App）です。
**LD（学習障害）・ディスレクシア対応**のアクセシブルな UI を採用し、直感的な操作で有給の取得状況を把握できます。

## Features

| 機能 | 説明 |
|------|------|
| **カレンダービュー** | 日本の祝日表示、スワイプ月送り、使用/予定のマーカー表示 |
| **有給登録** | 全日休・午前半休・午後半休を日付タップで即登録 |
| **自動付与計算** | 入社日から労基法に基づく付与日数を自動算出 |
| **サイクル管理** | 入社日ベースの付与サイクルで使用/予定/消滅を集計 |
| **残日数サマリー** | のこり・つかった・しょうめつ・よていを一目で確認 |
| **シミュレーション** | 残日数の全日/半休の組み合わせパターンを表示 |
| **データ管理** | JSON エクスポート/インポートでバックアップ・機種変更に対応 |
| **PWA 対応** | オフライン動作、ホーム画面追加、ネイティブアプリ風 UI |

## Tech Stack

| カテゴリ | 技術 |
|----------|------|
| Framework | [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) 5.9 |
| Build | [Vite](https://vite.dev/) 7 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4 |
| Database | [Dexie.js](https://dexie.org/)（IndexedDB ラッパー） |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)（Workbox） |
| Test | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |

## Architecture

```
src/
├── components/          # UI コンポーネント
│   ├── Calendar.tsx       # カレンダービュー（祝日・スワイプ対応）
│   ├── CalendarSummary.tsx # サマリーカード（2x2 グリッド）
│   ├── Collapsible.tsx    # 折りたたみセクション（色分け対応）
│   ├── Modal.tsx          # ボトムシート（下スワイプ閉じ）
│   ├── UsageForm.tsx      # 有給登録フォーム
│   └── __tests__/         # コンポーネントテスト
├── db/
│   ├── index.ts           # Dexie DB 定義
│   └── types.ts           # データ型定義（Grant, Usage, Settings）
├── hooks/
│   ├── useLeaveBalance.ts # 残日数・サイクル計算（リアクティブ）
│   ├── useSwipe.ts        # タッチスワイプ検出
│   └── use*.ts            # CRUD フック（Dexie + useLiveQuery）
├── logic/
│   ├── japanese-holidays.ts # 日本の祝日計算（春分/秋分近似式）
│   ├── grant-cycle.ts      # 付与サイクル算出
│   ├── auto-grant.ts       # 労基法ベースの自動付与
│   └── __tests__/          # ロジックテスト
└── pages/
    ├── CalendarPage.tsx    # メイン画面（統合ビュー）
    └── SettingsPage.tsx    # 設定画面（5 セクション折りたたみ）
```

### Design Decisions

- **完全オフライン**: IndexedDB にすべてのデータを保存。サーバー不要、個人情報の外部送信なし
- **リアクティブ DB**: Dexie の `useLiveQuery` でデータ変更を即座に UI に反映
- **サイクルベース集計**: 入社日から付与月を動的に計算し、期間内の使用/予定/消滅を正確に集計
- **祝日ロジック内製**: 外部 API に依存せず、春分/秋分の近似式 + ハッピーマンデー + 振替休日を計算

## Accessibility

LD・ディスレクシア対応として以下を実装:

- **フォント**: UD デジタル教科書体 / Noto Sans JP（16px 以上）
- **行間**: 1.8 以上で読みやすさを確保
- **色設計**: 真っ白・真っ黒を避けたソフトカラー（コントラスト比は WCAG AA 準拠）
- **テーマカラー**: ラベンダー（予定）、ピーチ（履歴）、ミント（シミュレーション）で情報を色分け
- **タッチ対応**: 44px 以上のタップ領域、スワイプジェスチャー、active フィードバック
- **ARIA**: `aria-expanded`, `aria-pressed`, `aria-current`, `role="dialog"` 等を適切に設定

## Getting Started

```bash
# インストール
pnpm install

# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# テスト実行
pnpm vitest --run
```

## Test Coverage

111 テストケースで主要ロジックをカバー:

| テスト対象 | 件数 |
|-----------|------|
| 日本の祝日計算 | 7 |
| 付与サイクル | 9 |
| 自動付与ロジック | 9 |
| 付与ルール | 13 |
| 年度計算 | 7 |
| 残日数計算 | 11 |
| エクスポート/インポート | 22 |
| 通知 | 20 |
| カレンダー UI | 7 |
| BottomNav UI | 4 |
| DB 操作 | 2 |

## ライセンス / License

[MIT](LICENSE)
