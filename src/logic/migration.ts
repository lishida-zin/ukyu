import type { Profile } from '../db/types';

const DEFAULT_PROFILE_COLOR = '#C4B5FD';

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
