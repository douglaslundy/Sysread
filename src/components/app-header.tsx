import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { cookies } from "next/headers";
import { AuthControl } from "@/modules/auth/ui/auth-control";
import { ImportDialog } from "@/modules/imports/ui/import-dialog";
import { getPlatformSettings } from "@/modules/admin/application/platform-settings";
import { resolveTheme, themeCookieName } from "@/lib/theme";

type HeaderUser = {
  email: string;
  id: string;
  name: string;
  role: "admin" | "user";
  theme: "system" | "dark" | "light";
};

type AppHeaderProps = {
  active: "reader" | "library";
  readerHref?: string;
  user: HeaderUser | null;
};

export async function AppHeader({ active, readerHref = "/", user }: AppHeaderProps) {
  const t = await getTranslations("Navigation");
  const { platformName } = await getPlatformSettings();
  const themeCookie = (await cookies()).get(themeCookieName)?.value;
  const theme = resolveTheme(themeCookie ?? user?.theme);

  return (
    <header className="app-header">
      <Link className="brand" href="/">{platformName}</Link>
      <nav className="segmented" aria-label={t("library")}>
        <Link className={active === "reader" ? "active" : ""} href={readerHref}>{t("reader")}</Link>
        <Link className={active === "library" ? "active" : ""} href="/">{t("library")}</Link>
      </nav>
      <div className="header-actions">
        {user?.role === "admin" ? <Link className="admin-link" href="/admin">{t("admin")}</Link> : null}
        <ThemeToggle initialTheme={theme} />
        <LocaleSwitcher />
        <button aria-label={t("feedback")}>{"\u25a2"}</button>
        <ImportDialog authenticated={Boolean(user)} />
        <AuthControl user={user} />
      </div>
    </header>
  );
}
