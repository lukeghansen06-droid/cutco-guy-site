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

    // --- Sticky mobile bar: upgrade the single "Book" bar into Book + Text Luke ---
    const bar = document.querySelector(".book-bar");
    if (bar && !document.querySelector(".mobile-cta")) {
      const wrap = document.createElement("div");
      wrap.className = "mobile-cta";
      wrap.innerHTML =
        '<a class="btn btn-primary" href="/book" data-ev="mobile_sticky_book_click">Book a Demo</a>' +
        '<a class="btn btn-ghost" href="sms:+13126594280" data-ev="text_luke_click">Text Luke</a>';
      bar.replaceWith(wrap);
    }

    // --- Lightweight event tracking: any [data-ev] click pings /api/track ---
    document.addEventListener("click", (e) => {
      const el = e.target.closest && e.target.closest("[data-ev]");
      if (!el) return;
      try {
        const body = JSON.stringify({ t: "ev", l: el.getAttribute("data-ev") });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
        } else {
          fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
        }
      } catch (_) {}
    }, { passive: true });
  });
}
