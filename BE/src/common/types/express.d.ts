import type { UserStatus } from "@prisma/client";
import type { Role } from "../../constants/roles";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
