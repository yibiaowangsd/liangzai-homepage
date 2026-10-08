// Same all-screen directory as the React shell; laboratory navigation stays a document navigation.
const trigger = document.querySelector(".menu-toggle");
const source = document.querySelector(".site-nav");
if (trigger && source) {
  const menu = document.createElement("dialog");
  menu.id = "practice-mobile-menu";
  menu.className = "practice-mobile-menu";
  menu.setAttribute("aria-label", "设置与目录");
  const heading = document.createElement("div");
  heading.className = "practice-menu-top";
  const name = document.createElement("span");
  name.textContent = "Yibiao / 密码工程与实验";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "关闭 ×";
  close.setAttribute("aria-label", "关闭设置与目录");
  heading.append(name, close);
  const nav = document.querySelector("#practice-directory").content.firstElementChild.cloneNode(true);
  nav.className = "";
  nav.setAttribute("aria-label", "全站导航");
  const preferences = document.createElement("div");
  preferences.className = "site-preferences";
  preferences.append(document.querySelector("#practice-preferences").content.cloneNode(true));
  const search = document.createElement("label");
  search.className = "practice-search";
  search.textContent = "搜索全站";
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "搜索算法、新闻或角色";
  search.append(input);
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    nav.querySelectorAll("a").forEach(link => { link.hidden = !link.textContent.toLowerCase().includes(query); });
  });
  menu.append(heading, preferences, search, nav);
  document.body.append(menu);
  let opened = false,
    previousOverflow = "";
  function setOpen(open) {
    if (opened === open) return;
    opened = open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (typeof menu.showModal === "function") menu.showModal();
      else menu.setAttribute("open", "");
      close.focus();
    } else {
      if (typeof menu.close === "function") menu.close();
      else menu.removeAttribute("open");
      document.body.style.overflow = previousOverflow;
      trigger.focus();
    }
  }
  document.addEventListener("liangzai:close-directory", () => setOpen(false));
  trigger.addEventListener("click", () => setOpen(!opened));
  document.querySelector(".jump-trigger")?.addEventListener("click", () => { setOpen(true); input.focus(); });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !document.querySelector("dialog[open]")) {
      event.preventDefault(); setOpen(true); input.focus();
    }
  });
  close.addEventListener("click", () => setOpen(false));
  menu.addEventListener("cancel", (event) => {
    event.preventDefault();
    setOpen(false);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
    if (event.key !== "Tab") return;
    const items = [...menu.querySelectorAll("button, select, input, a:not([hidden])")];
    if (event.shiftKey && document.activeElement === items[0]) {
      event.preventDefault();
      items.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
      event.preventDefault();
      items[0].focus();
    }
  });
}
