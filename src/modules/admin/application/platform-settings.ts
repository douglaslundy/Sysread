import { legalIdentity } from "@/config/legal";
import { defaultPlatformName, normalizePlatformName } from "@/config/platform";
import { connectToMongo } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/env";
import { AppSettingModel } from "../infrastructure/app-setting.model";
import { decryptSetting, encryptSetting } from "../infrastructure/settings-crypto";

export type PlatformSettings = { platformName: string };
export type LegalSettings = {
  effectiveDate: string; governingLaw: string; operatorName: string;
  privacyEmail: string; privacyText: string; supportEmail: string;
  termsText: string; venue: string;
};
export type AdminPlatformSettings = {
  ai: { apiKeyConfigured: boolean; model: string; provider: "openai" };
  alerts: { secretConfigured: boolean; timeoutMs: number; url: string };
  legal: LegalSettings;
  mercadoPago: { accessTokenConfigured: boolean; annualPlanId: string; webhookSecretConfigured: boolean; weeklyPlanId: string };
  platformName: string;
  publicUrl: string;
  tlsMode: "external" | "disabled";
};
export type AdminSettingsUpdate = {
  ai: { apiKey?: string; clearApiKey?: boolean; model: string; provider: "openai" };
  alerts: { clearSecret?: boolean; secret?: string; timeoutMs: number; url: string };
  legal: LegalSettings;
  mercadoPago: { accessToken?: string; annualPlanId: string; clearAccessToken?: boolean; clearWebhookSecret?: boolean; webhookSecret?: string; weeklyPlanId: string };
  platformName: string;
  publicUrl: string;
  tlsMode: "external" | "disabled";
};
export type RuntimeSettings = {
  ai: { apiKey?: string; model: string; provider: "openai" };
  alerts: { secret?: string; timeoutMs: number; url?: string };
  legal: LegalSettings;
  mercadoPago: { accessToken?: string; annualPlanId?: string; webhookSecret?: string; weeklyPlanId?: string };
  platformName: string;
  publicUrl: string;
  tlsMode: "external" | "disabled";
};

const emptyLegal: LegalSettings = { ...legalIdentity, privacyText: "", termsText: "" };
const trim = (value?: string) => value?.trim() ?? "";

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    await connectToMongo();
    const settings = await AppSettingModel.findOne({ key: "global" }).lean().exec();
    return { platformName: settings?.platformName ?? defaultPlatformName };
  } catch { return { platformName: defaultPlatformName }; }
}

async function settingsDocumentWithSecrets() {
  await connectToMongo();
  return AppSettingModel.findOne({ key: "global" })
    .select("+ai.apiKeyEncrypted +alerts.secretEncrypted +mercadoPago.accessTokenEncrypted +mercadoPago.webhookSecretEncrypted")
    .lean().exec();
}

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const env = getServerEnv();
  const settings = await settingsDocumentWithSecrets();
  return {
    ai: { apiKey: decryptSetting(settings?.ai?.apiKeyEncrypted) ?? env.AI_API_KEY, model: trim(settings?.ai?.model) || env.AI_MODEL, provider: "openai" },
    alerts: { secret: decryptSetting(settings?.alerts?.secretEncrypted) ?? env.ALERT_WEBHOOK_SECRET, timeoutMs: settings?.alerts?.timeoutMs ?? env.ALERT_WEBHOOK_TIMEOUT_MS, url: trim(settings?.alerts?.url) || env.ALERT_WEBHOOK_URL },
    legal: {
      effectiveDate: trim(settings?.legal?.effectiveDate) || emptyLegal.effectiveDate,
      governingLaw: trim(settings?.legal?.governingLaw) || emptyLegal.governingLaw,
      operatorName: trim(settings?.legal?.operatorName) || emptyLegal.operatorName,
      privacyEmail: trim(settings?.legal?.privacyEmail) || emptyLegal.privacyEmail,
      privacyText: settings?.legal?.privacyText?.trim() ?? "",
      supportEmail: trim(settings?.legal?.supportEmail) || emptyLegal.supportEmail,
      termsText: settings?.legal?.termsText?.trim() ?? "",
      venue: trim(settings?.legal?.venue) || emptyLegal.venue,
    },
    mercadoPago: {
      accessToken: decryptSetting(settings?.mercadoPago?.accessTokenEncrypted) ?? env.MERCADOPAGO_ACCESS_TOKEN,
      annualPlanId: trim(settings?.mercadoPago?.annualPlanId) || env.MERCADOPAGO_ANNUAL_PLAN_ID,
      webhookSecret: decryptSetting(settings?.mercadoPago?.webhookSecretEncrypted) ?? env.MERCADOPAGO_WEBHOOK_SECRET,
      weeklyPlanId: trim(settings?.mercadoPago?.weeklyPlanId) || env.MERCADOPAGO_WEEKLY_PLAN_ID,
    },
    platformName: settings?.platformName ?? defaultPlatformName,
    publicUrl: trim(settings?.publicUrl) || env.APP_URL,
    tlsMode: settings?.tlsMode ?? (env.APP_URL.startsWith("https://") ? "external" : "disabled"),
  };
}

