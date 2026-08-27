import { Suspense } from "react";

import { WriterStudio } from "@/components/workspace/studio/writer-studio";

import styles from "./library.module.css";

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryLoadingShell />}>
      <WriterStudio />
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
