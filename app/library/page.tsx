import { Suspense } from "react";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/security/session";

import { WriterStudio } from "@/components/workspace/studio/writer-studio";

import styles from "./library.module.css";

export default async function LibraryPage() {
  const user = await requirePageUser();
  return (
    <>
      {user && (
        <form action={signOut} className="flex items-center justify-end gap-3 border-b border-outline-variant px-4 py-2">
          <span className="truncate text-sm text-on-surface-variant">{user.email}</span>
          <Button type="submit" variant="ghost">Sign out</Button>
        </form>
      )}
      <Suspense key={user?.id ?? "local"} fallback={<LibraryLoadingShell />}>
        <WriterStudio />
      </Suspense>
    </>
  );
}

function LibraryLoadingShell() {
  return (
    <main aria-busy="true" className={styles["library-loading"]}>
      <div className={styles["library-loading__content"]}>
        <div className={styles["library-loading__bar"]} />
        <div className={styles["library-loading__panel"]} />
      </div>
    </main>
  );
}
