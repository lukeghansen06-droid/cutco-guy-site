// tests/validate.test.js
import { test, expect } from "bun:test";
import { validateReview, validateLead } from "../lib/validate.js";
test("rejects honeypot-filled review", () =>
  expect(validateReview({name:"A",rating:5,text:"Great knives, loved the demo!",website:"bot"}).ok).toBe(false));
test("rejects too-short review text", () =>
  expect(validateReview({name:"A",rating:5,text:"ok",website:""}).ok).toBe(false));
test("rejects link spam in review", () =>
  expect(validateReview({name:"A",rating:5,text:"buy now http://spam.example",website:""}).ok).toBe(false));
test("accepts a clean review and trims", () => {
  const r = validateReview({name:"  Luke ",rating:5,text:"Honestly the best demo, no pressure at all.",website:""});
  expect(r.ok).toBe(true); expect(r.clean.name).toBe("Luke"); expect(r.clean.rating).toBe(5);
});
test("rejects bad rating", () =>
  expect(validateReview({name:"A",rating:9,text:"good enough words here",website:""}).ok).toBe(false));
test("lead needs a contact", () =>
  expect(validateLead({name:"A",contact:"",contactType:"email",when:"evening",website:""}).ok).toBe(false));
test("lead accepts valid email", () => {
  const r = validateLead({name:"A",contact:"a@b.com",contactType:"email",when:"evening",note:"",website:""});
  expect(r.ok).toBe(true);
});
test("lead rejects honeypot", () =>
  expect(validateLead({name:"A",contact:"a@b.com",contactType:"email",when:"x",website:"bot"}).ok).toBe(false));
