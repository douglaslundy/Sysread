import { getPlatformSettings } from "@/modules/admin/application/platform-settings";

export default async function OfflinePage() {
  const { platformName } = await getPlatformSettings();
  return (
    <main className="center-page">
      <p>{platformName}</p>
      <h1>Você está offline</h1>
      <p>Reconecte-se para acessar seus livros. / Reconnect to access your books.</p>
    </main>
  );
}
