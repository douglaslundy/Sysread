import mongoose, { Schema, type Model } from "mongoose";

export interface AppSetting {
  ai?: { apiKeyEncrypted?: string; model?: string; provider?: "openai" };
  alerts?: { secretEncrypted?: string; timeoutMs?: number; url?: string };
  legal?: {
    effectiveDate?: string;
    governingLaw?: string;
    operatorName?: string;
    privacyEmail?: string;
    privacyText?: string;
    supportEmail?: string;
    termsText?: string;
    venue?: string;
  };
  key: "global";
  mercadoPago?: {
    accessTokenEncrypted?: string;
    annualPlanId?: string;
    webhookSecretEncrypted?: string;
    weeklyPlanId?: string;
  };
  platformName: string;
  publicUrl?: string;
  schemaVersion: number;
  tlsMode?: "external" | "disabled";
  createdAt: Date;
  updatedAt: Date;
}

export const appSettingSchema = new Schema<AppSetting>({
  ai: {
    apiKeyEncrypted: { select: false, type: String },
    model: { maxlength: 120, trim: true, type: String },
    provider: { enum: ["openai"], type: String },
  },
  alerts: {
    secretEncrypted: { select: false, type: String },
    timeoutMs: { max: 30000, min: 1000, type: Number },
    url: { maxlength: 2048, trim: true, type: String },
  },
  legal: {
    effectiveDate: { maxlength: 80, trim: true, type: String },
    governingLaw: { maxlength: 240, trim: true, type: String },
    operatorName: { maxlength: 240, trim: true, type: String },
    privacyEmail: { maxlength: 320, trim: true, type: String },
    privacyText: { maxlength: 50000, type: String },
    supportEmail: { maxlength: 320, trim: true, type: String },
    termsText: { maxlength: 50000, type: String },
    venue: { maxlength: 240, trim: true, type: String },
  },
  key: { enum: ["global"], required: true, type: String },
  mercadoPago: {
    accessTokenEncrypted: { select: false, type: String },
    annualPlanId: { maxlength: 240, trim: true, type: String },
    webhookSecretEncrypted: { select: false, type: String },
    weeklyPlanId: { maxlength: 240, trim: true, type: String },
  },
  platformName: { maxlength: 80, required: true, trim: true, type: String },
  publicUrl: { maxlength: 2048, trim: true, type: String },
  schemaVersion: { default: 3, min: 1, required: true, type: Number },
  tlsMode: { default: "external", enum: ["external", "disabled"], type: String },
}, { timestamps: true });

appSettingSchema.index({ key: 1 }, { unique: true });

export const AppSettingModel =
  (mongoose.models.AppSetting as Model<AppSetting> | undefined) ??
  mongoose.model<AppSetting>("AppSetting", appSettingSchema);
