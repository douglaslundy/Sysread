"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Skeleton, Tabs } from "@/components/ui";

type ProfileData = {
  avatarUrl?: string;
  email: string;
  id: string;
  locale: "pt-BR" | "en";
  name: string;
  theme: "system" | "dark" | "light";
};

type ProfilePanelProps = {
  onAccountDeleted: () => void;
};

export function ProfilePanel({
  onAccountDeleted,
}: ProfilePanelProps) {
  const t = useTranslations("Profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/me", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("profile load failed");
        const body = (await response.json()) as { profile: ProfileData };
        setProfile(body.profile);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLoadError(true);
        }
      });

    return () => controller.abort();
  }, []);

  if (loadError) return <p role="alert">{t("error")}</p>;
  if (!profile) return <Skeleton label={t("loading")} />;

  return (
    <Tabs
      ariaLabel={t("profileTab")}
      defaultValue="profile"
      items={[
        {
          content: (
            <ProfileForm onProfileChange={setProfile} profile={profile} />
          ),
          label: t("profileTab"),
          value: "profile",
        },
        {
          content: (
            <SecurityForm onAccountDeleted={onAccountDeleted} />
          ),
          label: t("securityTab"),
          value: "security",
        },
      ]}
    />
  );
}

function ProfileForm({
  onProfileChange,
  profile,
}: {
  onProfileChange: (profile: ProfileData) => void;
  profile: ProfileData;
}) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving") return;

    setState("saving");
    const form = new FormData(event.currentTarget);
    const avatarUrl = String(form.get("avatarUrl") ?? "").trim();
    const body = {
      avatarUrl: avatarUrl || undefined,
      locale: String(form.get("locale")),
      name: String(form.get("name")),
      theme: String(form.get("theme")),
    };

    try {
      const response = await fetch("/api/me", {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) throw new Error("profile update failed");
      const result = (await response.json()) as { profile: ProfileData };
      onProfileChange(result.profile);
      document.documentElement.dataset.theme = result.profile.theme;
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      <label>
        <span>{t("name")}</span>
        <input
          defaultValue={profile.name}
          maxLength={120}
          minLength={2}
          name="name"
          required
        />
      </label>
      <label>
        <span>{t("avatarUrl")}</span>
        <input
          defaultValue={profile.avatarUrl}
          maxLength={2048}
          name="avatarUrl"
          type="url"
        />
      </label>
      <label>
        <span>{t("locale")}</span>
        <select defaultValue={profile.locale} name="locale">
          <option value="pt-BR">Português</option>
          <option value="en">English</option>
        </select>
      </label>
      <label>
        <span>{t("theme")}</span>
        <select defaultValue={profile.theme} name="theme">
          <option value="system">{t("themeSystem")}</option>
          <option value="dark">{t("themeDark")}</option>
          <option value="light">{t("themeLight")}</option>
        </select>
      </label>
      {state === "saved" ? <p role="status">{t("saved")}</p> : null}
      {state === "error" ? <p role="alert">{t("error")}</p> : null}
      <Button disabled={state === "saving"} type="submit" variant="primary">
        {t("save")}
      </Button>
    </form>
  );
}

function SecurityForm({
  onAccountDeleted,
}: {
  onAccountDeleted: () => void;
}) {
  const t = useTranslations("Profile");
  const [passwordState, setPasswordState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordState === "saving") return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPasswordState("saving");

    try {
      const response = await fetch("/api/me/password", {
        body: JSON.stringify({
          currentPassword: String(form.get("currentPassword") ?? ""),
          newPassword: String(form.get("newPassword") ?? ""),
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) throw new Error("password update failed");
      formElement.reset();
      setPasswordState("saved");
    } catch {
      setPasswordState("error");
    }
  }

  async function deleteAccount() {
    if (confirmation !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError(false);

    try {
      const response = await fetch("/api/me", { method: "DELETE" });
      if (!response.ok) throw new Error("deletion failed");
      onAccountDeleted();
    } catch {
      setDeleteError(true);
      setDeleting(false);
    }
  }

  return (
    <div className="profile-security">
      <form className="auth-form" onSubmit={(event) => void changePassword(event)}>
        <label>
          <span>{t("currentPassword")}</span>
          <input
            autoComplete="current-password"
            minLength={12}
            name="currentPassword"
            required
            type="password"
          />
        </label>
        <label>
          <span>{t("newPassword")}</span>
          <input
            autoComplete="new-password"
            minLength={12}
            name="newPassword"
            required
            type="password"
          />
        </label>
        {passwordState === "saved" ? (
          <p role="status">{t("passwordChanged")}</p>
        ) : null}
        {passwordState === "error" ? <p role="alert">{t("error")}</p> : null}
        <Button
          disabled={passwordState === "saving"}
          type="submit"
          variant="primary"
        >
          {t("changePassword")}
        </Button>
      </form>

      <section className="profile-delete">
        <h3>{t("deleteTitle")}</h3>
        <p>{t("deleteWarning")}</p>
        <label>
          <span>{t("deleteConfirm")}</span>
          <input
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </label>
        {deleteError ? <p role="alert">{t("error")}</p> : null}
        <Button
          disabled={confirmation !== "DELETE" || deleting}
          onClick={() => void deleteAccount()}
          variant="danger"
        >
          {t("deleteAction")}
        </Button>
      </section>
    </div>
  );
}
