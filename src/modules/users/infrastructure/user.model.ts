import mongoose, { Schema, type Model } from "mongoose";

export interface User {
  accessExpiresAt?: Date;
  authVersion: number;
  avatarUrl?: string;
  createdAt: Date;
  emailNormalized: string;
  lastLoginAt?: Date;
  lifecycleStatus: "active" | "blocked" | "deleting" | "deleted";
  locale: "pt-BR" | "en";
  name: string;
  passwordHash?: string;
  role: "admin" | "user";
  schemaVersion: number;
  theme: "system" | "dark" | "light";
  updatedAt: Date;
}

export const userSchema = new Schema<User>(
  {
    accessExpiresAt: { type: Date },
    authVersion: { default: 0, min: 0, required: true, type: Number },
    avatarUrl: { type: String, trim: true },
    emailNormalized: {
      lowercase: true,
      required: true,
      trim: true,
      type: String,
    },
    lifecycleStatus: {
      default: "active",
      enum: ["active", "blocked", "deleting", "deleted"],
      required: true,
      type: String,
    },
    lastLoginAt: { type: Date },
    locale: {
      default: "pt-BR",
      enum: ["pt-BR", "en"],
      required: true,
      type: String,
    },
    name: { maxlength: 120, required: true, trim: true, type: String },
    passwordHash: { select: false, type: String },
    role: {
      default: "user",
      enum: ["admin", "user"],
      required: true,
      type: String,
    },
    schemaVersion: { default: 2, min: 1, required: true, type: Number },
    theme: {
      default: "system",
      enum: ["system", "dark", "light"],
      required: true,
      type: String,
    },
  },
  { timestamps: true },
);

userSchema.index({ emailNormalized: 1 }, { unique: true });

export const UserModel =
  (mongoose.models.User as Model<User> | undefined) ??
  mongoose.model<User>("User", userSchema);
