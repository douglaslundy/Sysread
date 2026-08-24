"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export type AuthMode = "login" | "register";
export type AuthRequest = { mode: AuthMode; returnTo?: string };
export const authRequestEvent = "sysread:auth-request";

export function requestAuthentication(mode: AuthMode, returnTo?: string): void {
  window.dispatchEvent(new CustomEvent<AuthRequest>(authRequestEvent, { detail: { mode, returnTo } }));
}

export function AuthRequiredActions({ message }: { message?: string }) {
  const t = useTranslations("Auth");
  return (
    <div className="auth-required" role="status">
      <p>{message ?? t("required")}</p>
      <div>
        <Button onClick={() => requestAuthentication("login")} variant="primary">{t("login")}</Button>
        <Button onClick={() => requestAuthentication("register")} variant="secondary">{t("register")}</Button>
      </div>
    </div>
  );
}
