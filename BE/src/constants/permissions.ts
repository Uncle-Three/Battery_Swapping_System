import { Roles, type Role } from "./roles";

export const PermissionWildcard = "*" as const;

export const Permissions = {
  PROFILE_READ_SELF: "profile:read:self",
  PROFILE_UPDATE_SELF: "profile:update:self",
  USERS_READ_ANY: "users:read:any",
  USERS_UPDATE_ROLE: "users:update-role",
  USERS_UPDATE_STATUS: "users:update-status",
  AUDIT_LOGS_READ: "audit-logs:read",
  BOOKINGS_CREATE: "bookings:create",
  BOOKINGS_READ_SELF: "bookings:read:self",
  BOOKINGS_CANCEL_SELF: "bookings:cancel:self",
  BOOKINGS_READ_ANY: "bookings:read:any",
  SWAPS_INITIATE: "swaps:initiate",
  SWAPS_PROCESS: "swaps:process",
  SWAPS_READ_SELF: "swaps:read:self",
  SWAPS_READ_ANY: "swaps:read:any",
  PAYMENTS_MANAGE_SELF: "payments:manage:self",
  VEHICLES_MANAGE_SELF: "vehicles:manage:self",
  STATIONS_READ: "stations:read",
  SLOTS_READ: "slots:read",
  BATTERIES_READ: "batteries:read",
  BATTERIES_FAULTY_READ: "batteries:faulty:read",
  MAINTENANCE_CREATE: "maintenance:create",
  MAINTENANCE_READ: "maintenance:read",
  BATTERY_HEALTH_READ: "battery-health:read",
  BATTERY_HEALTH_WRITE: "battery-health:write",
  NOTIFICATIONS_READ_SELF: "notifications:read:self",
  REPLACEMENTS_READ_SELF: "replacement-requests:read:self",
  REPORTS_READ: "reports:read",
  INVENTORY_READ: "inventory:read",
  SETTINGS_MANAGE: "settings:manage",
  STATION_ASSIGNMENTS_MANAGE: "station-assignments:manage",
  SAFETY_RULES_MANAGE: "safety-rules:manage",
  COMPATIBILITY_MANAGE: "compatibility:manage",
  BOOKINGS_APPROVE: "bookings:approve",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
export type PermissionGrant = Permission | typeof PermissionWildcard;

export const RolePermissions = {
  [Roles.MEMBER]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
    Permissions.VEHICLES_MANAGE_SELF,
    Permissions.BOOKINGS_CREATE,
    Permissions.BOOKINGS_READ_SELF,
    Permissions.BOOKINGS_CANCEL_SELF,
    Permissions.SWAPS_READ_SELF,
    Permissions.PAYMENTS_MANAGE_SELF,
    Permissions.BATTERY_HEALTH_READ,
    Permissions.NOTIFICATIONS_READ_SELF,
    Permissions.REPLACEMENTS_READ_SELF,
  ],
  [Roles.STAFF]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
    Permissions.STATIONS_READ,
    Permissions.SLOTS_READ,
    Permissions.BOOKINGS_READ_ANY,
    Permissions.SWAPS_INITIATE,
    Permissions.SWAPS_PROCESS,
  ],
  [Roles.TECHNICIAN]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
    Permissions.BATTERIES_READ,
    Permissions.BATTERIES_FAULTY_READ,
    Permissions.MAINTENANCE_CREATE,
    Permissions.MAINTENANCE_READ,
    Permissions.BATTERY_HEALTH_READ,
    Permissions.BATTERY_HEALTH_WRITE,
  ],
  [Roles.MANAGER]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
    Permissions.REPORTS_READ,
    Permissions.INVENTORY_READ,
    Permissions.STATIONS_READ,
    Permissions.BATTERIES_READ,
    Permissions.BATTERY_HEALTH_READ,
    Permissions.SWAPS_READ_ANY,
    Permissions.BOOKINGS_APPROVE,
  ],
  [Roles.ADMIN]: [PermissionWildcard],
} as const satisfies Record<Role, readonly PermissionGrant[]>;

export const getPermissionsByRole = (role: Role): readonly PermissionGrant[] => {
  return RolePermissions[role];
};

export const hasPermission = (role: Role, permission: Permission): boolean => {
  const permissions = getPermissionsByRole(role);
  return permissions.includes(PermissionWildcard) || permissions.includes(permission);
};
