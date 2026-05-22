import { useEffect, useRef } from "react";

// Accessibility behaviour shared by every modal dialog: trap Tab focus
// inside the dialog, close on Escape, move focus into the dialog on open,
// and restore focus to the element that opened it on close. Without this a
// keyboard or screen-reader user can Tab out of a "modal" into the page
// behind it, and loses their place entirely when it closes.
//
// Usage: attach the returned ref to the dialog's content container and pass
// the close handler. Render the dialog conditionally — mounting/unmounting
// drives the focus move + restore.
export function useModalDialog<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void
) {
  const ref = useRef<T | null>(null);
  // Keep the latest onClose without re-running the effect each render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null || el === document.activeElement)
        : [];

    // Move focus into the dialog (first focusable, else the container).
    const first = focusable()[0];
    if (first) first.focus();
    else if (node) {
      node.setAttribute("tabindex", "-1");
      node.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // Restore focus to whatever opened the dialog.
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, []);

  return ref;
}
