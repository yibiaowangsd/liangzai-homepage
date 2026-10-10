import { normalizeSearchQuery, searchPublishedNews } from '/assets/news-search.js?v=20261010-article-search';

// Settings stay in a small dropdown; full-site navigation belongs to search.
const trigger = document.querySelector(".menu-toggle");
const source = document.querySelector(".site-nav");
if (trigger && source) {
  const settings = document.createElement("div");
  settings.className = "site-settings";
  trigger.before(settings);
  settings.append(trigger);
  const panel = document.createElement("section");
  panel.id = "practice-settings-panel";
  panel.className = "site-settings-panel";
  panel.setAttribute("aria-label", "显示设置");
  panel.hidden = true;
  const title = document.createElement("h2");
  title.textContent = "显示设置";
  const themeRow = document.createElement("div");
  themeRow.className = "settings-row";
  const themeLabel = document.createElement("span");
  themeLabel.textContent = "页面主题";
  themeRow.append(themeLabel, document.querySelector("#practice-preferences").content.cloneNode(true));
  themeRow.querySelector("select").value = document.documentElement.dataset.themePreference || "paper";
  const motionRow = document.createElement("div");
  motionRow.className = "settings-row";
  const motionLabel = document.createElement("span");
  motionLabel.textContent = "页面动效";
  const motion = document.createElement("button");
  motion.type = "button";
  motion.className = "settings-motion";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function savedPause() {
    try { return localStorage.getItem("liangzai-motion") === "paused"; } catch { return false; }
  }
  function syncMotion() {
    const paused = savedPause() || reducedMotion.matches;
    motion.textContent = paused ? "开启动效" : "暂停动效";
    motion.setAttribute("aria-pressed", String(paused));
  }
  motion.addEventListener("click", () => {
    try { localStorage.setItem("liangzai-motion", savedPause() ? "active" : "paused"); } catch { /* Storage can be unavailable. */ }
    window.dispatchEvent(new Event("liangzai:motion-change"));
    syncMotion();
  });
  window.addEventListener("liangzai:motion-change", syncMotion);
  window.addEventListener("storage", syncMotion);
  reducedMotion.addEventListener("change", syncMotion);
  syncMotion();
  motionRow.append(motionLabel, motion);
  const note = document.createElement("p");
  note.textContent = "动效同时遵循系统的减少动态效果设置。";
  panel.append(title, themeRow, motionRow, note);
  settings.append(panel);
  function setSettingsOpen(open) {
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  }
  trigger.addEventListener("click", () => setSettingsOpen(panel.hidden));
  trigger.addEventListener("keydown", event => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    setSettingsOpen(true);
    panel.querySelector("select").focus();
  });
  document.addEventListener("pointerdown", event => {
    if (!settings.contains(event.target)) setSettingsOpen(false);
  });
  document.addEventListener("focusin", event => {
    if (!settings.contains(event.target)) setSettingsOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      setSettingsOpen(false);
      trigger.focus();
    }
  });
  document.addEventListener("liangzai:close-settings", () => setSettingsOpen(false));
  document.addEventListener("liangzai:close-directory", () => setSettingsOpen(false));

  const searchTrigger = document.querySelector(".jump-trigger");
  const menu = document.createElement("dialog");
  menu.id = "practice-search-dialog";
  menu.className = "practice-mobile-menu";
  menu.setAttribute("aria-label", "搜索全站");
  const heading = document.createElement("div");
  heading.className = "practice-menu-top";
  const name = document.createElement("span");
  name.textContent = "搜索全站";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "关闭 ×";
  close.setAttribute("aria-label", "关闭搜索");
  heading.append(name, close);
  const nav = source.cloneNode(true);
  nav.className = "";
  nav.setAttribute("aria-label", "栏目导航");
  const search = document.createElement("label");
  search.className = "practice-search";
  search.textContent = "搜索全站";
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "搜索文章、算法或栏目，如 AWS、ML-KEM";
  input.maxLength = 120;
  search.append(input);
  const feedback = document.createElement('p');
  feedback.className = 'practice-search-status';
  feedback.setAttribute('role', 'status');
  const articles = document.createElement('nav');
  articles.className = 'practice-news-results';
  articles.setAttribute('aria-label', '新闻文章');
  let searchTimer, searchController;
  function stopSearch() {
    clearTimeout(searchTimer);
    searchController?.abort();
  }
  function updateSearch() {
    stopSearch();
    const query = normalizeSearchQuery(input.value);
    nav.querySelectorAll('a').forEach(link => { link.hidden = !link.textContent.toLowerCase().includes(query.toLowerCase()); });
    const destinations = nav.querySelectorAll('a:not([hidden])').length;
    articles.replaceChildren();
    articles.hidden = true;
    feedback.textContent = query ? '正在搜索新闻…' : '所有栏目';
    if (!query) return;
    const controller = new AbortController();
    searchController = controller;
    searchTimer = setTimeout(async () => {
      try {
        const { results, total } = await searchPublishedNews(query, { signal: controller.signal });
        if (controller.signal.aborted || !opened) return;
        feedback.textContent = `${total > results.length ? `显示 ${results.length} / ${total}` : results.length} 篇新闻 · ${destinations} 个栏目`;
        if (!results.length && !destinations) feedback.textContent = '没有找到匹配的文章或栏目。试试其他关键词。';
        if (results.length) {
          articles.hidden = false;
          const title = document.createElement('h3');
          title.textContent = '新闻文章';
          articles.append(title);
          for (const item of results) {
            const link = document.createElement('a');
            link.href = item.href;
            const name = document.createElement('strong');
            name.textContent = item.name;
            const detail = document.createElement('small');
            detail.textContent = [item.date, item.source].filter(Boolean).join(' · ');
            const summary = document.createElement('span');
            summary.textContent = item.description;
            link.append(name, detail, summary);
            articles.append(link);
          }
        }
      } catch {
        if (!controller.signal.aborted && opened) feedback.textContent = '新闻搜索暂时不可用，可继续浏览栏目';
      }
    }, 250);
  }
  input.addEventListener('input', updateSearch);
  menu.append(heading, search, feedback, articles, nav);
  document.body.append(menu);
  let opened = false;
  let previousOverflow = "";
  let previousFocus = searchTrigger;
  function setSearchOpen(open) {
    if (opened === open) return;
    opened = open;
    if (open) {
      setSettingsOpen(false);
      input.value = '';
      updateSearch();
      previousFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (typeof menu.showModal === "function") menu.showModal();
      else menu.setAttribute("open", "");
      input.focus();
    } else {
      stopSearch();
      if (typeof menu.close === "function") menu.close();
      else menu.removeAttribute("open");
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    }
  }
  document.addEventListener("liangzai:close-directory", () => setSearchOpen(false));
  searchTrigger?.addEventListener("click", () => setSearchOpen(true));
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !document.querySelector("dialog[open]")) {
      event.preventDefault();
      setSearchOpen(true);
    }
  });
  close.addEventListener("click", () => setSearchOpen(false));
  menu.addEventListener("cancel", event => {
    event.preventDefault();
    setSearchOpen(false);
  });
  menu.addEventListener("close", () => setSearchOpen(false));
  menu.addEventListener("click", event => {
    if (event.target.closest("a")) setSearchOpen(false);
  });
  menu.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      setSearchOpen(false);
    }
    const links = [...menu.querySelectorAll('a:not([hidden])')];
    if (event.key === 'Enter' && event.target === input && links.length) {
      event.preventDefault();
      links[0].click();
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && links.length) {
      event.preventDefault();
      const index = links.indexOf(document.activeElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % links.length : index <= 0 ? links.length - 1 : index - 1;
      links[next].focus();
    }
    if (event.key !== "Tab") return;
    const items = [...menu.querySelectorAll("button, input, a:not([hidden])")];
    if (event.shiftKey && document.activeElement === items[0]) {
      event.preventDefault();
      items.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
      event.preventDefault();
      items[0].focus();
    }
  });
}
