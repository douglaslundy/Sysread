import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/modules/auth/infrastructure/current-user";
import { listOwnNotes } from "@/modules/notes/application/note-service";
import { NotebooksList } from "@/modules/notes/ui/notebooks-list";

export default async function NotebooksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login");
  const notes = await listOwnNotes(user.id);
  return (
    <main className="app-frame">
      <AppHeader active="library" user={{ email: user.emailNormalized, id: user.id, name: user.name, role: user.role, theme: user.theme }} />
      <NotebooksList initialNotes={notes} />
    </main>
  );
}
