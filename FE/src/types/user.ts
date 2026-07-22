import { UserRole } from '../constants/roles';

export interface User {
  id: string;
  email: string;
  emailVerified?: boolean;
  name: string;
  role: UserRole;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  balance?: string;
  rfidCard?: string;
  licensePlate?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  email: string;
  emailVerified?: boolean;
  name: string;
  role: UserRole;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  balance?: string;
  createdAt: string;
}

export type UserStatus = NonNullable<User['status']>;

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
};

export type UpdateProfileInput = {
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
};

export type PermissionMatrix = Record<UserRole, string[]>;
