const dismissedEditions = new Set<string>();
const editionKey = (edition: string) => "liangzai-news-gate:" + edition;

export function isNewsEditionDismissed(edition: string) {
  if (dismissedEditions.has(edition)) return true;
  try {
    return window.localStorage.getItem(editionKey(edition)) === "dismissed";
  } catch {
    return false;
  }
}

export function rememberNewsEditionDismissed(edition: string) {
  // Keep dismissal effective for this visit even if browser storage is blocked.
  dismissedEditions.add(edition);
  try {
    window.localStorage.setItem(editionKey(edition), "dismissed");
  } catch {}
}

/** The native modal supplies focus containment and makes the background inert. */
export function openNewsGateModal(
  dialog: HTMLDialogElement,
  initialFocus: HTMLElement | null,
  dismiss: () => void,
) {
  // This optional announcement must never block the site in older browsers.
  if (typeof dialog.showModal !== "function") return () => {};

  const document = dialog.ownerDocument;
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const previousOverflow = document.body.style.overflow;
  const onCancel = (event: Event) => {
    // Route Escape through the same edition-dismissal path as both buttons.
    event.preventDefault();
    dismiss();
  };

  dialog.showModal();
  document.body.style.overflow = "hidden";
  dialog.addEventListener("cancel", onCancel);
  initialFocus?.focus({ preventScroll: true });

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    dialog.removeEventListener("cancel", onCancel);
    if (dialog.open) dialog.close();
    document.body.style.overflow = previousOverflow;
    if (previouslyFocused?.isConnected) {
      previouslyFocused.focus?.({ preventScroll: true });
    }
  };
}
