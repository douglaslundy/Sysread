import { AppHeader } from "@/components/app-header";
import { LibraryPreview } from "@/components/library-preview";
import { getCurrentUser } from "@/modules/auth/infrastructure/current-user";

export default async function HomePage() {
  const currentUser = await getCurrentUser();

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
      <LibraryPreview authenticated={Boolean(currentUser)} />
    </main>
  );
}
