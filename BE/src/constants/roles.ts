export const Roles = {
  MEMBER: "MEMBER",
  STAFF: "STAFF",
  TECHNICIAN: "TECHNICIAN",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const AppRoles = Object.values(Roles) as Role[];

export const isRole = (value: string): value is Role => {
  return AppRoles.includes(value as Role);
};
