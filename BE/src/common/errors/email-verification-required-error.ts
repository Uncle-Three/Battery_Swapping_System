import { AppError } from "./app-error";

export class EmailVerificationRequiredError extends AppError {
  constructor(message = "Email verification is required") {
    super(message, 403);
    this.name = "EmailVerificationRequiredError";
  }
}
