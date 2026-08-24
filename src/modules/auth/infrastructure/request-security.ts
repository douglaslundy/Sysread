import { AuthError } from "../application/errors";

export async function assertSameOrigin(request: Request): Promise<void> {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const applicationOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : requestOrigin;
  const receivedOrigin = origin ? new URL(origin).origin : "";
  if (receivedOrigin === applicationOrigin) return;
  if (!process.env.APP_URL || receivedOrigin === requestOrigin) throw new AuthError("INVALID_ORIGIN", 403, "The request origin is not allowed.");
  const configuredOrigin = await import("@/modules/admin/application/platform-settings").then(({ getRuntimeSettings }) => getRuntimeSettings()).then((settings) => new URL(settings.publicUrl).origin).catch(() => applicationOrigin);

  if (!receivedOrigin || receivedOrigin !== configuredOrigin) {
    throw new AuthError(
      "INVALID_ORIGIN",
      403,
      "The request origin is not allowed.",
    );
  }
}
