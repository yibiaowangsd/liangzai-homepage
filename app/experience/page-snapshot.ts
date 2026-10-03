/** Freeze used styles before removing IDs or moving nodes out of their CSS scope. */
export function freezePage(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...source.querySelectorAll<HTMLElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  const sourceRect = source.getBoundingClientRect();
  const positioned: { copy: HTMLElement; position: string; rect: DOMRect }[] = [];
  const pseudoRules: string[] = [];

  originals.forEach((original, index) => {
    const copy = copies[index];
    const computed = getComputedStyle(original);
    // IDs drive the laboratory's grid, sidebar and material styling. Keeping
    // duplicate IDs breaks live updates; dropping them before freezing reflows
    // the page. Used styles also preserve inherited variables and route scopes.
    // Assign once: thousands of per-property CSSOM mutations make large audit
    // tables stall even though the clone is detached. Keep the full style set.
    copy.style.cssText = Array.from(computed, property => `${property}:${computed.getPropertyValue(property)}`).join(";");
    copy.style.setProperty("animation", "none", "important");
    copy.style.setProperty("transition", "none", "important");
    for (const pseudo of ["::before", "::after"]) {
      const style = getComputedStyle(original, pseudo);
      if (style.content === "none" || style.content === "normal" || style.display === "none") continue;
      copy.dataset.pushSnapshot = String(index);
      const declarations = Array.from(style, property => `${property}:${style.getPropertyValue(property)}`).join(";");
      pseudoRules.push(`[data-push-snapshot="${index}"]${pseudo}{${declarations};animation:none!important;transition:none!important}`);
    }
    if (original !== source && (computed.position === "fixed" || computed.position === "sticky")) {
      positioned.push({ copy, position: computed.position, rect: original.getBoundingClientRect() });
    }
    if (original instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) {
      copy.width = original.width; copy.height = original.height;
      const context = copy.getContext("2d");
      if (context) {
        try { context.drawImage(original, 0, 0); } catch { /* A missing frame must never block navigation. */ }
        original.dispatchEvent(new CustomEvent("liangzai:snapshot", { detail: context }));
      }
    }
    if (original instanceof HTMLInputElement && copy instanceof HTMLInputElement) { copy.value = original.value; copy.checked = original.checked; }
    if (original instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) copy.value = original.value;
    if (original instanceof HTMLSelectElement && copy instanceof HTMLSelectElement) copy.selectedIndex = original.selectedIndex;
    copy.removeAttribute("id");
    copy.removeAttribute("autofocus");
  });

  for (const { copy, position, rect } of positioned) {
    if (position === "sticky") {
      // Keep sticky nodes in their original scroller/stacking context. Portaling
      // them would discard clipping (e.g. horizontally scrolled audit headers).
      // Restore the captured offset only after attachment and scroller restore.
      Object.assign(copy.style, { position: "relative", top: "0px", left: "0px", bottom: "auto", right: "auto" });
      continue;
    }
    clone.append(copy);
    Object.assign(copy.style, { position: "absolute", top: `${rect.top - sourceRect.top}px`, left: `${rect.left - sourceRect.left}px`, width: `${rect.width}px`, height: `${rect.height}px`, bottom: "auto", right: "auto", margin: "0", transform: "none" });
  }
  if (pseudoRules.length) {
    const style = document.createElement("style");
    style.textContent = pseudoRules.join("\n");
    clone.append(style);
  }
  Object.assign(clone.style, {
    position: "relative", margin: "0", width: `${sourceRect.width}px`,
    left: `${sourceRect.left}px`, top: `${sourceRect.top}px`, transform: "none",
  });
  clone.setAttribute("aria-hidden", "true");
  clone.inert = true;
  return { clone, restoreScrollers() {
    originals.forEach((original, index) => {
      copies[index].scrollTop = original.scrollTop;
      copies[index].scrollLeft = original.scrollLeft;
    });
    for (const { copy, position, rect } of positioned) {
      if (position !== "sticky") continue;
      const current = copy.getBoundingClientRect();
      copy.style.top = `${rect.top - current.top}px`;
      copy.style.left = `${rect.left - current.left}px`;
    }
  } };
}
