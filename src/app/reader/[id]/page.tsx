import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/modules/auth/infrastructure/current-user";
import { ReaderShell } from "@/modules/reader/ui/reader-shell";

export default async function ReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ manage?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/");
  const { id } = await params;
  const { manage } = await searchParams;

  return (
    <div className="app-frame">
      <AppHeader
        active="reader"
        readerHref={"/reader/" + id}
        user={{
          email: currentUser.emailNormalized,
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          theme: currentUser.theme,
        }}
      />
      <ReaderShell contentId={id} initialManage={manage === "1"} />
    </div>
  );
}
