"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button, Modal, Tabs } from "@/components/ui";
import { ProfilePanel } from "../../profile/ui/profile-panel";
import { authRequestEvent, type AuthMode, type AuthRequest } from "./auth-required-actions";

type SessionUser = {
  email: string;
  id: string;
  name: string;
};

type AuthControlProps = {
  user: SessionUser | null;
};

function initialAuthRequest(): AuthRequest | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("auth");
  if (mode !== "login" && mode !== "register") return undefined;
  return { mode, returnTo: params.get("returnTo") ?? undefined };
}

export function AuthControl({ user }: AuthControlProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [initialRequest] = useState<AuthRequest | undefined>(initialAuthRequest);
  const [open, setOpen] = useState(Boolean(initialRequest));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [mode, setMode] = useState<AuthMode>(initialRequest?.mode ?? "login");
  const returnToRef = useRef<string | undefined>(initialRequest?.returnTo);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const openAuth = (event: Event) => {
      const detail = (event as CustomEvent<AuthRequest>).detail;
      setMode(detail?.mode ?? "login");
      returnToRef.current = detail?.returnTo;
      setOpen(true);
    };
    window.addEventListener(authRequestEvent, openAuth);
    return () => window.removeEventListener(authRequestEvent, openAuth);
  }, []);

  const finishAuthentication = useCallback(() => {
    setOpen(false);
    const destination = returnToRef.current;
    returnToRef.current = undefined;
    if (destination?.startsWith("/") && !destination.startsWith("//")) router.push(destination);
    else router.refresh();
  }, [router]);

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(false);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      setOpen(false);
      router.refresh();
    } catch {
      setLogoutError(true);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <button
        aria-label={user ? t("openAccount") : t("openAuth")}
        className="avatar auth-avatar"
        onClick={() => setOpen(true)}
        type="button"
      >
        {user ? user.name.slice(0, 1).toUpperCase() : "?"}
      </button>

      {user ? (
        <Modal onClose={close} open={open} title={t("account")}>
          <div className="auth-account">
            <span>{t("signedInAs")}</span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
            <Link className="ui-button ui-button-secondary ui-button-medium" href="/submissions" onClick={close}>{t("submissions")}</Link>
            <ProfilePanel
              onAccountDeleted={() => {
                setOpen(false);
                router.refresh();
              }}
            />
            {logoutError ? <p role="alert">{t("genericError")}</p> : null}
            <Button
              disabled={isLoggingOut}
              onClick={() => void logout()}
              variant="secondary"
            >
              {t("logout")}
            </Button>
          </div>
        </Modal>
      ) : (
        <Modal onClose={close} open={open} title={t("title")}>
          <Tabs
            ariaLabel={t("title")}
            onValueChange={(value) => setMode(value as AuthMode)}
            value={mode}
            items={[
              {
                content: (
                  <AuthForm
                    mode="login"
                    onSuccess={finishAuthentication}
                  />
                ),
                label: t("login"),
                value: "login",
              },
              {
                content: (
                  <AuthForm
                    mode="register"
                    onSuccess={finishAuthentication}
                  />
                ),
                label: t("register"),
                value: "register",
              },
            ]}
          />
        </Modal>
      )}
    </>
  );
}

function AuthForm({
  mode,
  onSuccess,
}: {
  mode: AuthMode;
  onSuccess: () => void;
}) {
  const t = useTranslations("Auth");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setHasError(false);
    const form = new FormData(event.currentTarget);
    const body = {
      email: String(form.get("email") ?? ""),
      name: mode === "register" ? String(form.get("name") ?? "") : undefined,
      password: String(form.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/" + mode, {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("authentication failed");
      onSuccess();
    } catch {
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      {mode === "register" ? (
        <label>
          <span>{t("name")}</span>
          <input
            autoComplete="name"
            maxLength={120}
            minLength={2}
            name="name"
            required
          />
        </label>
      ) : null}
      <label>
        <span>{t("email")}</span>
        <input
          autoComplete="email"
          maxLength={320}
          name="email"
          required
          type="email"
        />
      </label>
      <label>
        <span>{t("password")}</span>
        <input
          aria-describedby={mode === "register" ? "password-hint" : undefined}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          maxLength={128}
          minLength={12}
          name="password"
          required
          type="password"
        />
        {mode === "register" ? (
          <small id="password-hint">{t("passwordHint")}</small>
        ) : null}
      </label>
      {hasError ? <p role="alert">{t("genericError")}</p> : null}
      <Button disabled={isSubmitting} type="submit" variant="primary">
        {mode === "register" ? t("submitRegister") : t("submitLogin")}
      </Button>
    </form>
  );
}
