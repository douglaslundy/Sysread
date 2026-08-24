export const defaultPlatformName = "Sysread";

export function normalizePlatformName(value: string): string {
  return value.trim().replace(/\s+/gu, " ").slice(0, 80) || defaultPlatformName;
}
