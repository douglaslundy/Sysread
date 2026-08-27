import Link from "next/link";
import en from "@/messages/en.json";
import { getPlatformSettings } from "@/modules/admin/application/platform-settings";

export default async function NotFound() {
  const copy = en.Public.notFound;
  const { platformName } = await getPlatformSettings();

  return (
    <main className="center-page">
      <p>{copy.label.replace("{platformName}", platformName)}</p>
      <h1>404</h1>
      <Link className="primary-button" href="/">{copy.action}</Link>
    </main>
  );
}
