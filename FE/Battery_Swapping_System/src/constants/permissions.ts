import { UserRole, type UserRole as UserRoleType } from './roles';

export const PermissionWildcard = '*' as const;

export const Permissions = {
  PROFILE_READ_SELF: 'profile:read:self',
  PROFILE_UPDATE_SELF: 'profile:update:self',
  USERS_READ_ANY: 'users:read:any',
  USERS_UPDATE_ROLE: 'users:update-role',
  USERS_UPDATE_STATUS: 'users:update-status',
  AUDIT_LOGS_READ: 'audit-logs:read',
  BOOKINGS_CREATE: 'bookings:create',
  BOOKINGS_READ_SELF: 'bookings:read:self',
  BOOKINGS_CANCEL_SELF: 'bookings:cancel:self',
  BOOKINGS_READ_ANY: 'bookings:read:any',
  SWAPS_INITIATE: 'swaps:initiate',
  SWAPS_PROCESS: 'swaps:process',
  SWAPS_READ_SELF: 'swaps:read:self',
  SWAPS_READ_ANY: 'swaps:read:any',
  PAYMENTS_MANAGE_SELF: 'payments:manage:self',
  VEHICLES_MANAGE_SELF: 'vehicles:manage:self',
  STATIONS_READ: 'stations:read',
  SLOTS_READ: 'slots:read',
  BATTERIES_READ: 'batteries:read',
  BATTERIES_FAULTY_READ: 'batteries:faulty:read',
  MAINTENANCE_CREATE: 'maintenance:create',
  MAINTENANCE_READ: 'maintenance:read',
  BATTERY_HEALTH_READ: 'battery-health:read',
  REPORTS_READ: 'reports:read',
  INVENTORY_READ: 'inventory:read',
  SETTINGS_MANAGE: 'settings:manage',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
type PermissionGrant = Permission | typeof PermissionWildcard;

export const RolePermissions = {
  [UserRole.MEMBER]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
    Permissions.VEHICLES_MANAGE_SELF,
    Permissions.BOOKINGS_CREATE,
    Permissions.BOOKINGS_READ_SELF,
    Permissions.BOOKINGS_CANCEL_SELF,
    Permissions.SWAPS_READ_SELF,
    Permissions.PAYMENTS_MANAGE_SELF,
  ],
  [UserRole.STAFF]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
    Permissions.STATIONS_READ,
    Permissions.SLOTS_READ,
    Permissions.BOOKINGS_READ_ANY,
    Permissions.SWAPS_INITIATE,
    Permissions.SWAPS_PROCESS,
  ],
  [UserRole.TECHNICIAN]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
    Permissions.BATTERIES_READ,
    Permissions.BATTERIES_FAULTY_READ,
    Permissions.MAINTENANCE_CREATE,
    Permissions.MAINTENANCE_READ,
    Permissions.BATTERY_HEALTH_READ,
  ],
  [UserRole.MANAGER]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
    Permissions.REPORTS_READ,
    Permissions.INVENTORY_READ,
    Permissions.STATIONS_READ,
    Permissions.BATTERIES_READ,
    Permissions.SWAPS_READ_ANY,
  ],
  [UserRole.ADMIN]: [PermissionWildcard],
} as const satisfies Record<UserRoleType, readonly PermissionGrant[]>;

export const hasPermission = (role: UserRoleType, permission: Permission): boolean => {
  const permissions: readonly PermissionGrant[] = RolePermissions[role];
  return permissions.includes(PermissionWildcard) || permissions.includes(permission);
};
