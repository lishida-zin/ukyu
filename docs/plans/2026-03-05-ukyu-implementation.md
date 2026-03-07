# ukyu Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal paid-leave management PWA with Vite + React + TypeScript

**Architecture:** Mobile-first SPA. Data stored in IndexedDB (Dexie.js) locally. 3-tab bottom nav (Home/Calendar/Settings). PWA for iPhone home screen launch.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS v4, Dexie.js, vite-plugin-pwa, Vitest, React Testing Library

**Design doc:** docs/plans/2026-03-05-ukyu-design.md

---

## Task 1: Project Init

**Files:**
- Create: package.json, vite.config.ts, tsconfig.json, index.html
- Create: src/main.tsx, src/App.tsx, src/index.css
- Create: .gitignore, .env.example

**Step 1:** Create Vite project: `pnpm create vite . --template react-ts`

**Step 2:** Install deps:
- `pnpm add dexie dexie-react-hooks`
- `pnpm add -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom vite-plugin-pwa`

**Step 3:** Configure Tailwind CSS v4 in vite.config.ts and src/index.css with custom theme (lavender/mint/peach colors, UD Digi Kyokasho font, line-height 1.8)

**Step 4:** Configure Vitest (globals, jsdom, setup file)

**Step 5:** Create .gitignore (node_modules/, dist/, .env*, !.env.example, *.pem, *.key)

**Step 6:** `git init && git add -A && git commit -m "chore: init project"`

---

## Task 2: Database Layer (Dexie.js)

**Files:**
- Create: src/db/types.ts
- Create: src/db/index.ts
- Test: src/db/__tests__/db.test.ts

**Data Models:**

- **Grant:** id, fiscalYear, grantDate, expiryDate, totalDays, source("new"/"carried")
- **Usage:** id, date, type("full"/"am"/"pm"), status("planned"/"confirmed"/"used"), grantId, memo
- **Settings:** id, fiscalYearStart("MM-DD"), defaultGrantDate("MM-DD"), hireDate(string)
- **GrantRule:** id, yearsOfService(number), grantDays(number)

Default GrantRules (Labor Standards Act):

| Years | Days |
|-------|------|
| 0.5   | 10   |
| 1.5   | 11   |
| 2.5   | 12   |
| 3.5   | 14   |
| 4.5   | 16   |
| 5.5   | 18   |
| 6.5+  | 20   |

**Tests:** Grant CRUD, Usage CRUD, fiscal year filter, GrantRule filter

**Commit:** `feat: add Dexie.js database layer`

---

## Task 3: Business Logic

**Files:**
- Create: src/logic/fiscal-year.ts
- Create: src/logic/leave-calculator.ts
- Create: src/logic/grant-rules.ts
- Test: src/logic/__tests__/fiscal-year.test.ts
- Test: src/logic/__tests__/leave-calculator.test.ts
- Test: src/logic/__tests__/grant-rules.test.ts

**fiscal-year.ts:**
- getFiscalYear(date, fiscalYearStart) -> year
- getFiscalYearRange(fiscalYear, fiscalYearStart) -> {start, end}

**leave-calculator.ts:**
- getUsageDays(type) -> full=1.0, am/pm=0.5
- calculateRemainingDays(grant, usages) -> remaining
- simulateUsage(remainingDays) -> UsagePattern[]

**grant-rules.ts:**
- calculateYearsOfService(hireDate, targetDate) -> years
- getGrantDaysByRule(rules, yearsOfService) -> days
- getDefaultGrantRules() -> default rules array

**Commit:** `feat: add leave calculation and grant rules logic`

---

## Task 4: Shared UI Components

**Files:**
- Create: src/components/BottomNav.tsx (3 tabs: home/calendar/settings with icons)
- Create: src/components/Card.tsx (white, rounded-2xl, shadow)
- Create: src/components/Modal.tsx (slide-up, overlay, safe-area-inset)
- Create: src/components/ProgressBar.tsx (color configurable, label)
- Test: src/components/__tests__/BottomNav.test.tsx
- Modify: src/App.tsx (tab switching layout)

**Commit:** `feat: add shared UI components`

---

## Task 5: Data Access Hooks

**Files:**
- Create: src/hooks/useGrants.ts (CRUD + useLiveQuery)
- Create: src/hooks/useUsages.ts (CRUD + useLiveQuery)
- Create: src/hooks/useSettings.ts (read/write with defaults, includes hireDate)
- Create: src/hooks/useLeaveBalance.ts (per-grant balance, totals, expiry warning)
- Create: src/hooks/useGrantRules.ts (CRUD + getRecommendedDays)

**Commit:** `feat: add data access hooks`

---

## Task 6: Home Page (Dashboard)

**Files:**
- Create: src/pages/HomePage.tsx
- Create: src/components/BalanceCard.tsx
- Create: src/components/SimulationCard.tsx

**Layout:**
1. Total remaining days (text-5xl, large number)
2. BalanceCard per grant (lavender=new, mint=carried, peach border if expiring soon)
3. SimulationCard (full x N, half x M combinations)
4. Empty state when no grants registered

**Commit:** `feat: add home page with dashboard and simulation`

---

## Task 7: Calendar Page

**Files:**
- Create: src/pages/CalendarPage.tsx
- Create: src/components/Calendar.tsx (monthly view, prev/next, weekday headers)
- Create: src/components/UsageForm.tsx (type/status/memo selection)

**Calendar marks:** purple dot = full day, yellow dot = half day
**UsageForm:** Button-based selection, grant source selector, memo input

**Commit:** `feat: add calendar page with usage registration`

---

## Task 8: Settings Page

**Files:**
- Create: src/pages/SettingsPage.tsx
- Create: src/components/GrantForm.tsx
- Create: src/components/GrantRuleSettings.tsx
- Create: src/logic/export-import.ts
- Test: src/logic/__tests__/export-import.test.ts

**Sections:**
1. Grant management (list + add)
2. Grant rules (hire date, years-of-service table, load-defaults button, recommended days display)
3. Fiscal year settings
4. Data management (JSON export/import)

**Commit:** `feat: add settings page with grant rules and data management`

---

## Task 9: PWA Support

**Files:**
- Modify: vite.config.ts (VitePWA plugin)
- Modify: index.html (meta tags: theme-color, apple-mobile-web-app, viewport-fit=cover)
- Create: public/icon-192.png, public/icon-512.png

**PWA:** name="ukyu", theme_color="#C4B5FD", display="standalone", workbox caching

**Commit:** `feat: add PWA support`

---

## Task 10: Notifications

**Files:**
- Create: src/logic/notifications.ts
- Modify: src/pages/SettingsPage.tsx (notification toggle)
- Modify: src/App.tsx (expiry check on startup)

**Functions:** requestNotificationPermission(), checkExpiringGrants(), showExpiryNotification()

**Commit:** `feat: add notification support`

---

## Task 11: Final Testing and Polish

1. `pnpm vitest run` -> ALL PASS
2. `pnpm build` -> no errors
3. Chrome DevTools iPhone 16 Pro (430x932) responsive check
4. Final commit

---

## Task Dependencies

```
Task 1 (Init)
  -> Task 2 (DB) -> Task 3 (Logic) -> Task 5 (Hooks)
                                        -> Task 6 (Home)
                                        -> Task 7 (Calendar)
                                        -> Task 8 (Settings)
  -> Task 4 (UI Components) -> Task 6, 7, 8
  -> Task 9 (PWA)
  -> Task 10 (Notifications) -> Task 11 (Final)
```
