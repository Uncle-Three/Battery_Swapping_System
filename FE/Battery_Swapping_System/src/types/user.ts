import { UserRole } from '../constants/roles';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  rfidCard?: string;
  licensePlate?: string;
  createdAt: string;
}

export interface Profile {
  user: User;
  phoneNumber?: string;
  balance: number;
  avatarUrl?: string;
}
