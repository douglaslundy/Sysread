import { AuthError } from "./errors";

export function assertOwnership(
  resourceOwnerId: string | null | undefined,
  actorUserId: string | null | undefined,
): void {
  if (!actorUserId) {
    throw new AuthError(
      "UNAUTHENTICATED",
      401,
      "Authentication is required.",
    );
  }

  if (!resourceOwnerId || resourceOwnerId !== actorUserId) {
    throw new AuthError(
      "FORBIDDEN",
      403,
      "You do not have access to this resource.",
    );
  }
}