export type AuthErrorCode =
  | "EMAIL_IN_USE"
  | "ACCESS_EXPIRED"
  | "FORBIDDEN"
  | "INVALID_CREDENTIALS"
  | "INVALID_ORIGIN"
  | "INVALID_PASSWORD"
  | "UNAUTHENTICATED"
  | "USER_INACTIVE";

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
