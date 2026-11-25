import { Suspense } from "react";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/security/session";

import { WriterStudio } from "@/components/workspace/studio/writer-studio";

import styles from "./library.module.css";

export default async function LibraryPage() {
  const user = await requirePageUser();
  return (
    <Suspense key={user?.id ?? "local"} fallback={<LibraryLoadingShell />}>
      <WriterStudio
        canManagePublication={Boolean(user)}
        accountActions={user && (
          <form action={signOut} className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm text-on-surface-variant xl:inline">{user.email}</span>
            <Button type="submit" variant="ghost">Sign out</Button>
          </form>
        )}
      />
    </Suspense>
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
