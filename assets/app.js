export function activeNav(pathname) {
  const p = (pathname || "/").replace(/\.html$/, "").replace(/\/$/, "") || "/";
  const map = { "/":"home", "/index":"home", "/book":"book", "/find":"find",
                "/meet":"meet", "/reviews":"reviews", "/faq":"faq" };
  return map[p] || "";
}
// Browser-only enhancements run when there's a document:
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const key = activeNav(location.pathname);
    document.querySelectorAll("[data-nav]").forEach(a =>
      a.toggleAttribute("aria-current", a.dataset.nav === key));
    const burger = document.querySelector("[data-burger]");
    const menu = document.querySelector("[data-menu]");
    if (burger && menu) burger.addEventListener("click", () => {
      const open = menu.toggleAttribute("data-open");
      burger.setAttribute("aria-expanded", String(open));
    });
  });
}
