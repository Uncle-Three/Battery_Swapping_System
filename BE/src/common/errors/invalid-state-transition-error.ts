import { AppError } from "./app-error";

export class InvalidStateTransitionError extends AppError {
  constructor(entity: string, from: string, to: string) {
    super(`Invalid ${entity} state transition: ${from} -> ${to}`, 409);
  }
}
