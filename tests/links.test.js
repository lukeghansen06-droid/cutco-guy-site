// tests/links.test.js
import { test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
const pages = ["index","book","find","meet","reviews","faq","work","privacy"];
test("all internal links resolve to a page file", () => {
  const valid = new Set([...pages, ""]); // "" = "/"
  for (const pg of pages) {
    const html = readFileSync(`${pg}.html`, "utf8");
    const hrefs = [...html.matchAll(/href="(\/[a-z-]*)"/g)].map(m => m[1]);
    for (const h of hrefs) {
      const key = h.replace(/^\//, "");
      expect(valid.has(key)).toBe(true); // /book -> "book", / -> ""
    }
  }
  // Scan canonical component files to prevent footer/header drift
  for (const comp of ["components/header.html", "components/footer.html"]) {
    const html = readFileSync(comp, "utf8");
    const hrefs = [...html.matchAll(/href="(\/[a-z-]*)"/g)].map(m => m[1]);
    for (const h of hrefs) {
      const key = h.replace(/^\//, "");
      expect(valid.has(key)).toBe(true);
    }
  }
});
