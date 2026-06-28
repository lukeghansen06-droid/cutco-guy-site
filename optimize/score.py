#!/usr/bin/env python3
# ===========================================================================
#  LOCKED SCORING FILE  —  Auto Research Engineer
#  Prints estimated homepage LOAD TIME in milliseconds. LOWER = BETTER.
#  The optimizer may READ this to score; it must NEVER edit it.
#  Only the human (Luke) owns this definition of "better".
# ===========================================================================
import os, re, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                 # cutco-guy-site/
HTML = os.path.join(ROOT, "index.html")

# --- consistent load model (mobile-ish) ---
BANDWIDTH_BPS   = 5_000_000 / 8              # ~5 Mbps -> bytes/sec
RTT_MS          = 60                         # latency per critical request
RENDER_BLOCK_MS = 120                        # penalty per render-blocking resource in <head>
FONT_MS         = 150                        # external font stylesheet penalty
DEFERRED_WEIGHT = 0.15                       # lazy / JS-loaded image bytes are mostly off critical path

# --- structural guard: these MUST stay present (no winning by deletion) ---
REQUIRED_MARKERS = [
    "calendly.com/lukehansen01", "Book",         # booking CTA
    "_vercel/insights/script.js",                # analytics
    "application/ld+json", "<title", "manifest.json",
    "brand-banner.jpg", "family.jpg",            # key imagery referenced
]
REQUIRED_IMAGES = ["brand-banner.jpg","family.jpg","family-2.jpg","family-mom-willow.jpg"]
MIN_IMG_BYTES   = 9000                        # an honest optimized web JPEG won't be tinier

def fail(reason):
    print(json.dumps({"score": 1e9, "valid": False, "reason": reason})); sys.exit(0)

html = open(HTML, encoding="utf-8", errors="replace").read()
for m in REQUIRED_MARKERS:
    if m not in html: fail("missing required marker: %r" % m)

html_bytes = len(html.encode("utf-8"))

# every local image referenced anywhere in the file
refs = re.findall(r'(?:src|href)\s*=\s*"([^"]+\.(?:jpg|jpeg|png|webp))"', html, re.I)
refs += re.findall(r"url\(\s*['\"]?([^)'\"]+\.(?:jpg|jpeg|png|webp))", html, re.I)
refs += re.findall(r'["\']([A-Za-z0-9_\-]+\.(?:jpg|jpeg|png|webp))["\']', html)  # JS string refs
refs = [r.split("/")[-1] for r in refs if not r.startswith("data:") and "http" not in r]
refs = list(dict.fromkeys(refs))

# static <img> tags -> is each eager or lazy?
lazy = set()
static_eager = set()
for tag in re.findall(r'<img\b[^>]*>', html, re.I):
    m = re.search(r'src\s*=\s*"([^"]+)"', tag)
    if not m: continue
    fn = m.group(1).split("/")[-1]
    if re.search(r'loading\s*=\s*"lazy"', tag, re.I): lazy.add(fn)
    else: static_eager.add(fn)
# CSS background images are eager (critical)
for u in re.findall(r"url\(\s*['\"]?([^)'\"]+\.(?:jpg|jpeg|png|webp))", html, re.I):
    static_eager.add(u.split("/")[-1])

crit_bytes = 0; defer_bytes = 0; crit_requests = 0
for fn in refs:
    p = os.path.join(ROOT, fn)
    if not os.path.exists(p): continue
    b = os.path.getsize(p)
    if fn in REQUIRED_IMAGES and b < MIN_IMG_BYTES:
        fail("image over-compressed below quality floor: %s (%d bytes)" % (fn, b))
    if fn in static_eager and fn not in lazy:
        crit_bytes += b; crit_requests += 1
    else:
        defer_bytes += b

# render-blocking resources in <head>
head = html.split("</head>")[0]
rb = 0
for s in re.findall(r'<script\b[^>]*>', head, re.I):
    sl = s.lower()
    if 'src=' not in sl and 'application/ld+json' not in sl: rb += 1      # inline blocking script
    elif 'src=' in sl and 'defer' not in sl and 'async' not in sl: rb += 1
rb += len(re.findall(r'<link\b[^>]*rel="stylesheet"', head, re.I))
fonts = len(re.findall(r'fonts\.googleapis\.com[^"]*?css', head, re.I))

transfer_ms = (html_bytes + crit_bytes + DEFERRED_WEIGHT*defer_bytes) / BANDWIDTH_BPS * 1000.0
latency_ms  = RTT_MS * (1 + crit_requests)
blocking_ms = rb * RENDER_BLOCK_MS + fonts * FONT_MS
score = transfer_ms + latency_ms + blocking_ms

print(json.dumps({
  "score": round(score, 1), "valid": True,
  "breakdown": {
    "html_kb": round(html_bytes/1024,1),
    "critical_image_kb": round(crit_bytes/1024,1),
    "deferred_image_kb": round(defer_bytes/1024,1),
    "critical_requests": crit_requests,
    "render_blocking": rb, "font_links": fonts,
    "transfer_ms": round(transfer_ms,1), "latency_ms": latency_ms, "blocking_ms": blocking_ms
  }}))
