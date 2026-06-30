// tests/reviews-api.test.js
import { test, expect } from "bun:test";
import { handleReviews } from "../api/reviews.js";

function memKv() {
  const m = new Map();
  return {
    async get(k) { return m.get(k); },
    async set(k, v) { m.set(k, v); },
  };
}

test("submitted review goes to pending; public GET stays empty until approved", async () => {
  const kv = memKv();
  const post = await handleReviews({ method: "POST",
    body: { name: "Sam", rating: 5, text: "No pressure, super helpful demo." } }, kv);
  expect(post.status).toBe(200);
  expect(post.json.ok).toBe(true);
  expect(post.json.pending).toBe(true);

  // public cannot see it yet
  const pub = await handleReviews({ method: "GET" }, kv);
  expect(pub.json.count).toBe(0);

  // admin sees it waiting
  const adminGet = await handleReviews({ method: "GET", isAdmin: true }, kv);
  expect(adminGet.json.pending.length).toBe(1);
  const id = adminGet.json.pending[0].id;

  // approve it
  const appr = await handleReviews({ method: "POST", isAdmin: true, body: { action: "approve", id } }, kv);
  expect(appr.json.ok).toBe(true);

  // now public sees it
  const pub2 = await handleReviews({ method: "GET" }, kv);
  expect(pub2.json.count).toBe(1);
  expect(pub2.json.reviews[0].name).toBe("Sam");
});

test("rejecting a pending review removes it for good", async () => {
  const kv = memKv();
  await handleReviews({ method: "POST", body: { name: "Jo", rating: 4, text: "Friendly and low-key, no pushiness." } }, kv);
  const id = (await handleReviews({ method: "GET", isAdmin: true }, kv)).json.pending[0].id;
  await handleReviews({ method: "POST", isAdmin: true, body: { action: "reject", id } }, kv);
  const adminGet = await handleReviews({ method: "GET", isAdmin: true }, kv);
  expect(adminGet.json.pending.length).toBe(0);
  expect((await handleReviews({ method: "GET" }, kv)).json.count).toBe(0);
});

test("spam (honeypot) is rejected, not stored", async () => {
  const kv = memKv();
  const post = await handleReviews({ method: "POST",
    body: { name: "X", rating: 5, text: "whatever words here", website: "bot" } }, kv);
  expect(post.status).toBe(400);
  expect((await handleReviews({ method: "GET" }, kv)).json.count).toBe(0);
});

test("non-admin cannot approve (action body fails validation, nothing publishes)", async () => {
  const kv = memKv();
  await handleReviews({ method: "POST", body: { name: "Sam", rating: 5, text: "Great demo, no pressure here." } }, kv);
  const id = (await handleReviews({ method: "GET", isAdmin: true }, kv)).json.pending[0].id;
  const sneaky = await handleReviews({ method: "POST", body: { action: "approve", id } }, kv);
  expect(sneaky.status).toBe(400);
  expect((await handleReviews({ method: "GET" }, kv)).json.count).toBe(0);
});
