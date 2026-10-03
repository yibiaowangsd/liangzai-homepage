/** Freeze used styles before removing IDs or moving nodes out of their CSS scope. */
export function freezePage(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...source.querySelectorAll<HTMLElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  const sourceRect = source.getBoundingClientRect();
  const positioned: { copy: HTMLElement; position: string; rect: DOMRect }[] = [];
  const pseudoRules: string[] = [];

  // Audit tables can contain hundreds of rows. Only the visible rows can be
  // painted by this viewport-sized overlay; preserve offscreen groups as exact
  // height spacers rather than serializing thousands of invisible cells.
  const omitted = new Set<HTMLElement>();
  const copyByOriginal = new Map(originals.map((original, index) => [original, copies[index]]));
  // Scope windowing to the known collapsed-border, non-spanning audit table.
  const bodies = originals.filter(original => original.tagName === "TBODY" && original.id === "audit-rows");
  for (const body of bodies) {
    const rows = Array.from(body.children).filter(child => child.tagName === "TR") as HTMLTableRowElement[];
    // A spanning cell can begin outside the viewport but paint inside it.
    if (rows.some(row => Array.from(row.cells).some(cell => cell.rowSpan !== 1))) continue;
    const columns = Math.max(1, ...rows.map(row => Array.from(row.cells).reduce((count, cell) => count + cell.colSpan, 0)));
    let spacer: HTMLTableRowElement | undefined;
    let spacerHeight = 0;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      // Small overscan keeps partially visible borders at the viewport edges.
      const visible = rect.height > 0 && rect.top < innerHeight + 64 && rect.top + rect.height > -64;
      if (visible) { spacer = undefined; spacerHeight = 0; continue; }
      const copy = copyByOriginal.get(row)!;
      if (!spacer) {
        spacer = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = columns;
        cell.style.cssText = "padding:0!important;border:0!important;line-height:0;font-size:0";
        spacer.append(cell);
        spacer.setAttribute("aria-hidden", "true");
        spacer.style.cssText = "visibility:hidden;pointer-events:none";
        copy.before(spacer);
      }
      spacerHeight += rect.height;
      spacer.style.height = `${spacerHeight}px`;
      spacer.cells[0].style.height = `${spacerHeight}px`;
      copy.remove();
      omitted.add(row);
      for (const descendant of row.querySelectorAll<HTMLElement>("*")) omitted.add(descendant);
    }
  }

  originals.forEach((original, index) => {
    if (omitted.has(original)) return;
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
      if (omitted.has(original)) return;
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
