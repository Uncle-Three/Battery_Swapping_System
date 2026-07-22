import type { Role, UserStatus } from "@prisma/client";

type WalletLike = {
  balance: number | string | { toString: () => string };
} | null;

type UserWithProfileRelations = {
  id: string;
  email: string;
  emailVerifiedAt?: Date | null;
  emailVerificationRequired?: boolean | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: Date;
  role: Pick<Role, "name">;
  wallet?: WalletLike;
};

const mapBalance = (wallet: WalletLike | undefined): number | string => {
  if (!wallet) {
    return 0;
  }

  if (typeof wallet.balance === "number" || typeof wallet.balance === "string") {
    return wallet.balance;
  }

  return wallet.balance.toString();
};

export const userMapper = {
  toResponse: (user: UserWithProfileRelations) => ({
    id: user.id,
    email: user.email,
    emailVerified: !user.emailVerificationRequired || Boolean(user.emailVerifiedAt),
    name: user.fullName,
    phoneNumber: user.phone,
    role: user.role.name,
    avatarUrl: user.avatarUrl,
    status: user.status,
    balance: mapBalance(user.wallet),
    createdAt: user.createdAt.toISOString(),
  }),
};
