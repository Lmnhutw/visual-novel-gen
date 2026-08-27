"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

type ModalFrameProps = {
  children: ReactNode;
  label?: string;
  labelledBy?: string;
  onClose: () => void;
  panelClassName: string;
};

export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();

  return (
    <ModalFrame
      labelledBy={titleId}
      onClose={onClose}
      panelClassName="w-full max-w-lg rounded-2xl border border-white/10 bg-surface-container-low p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-on-surface" id={titleId}>
          {title}
        </h2>
        <button
          aria-label="Close dialog"
          className="grid size-10 place-items-center rounded-lg text-on-surface-variant transition hover:bg-white/[0.07] hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          type="button"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-5">{children}</div>
    </ModalFrame>
  );
}

export function ModalFrame({
  children,
  label,
  labelledBy,
  onClose,
  panelClassName,
}: ModalFrameProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const returnFocus = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const getFocusable = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              "[autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
            ),
          ).filter((element) => !element.hasAttribute("aria-hidden"))
        : [];

    window.requestAnimationFrame(() => {
      if (panel?.contains(document.activeElement)) return;
      const preferred = panel?.querySelector<HTMLElement>(
        "[autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
      );
      (preferred ?? getFocusable()[0] ?? panel)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        panel?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <section
        ref={panelRef}
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={panelClassName}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </section>
    </div>
  );
}
