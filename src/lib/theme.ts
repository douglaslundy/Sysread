export const themeCookieName = "SYSREAD_THEME";

export type AppTheme = "system" | "dark" | "light";

export function resolveTheme(value: string | null | undefined): AppTheme {
  return value === "dark" || value === "light" || value === "system" ? value : "system";
}
