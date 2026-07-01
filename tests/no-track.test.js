// tests/no-track.test.js
// Owner No-Track predicates + Vercel Analytics gating. Pure-function tests
// (no DOM needed) plus a source check that the hardcoded analytics tag was
// replaced by the app.js gated loader.
import { test, expect } from "bun:test";
import { readFileSync, readdirSync } from "fs";
import { noTrackFrom, analyticsAllowedFrom } from "../assets/app.js";

const base = { flag: "", sessionFlag: "", hostname: "cutcowithluke.com", pathname: "/find", search: "", doNotTrack: "" };

test("normal public visitor is tracked + gets analytics", () => {
  expect(noTrackFrom(base)).toBe(false);
  expect(analyticsAllowedFrom(base)).toBe(true);
});

test("localStorage flag excludes the device (custom + analytics)", () => {
  const e = { ...base, flag: "1" };
  expect(noTrackFrom(e)).toBe(true);
  expect(analyticsAllowedFrom(e)).toBe(false);
});

test("sessionStorage flag excludes the device", () => {
  expect(noTrackFrom({ ...base, sessionFlag: "1" })).toBe(true);
});

test("localhost is excluded", () => {
  for (const h of ["localhost", "127.0.0.1", "::1"]) {
    expect(noTrackFrom({ ...base, hostname: h })).toBe(true);
    expect(analyticsAllowedFrom({ ...base, hostname: h })).toBe(false);
  }
});

test("admin routes are excluded", () => {
  for (const p of ["/stats", "/leads", "/moderate", "/admin", "/ops", "/stats/foo"]) {
    expect(noTrackFrom({ ...base, pathname: p })).toBe(true);
    expect(analyticsAllowedFrom({ ...base, pathname: p })).toBe(false);
  }
});

test("a key= URL is excluded", () => {
  expect(noTrackFrom({ ...base, search: "?key=secret" })).toBe(true);
  expect(analyticsAllowedFrom({ ...base, search: "?key=secret" })).toBe(false);
});

test("Do-Not-Track blocks Vercel analytics but not first-party custom tracking", () => {
  const e = { ...base, doNotTrack: "1" };
  expect(noTrackFrom(e)).toBe(false);        // custom /api/track still allowed
  expect(analyticsAllowedFrom(e)).toBe(false); // third-party Vercel blocked
  expect(analyticsAllowedFrom({ ...base, doNotTrack: "yes" })).toBe(false);
});

test("no public page still hardcodes the Vercel analytics tag", () => {
  const admin = new Set(["stats", "leads", "moderate"]);
  const pages = readdirSync(".").filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, ""));
  for (const p of pages) {
    const html = readFileSync(`${p}.html`, "utf8");
    expect(html.includes('src="/_vercel/insights/script.js"')).toBe(false);
  }
});

test("app.js injects the analytics loader (gated)", () => {
  const src = readFileSync("assets/app.js", "utf8");
  expect(src.includes("loadVercelAnalyticsIfAllowed")).toBe(true);
  expect(src.includes("/_vercel/insights/script.js")).toBe(true);
});
