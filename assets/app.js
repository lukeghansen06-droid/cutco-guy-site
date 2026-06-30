export function activeNav(pathname) {
  const p = (pathname || "/").replace(/\.html$/, "").replace(/\/$/, "") || "/";
  const map = { "/":"home", "/index":"home", "/book":"book", "/find":"find",
                "/meet":"meet", "/reviews":"reviews", "/faq":"faq" };
  return map[p] || "";
}

// Browser-only enhancements run when there's a document:
if (typeof document !== "undefined") {
  // Mark JS as available as early as possible (used by CSS reveal fallback).
  document.documentElement.classList.add("js");

  document.addEventListener("DOMContentLoaded", () => {
    // --- Active nav highlight ---
    const key = activeNav(location.pathname);
    document.querySelectorAll("[data-nav]").forEach(a => {
      a.dataset.nav === key
        ? a.setAttribute("aria-current", "page")
        : a.removeAttribute("aria-current");
    });

    // --- Footer year ---
    const y = document.getElementById("footer-year");
    if (y) y.textContent = new Date().getFullYear();

    // --- Mobile menu toggle ---
    const burger = document.querySelector("[data-burger]");
    const menu = document.querySelector("[data-menu]");
    if (burger && menu) burger.addEventListener("click", () => {
      const open = menu.toggleAttribute("data-open");
      burger.setAttribute("aria-expanded", String(open));
    });

    // --- Scroll reveal (adds .in to .reveal / .stagger when they enter view) ---
    const reveals = document.querySelectorAll(".reveal, .stagger");
    const reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reveals.length) {
      if (reduce || !("IntersectionObserver" in window)) {
        reveals.forEach(el => el.classList.add("in"));
      } else {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
        reveals.forEach(el => io.observe(el));
        // Safety net: if anything is still hidden after 2.5s, just show it.
        setTimeout(() => reveals.forEach(el => el.classList.add("in")), 2500);
      }
    }

    // --- Cursor spotlight glow (desktop, pointer devices only) ---
    if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce) {
      const spot = document.createElement("div");
      spot.className = "cursor-spot";
      spot.setAttribute("aria-hidden", "true");
      document.body.appendChild(spot);
      let raf = 0;
      addEventListener("pointermove", (ev) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          spot.style.setProperty("--mx", ev.clientX + "px");
          spot.style.setProperty("--my", ev.clientY + "px");
          raf = 0;
        });
      }, { passive: true });
    }
  });
}
