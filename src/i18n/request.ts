import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  localeCookieName,
  messagesByLocale,
  resolveLocale,
} from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(localeCookieName)?.value);

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});