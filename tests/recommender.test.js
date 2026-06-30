// tests/recommender.test.js
import { test, expect } from "bun:test";
import { recommend } from "../lib/recommender.js";
test("heavy cook, big household, best budget -> top set", () => {
  const r = recommend({cook:"lots",household:"5+",purpose:"self",budget:"best",owns:false});
  expect(r.tier).toBe("best");
  expect(r.id).toBeDefined(); expect(r.why.length).toBeGreaterThan(10);
});
test("gift + starter budget -> giftable starter", () => {
  const r = recommend({cook:"some",household:"2-4",purpose:"gift",budget:"starter",owns:false});
  expect(r.tier).toBe("starter");
});
test("already owns -> recommends a complement, never a full duplicate set", () => {
  const r = recommend({cook:"some",household:"2-4",purpose:"self",budget:"mid",owns:true});
  expect(r.id).toBe("complement-knife");
});
test("barely cooks -> a small essential, not a full set", () => {
  const r = recommend({cook:"barely",household:"1",purpose:"self",budget:"mid",owns:false});
  expect(r.tier).not.toBe("best");
});
