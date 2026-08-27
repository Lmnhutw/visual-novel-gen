import { Suspense } from "react";

import { WriterStudio } from "@/components/workspace/studio/writer-studio";

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryLoadingShell />}>
      <WriterStudio />
    </Suspense>
  );
}

function LibraryLoadingShell() {
  return (
    <main aria-busy="true" className="min-h-screen bg-background p-8 text-on-surface">
      <div className="mx-auto max-w-[1760px] animate-pulse space-y-5">
        <div className="h-16 border-b border-white/[0.08]" />
        <div className="h-64 rounded-2xl border border-white/[0.08] bg-surface-container-low" />
      </div>
    </main>
  );
}
