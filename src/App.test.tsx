import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import App from './App';

const mocks = vi.hoisted(() => ({
  syncRefreshGrants: vi.fn(),
  addGrant: vi.fn(),
  generateAutoGrants: vi.fn(() => []),
  checkExpiringGrants: vi.fn(() => []),
  showExpiryNotification: vi.fn(),
}));

vi.mock('./components/BottomNav', () => ({
  BottomNav: () => null,
}));

vi.mock('./components/ProfileSwitcher', () => ({
  ProfileSwitcher: () => null,
}));

vi.mock('./pages/CalendarPage', () => ({
  CalendarPage: () => null,
}));

vi.mock('./pages/SettingsPage', () => ({
  SettingsPage: () => null,
}));

vi.mock('./hooks/useGrants', () => ({
  useGrants: () => ({
    grants: [],
    addGrant: mocks.addGrant,
  }),
}));

vi.mock('./hooks/useGrantRules', () => ({
  useGrantRules: () => ({
    rules: [],
  }),
}));

vi.mock('./hooks/useRefreshRule', () => ({
  useRefreshRule: () => ({
    syncRefreshGrants: mocks.syncRefreshGrants,
  }),
}));

vi.mock('./contexts/ActiveProfileContext', () => ({
  useActiveProfile: () => ({
    id: 1,
    name: 'わたし',
    color: '#C4B5FD',
    hireDate: '2022-06-01',
    order: 0,
    createdAt: '2026-05-31T00:00:00.000Z',
  }),
  useActiveProfileId: () => 1,
}));

vi.mock('./logic/auto-grant', () => ({
  generateAutoGrants: mocks.generateAutoGrants,
}));

vi.mock('./logic/notifications', () => ({
  checkExpiringGrants: mocks.checkExpiringGrants,
  showExpiryNotification: mocks.showExpiryNotification,
}));

describe('App', () => {
  beforeEach(() => {
    mocks.syncRefreshGrants.mockResolvedValue(undefined);
    mocks.addGrant.mockResolvedValue(1);
    mocks.generateAutoGrants.mockClear();
    mocks.checkExpiringGrants.mockClear();
    mocks.showExpiryNotification.mockClear();
    mocks.syncRefreshGrants.mockClear();
    mocks.addGrant.mockClear();
  });

  it('mount時にアクティブプロフィールのリフレッシュ付与を同期する', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mocks.syncRefreshGrants).toHaveBeenCalledTimes(1);
    });
  });
});
