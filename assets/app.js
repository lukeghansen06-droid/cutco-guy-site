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

  // --- Owner No-Track Mode -------------------------------------------------
  // Keeps owner/admin/local devices out of the custom /api/track analytics.
  // Opt-in with ?notrack=1 or ?ownerNoTrack=1 (persisted to localStorage), or
  // automatically on localhost + admin routes (/stats,/leads,/moderate,/admin,/ops)
  // or any URL carrying key=. Sensitive query params are stripped from the URL.
  (function () {
    var FLAG = "cutco_owner_no_track";
    try {
      var url = new URL(location.href);
      var qp = url.searchParams;
      if (qp.get("notrack") === "1" || qp.get("ownerNoTrack") === "1") {
        try { localStorage.setItem(FLAG, "1"); } catch (e) {}
      }
      var dirty = false;
      ["key", "token", "admin", "notrack", "ownerNoTrack"].forEach(function (p) {
        if (qp.has(p)) { qp.delete(p); dirty = true; }
      });
      if (dirty && history.replaceState) {
        history.replaceState(null, "", url.pathname + (qp.toString() ? "?" + qp.toString() : "") + url.hash);
      }
    } catch (e) {}

    function computeNoTrack() {
      try { if (localStorage.getItem(FLAG) === "1") return true; } catch (e) {}
      var h = location.hostname;
      if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "") return true;
      if (/^\/(stats|leads|moderate|admin|ops)(\/|$)/i.test(location.pathname)) return true;
      if (/[?&]key=/i.test(location.search)) return true;
      return false;
    }
    window.__cutcoNoTrack = computeNoTrack();
    // Tiny API used by the /stats Owner No-Track card.
    window.CutcoOwnerTrack = {
      isExcluded: function () { try { return localStorage.getItem(FLAG) === "1"; } catch (e) { return false; } },
      isLocal: function () { var h = location.hostname; return h === "localhost" || h === "127.0.0.1" || h === "::1"; },
      exclude: function () { try { localStorage.setItem(FLAG, "1"); } catch (e) {} window.__cutcoNoTrack = true; },
      enable: function () { try { localStorage.removeItem(FLAG); } catch (e) {} window.__cutcoNoTrack = computeNoTrack(); },
    };
  })();

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
      if (window.__cutcoNoTrack) return; // Owner No-Track Mode
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

  // --- Service worker: register the fresh (network-first) SW, replace any stale
  //     one, and reload once when the new version takes control. ---
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then((reg) => { reg.update(); }).catch(() => {});
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
      });
    });
  }
}
