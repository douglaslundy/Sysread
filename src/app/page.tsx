import { AppHeader } from "@/components/app-header";
import { LibraryPreview } from "@/components/library-preview";
import { getCurrentUser } from "@/modules/auth/infrastructure/current-user";
import { getPlatformSettings } from "@/modules/admin/application/platform-settings";

export default async function HomePage() {
  const [currentUser, { platformName }] = await Promise.all([getCurrentUser(), getPlatformSettings()]);

  return (
    <main className="app-frame">
      <AppHeader
        active="library"
        user={
          currentUser
            ? {
                email: currentUser.emailNormalized,
                id: currentUser.id,
                name: currentUser.name,
                role: currentUser.role,
                theme: currentUser.theme,
              }
            : null
        }
      />
      <LibraryPreview authenticated={Boolean(currentUser)} platformName={platformName} />
    </main>
  );
}
