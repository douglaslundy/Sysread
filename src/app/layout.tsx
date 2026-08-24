import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import { PwaRegister } from "@/components/pwa-register";
import { getPlatformSettings } from "@/modules/admin/application/platform-settings";
import { getCurrentUser } from "@/modules/auth/infrastructure/current-user";
import { resolveTheme, themeCookieName } from "@/lib/theme";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { platformName } = await getPlatformSettings();
  return {
  title: { default: platformName, template: "%s · " + platformName },
  description: "Leitura focada e inteligente",
  icons: {
    apple: "/icons/icon-180.png",
    icon: [
      { sizes: "192x192", type: "image/png", url: "/icons/icon-192.png" },
      { sizes: "512x512", type: "image/png", url: "/icons/icon-512.png" },
    ],
  }};
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const currentUser = await getCurrentUser();
  const themeCookie = (await cookies()).get(themeCookieName)?.value;
  const theme = resolveTheme(themeCookie ?? currentUser?.theme);

  return (
    <html data-theme={theme} lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
