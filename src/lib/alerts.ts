const safeKey = /^[a-z][a-zA-Z0-9_]{0,60}$/u;

export type AlertFields = Record<string, boolean | number | string | undefined>;

export function sanitizeAlertFields(fields: AlertFields = {}) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key, value]) =>
      safeKey.test(key) && value !== undefined &&
      (typeof value === "boolean" || typeof value === "number" ||
        (typeof value === "string" && value.length <= 200)),
    ),
  );
}

export async function sendOperationalAlert(
  input: {
    correlationId?: string;
    event: string;
    fields?: AlertFields;
  },
  options: {
    fetcher?: typeof fetch;
    secret?: string;
    timeoutMs?: number;
    url?: string;
  } = {},
): Promise<"delivered" | "disabled" | "failed"> {
  const configured = options.url === undefined
    ? await import("@/modules/admin/application/platform-settings").then(({ getRuntimeSettings }) => getRuntimeSettings()).catch(() => null)
    : null;
  const url = options.url ?? configured?.alerts.url ?? process.env.ALERT_WEBHOOK_URL;
  if (!url) return "disabled";

  const secret = options.secret ?? configured?.alerts.secret ?? process.env.ALERT_WEBHOOK_SECRET;
  const timeoutMs = options.timeoutMs ?? configured?.alerts.timeoutMs ?? Number(process.env.ALERT_WEBHOOK_TIMEOUT_MS ?? 5_000);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret) headers.authorization = "Bearer " + secret;

  try {
    const response = await (options.fetcher ?? fetch)(url, {
      body: JSON.stringify({
        correlationId: input.correlationId,
        event: input.event,
        fields: sanitizeAlertFields(input.fields),
        scope: "readcoach",
        severity: "error",
        timestamp: new Date().toISOString(),
      }),
      headers,
      method: "POST",
      signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 5_000),
    });
    if (!response.ok) {
      process.stderr.write(JSON.stringify({
        event: "operational_alert_delivery_failed",
        scope: "readcoach",
        status: response.status,
      }) + String.fromCharCode(10));
      return "failed";
    }
    return "delivered";
  } catch (error) {
    process.stderr.write(JSON.stringify({
      errorType: error instanceof Error ? error.name : "unknown",
      event: "operational_alert_delivery_failed",
      scope: "readcoach",
    }) + String.fromCharCode(10));
    return "failed";
  }
}
