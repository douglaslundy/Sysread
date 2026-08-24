import en from "../messages/en.json";
import ptBR from "../messages/pt-BR.json";

export const locales = ["pt-BR", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "pt-BR";
export const localeCookieName = "NEXT_LOCALE";

export const messagesByLocale = {
  "pt-BR": ptBR,
  en,
} as const;

export function resolveLocale(value: string | null | undefined): AppLocale {
  return locales.includes(value as AppLocale) ? (value as AppLocale) : defaultLocale;
}