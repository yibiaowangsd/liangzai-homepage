/** Scoped to the open intro dialog; editable controls keep their normal Space behavior. */
export function shouldSkipCinema(event: {
  key: string;
  code: string;
  defaultPrevented: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  target: EventTarget | null;
}): boolean {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return false;
  if (event.key !== " " && event.code !== "Space") return false;
  const target = event.target as HTMLElement | null;
  return !target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], button:not(.cinema-skip), a[href]');
}
