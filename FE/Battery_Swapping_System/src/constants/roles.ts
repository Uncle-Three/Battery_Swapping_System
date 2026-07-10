export const UserRole = {
  GUEST: 'GUEST',
  MEMBER: 'MEMBER',
  STAFF: 'STAFF',
  TECHNICIAN: 'TECHNICIAN',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
