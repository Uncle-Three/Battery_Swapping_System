import type { Profile, User } from '../types';

type UserDto = Omit<User, 'balance'> & {
  balance?: string | number | null;
};

type ProfileDto = Omit<Profile, 'balance'> & {
  balance?: string | number | null;
};

const mapBalance = (balance: string | number | null | undefined): string => {
  if (balance === null || balance === undefined) {
    return '0';
  }

  return String(balance);
};

export const mapUserDto = (user: UserDto): User => ({
  ...user,
  balance: mapBalance(user.balance),
});

export const mapProfileDto = (profile: ProfileDto): Profile => ({
  ...profile,
  balance: mapBalance(profile.balance),
});
