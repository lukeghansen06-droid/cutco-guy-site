// tests/recommender.test.js
import { test, expect } from "bun:test";
import { recommend } from "../lib/recommender.js";

test("heavy cook, big household, best budget -> top set + full ranked list", () => {
  const r = recommend({ cook: "lots", household: "5+", purpose: "self", budget: "best", owns: false });
  expect(r.tier).toBe("best");
  expect(r.label).toBe("The Full Setup");
  expect(r.ranked.length).toBe(3);
  expect(r.ranked[0].sku).toBeDefined();
  expect(r.ranked[0].why.length).toBeGreaterThan(10);
});

test("gift + starter budget -> giftable starter", () => {
  const r = recommend({ cook: "some", household: "2-4", purpose: "gift", budget: "starter", owns: false });
  expect(r.tier).toBe("starter");
  expect(r.label).toBe("The Gift Buyer");
});

test("already owns -> owner upgrade; complements, never a duplicate set", () => {
  const r = recommend({ cook: "some", household: "2-4", purpose: "self", budget: "mid", owns: true });
  expect(r.id).toBe("complement-knife");
  expect(r.label).toBe("The Owner Upgrade");
});

test("barely cooks -> small essentials, and every pick has a name + sku", () => {
  const r = recommend({ cook: "barely", household: "1", purpose: "self", budget: "mid", owns: false });
  expect(r.tier).not.toBe("best");
  expect(r.ranked.every((p) => p.name && p.sku)).toBe(true);
});