export async function getLegalSettings(): Promise<LegalSettings> {
  try { return (await getRuntimeSettings()).legal; }
  catch { return emptyLegal; }
}

export async function getAdminSettings(): Promise<AdminPlatformSettings> {
  const runtime = await getRuntimeSettings();
  return {
    ai: { apiKeyConfigured: Boolean(runtime.ai.apiKey), model: runtime.ai.model, provider: runtime.ai.provider },
    alerts: { secretConfigured: Boolean(runtime.alerts.secret), timeoutMs: runtime.alerts.timeoutMs, url: runtime.alerts.url ?? "" },
    legal: runtime.legal,
    mercadoPago: { accessTokenConfigured: Boolean(runtime.mercadoPago.accessToken), annualPlanId: runtime.mercadoPago.annualPlanId ?? "", webhookSecretConfigured: Boolean(runtime.mercadoPago.webhookSecret), weeklyPlanId: runtime.mercadoPago.weeklyPlanId ?? "" },
    platformName: runtime.platformName,
    publicUrl: runtime.publicUrl,
    tlsMode: runtime.tlsMode,
  };
}

export async function updatePlatformSettings(input: AdminSettingsUpdate): Promise<AdminPlatformSettings> {
  await connectToMongo();
  const existing = await settingsDocumentWithSecrets();
  const aiKey = input.ai.clearApiKey ? undefined : input.ai.apiKey?.trim() ? encryptSetting(input.ai.apiKey.trim()) : existing?.ai?.apiKeyEncrypted;
  const alertSecret = input.alerts.clearSecret ? undefined : input.alerts.secret?.trim() ? encryptSetting(input.alerts.secret.trim()) : existing?.alerts?.secretEncrypted;
  const accessToken = input.mercadoPago.clearAccessToken ? undefined : input.mercadoPago.accessToken?.trim() ? encryptSetting(input.mercadoPago.accessToken.trim()) : existing?.mercadoPago?.accessTokenEncrypted;
  const webhookSecret = input.mercadoPago.clearWebhookSecret ? undefined : input.mercadoPago.webhookSecret?.trim() ? encryptSetting(input.mercadoPago.webhookSecret.trim()) : existing?.mercadoPago?.webhookSecretEncrypted;
  await AppSettingModel.updateOne({ key: "global" }, { $set: {
    ai: { apiKeyEncrypted: aiKey, model: input.ai.model.trim(), provider: "openai" },
    alerts: { secretEncrypted: alertSecret, timeoutMs: input.alerts.timeoutMs, url: input.alerts.url.trim() },
    legal: Object.fromEntries(Object.entries(input.legal).map(([key, value]) => [key, value.trim()])),
    mercadoPago: { accessTokenEncrypted: accessToken, annualPlanId: input.mercadoPago.annualPlanId.trim(), webhookSecretEncrypted: webhookSecret, weeklyPlanId: input.mercadoPago.weeklyPlanId.trim() },
    platformName: normalizePlatformName(input.platformName), publicUrl: input.publicUrl.replace(/\/$/u, ""), schemaVersion: 3, tlsMode: input.tlsMode,
  }, $setOnInsert: { key: "global" } }, { runValidators: true, upsert: true }).exec();
  return getAdminSettings();
}
