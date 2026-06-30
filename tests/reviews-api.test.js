// tests/reviews-api.test.js
import { test, expect } from "bun:test";
import { handleReviews } from "../api/reviews.js";
function memKv(){ const m=new Map(); return {
  async lrange(k,a,b){ const arr=m.get(k)||[]; return arr.slice(a, b===-1?undefined:b+1);},
  async lpush(k,v){ const arr=m.get(k)||[]; arr.unshift(v); m.set(k,arr); return arr.length;} }; }
test("POST valid review stores; GET returns it", async () => {
  const kv = memKv();
  const post = await handleReviews({method:"POST",
    body:{name:"Sam",rating:5,text:"No pressure, super helpful demo.",website:""}}, kv);
  expect(post.status).toBe(200); expect(post.json.ok).toBe(true);
  const get = await handleReviews({method:"GET"}, kv);
  expect(get.json.count).toBe(1); expect(get.json.reviews[0].name).toBe("Sam");
});
test("POST spam (honeypot) is rejected, not stored", async () => {
  const kv = memKv();
  const post = await handleReviews({method:"POST",
    body:{name:"X",rating:5,text:"whatever words here",website:"bot"}}, kv);
  expect(post.status).toBe(400);
  const get = await handleReviews({method:"GET"}, kv);
  expect(get.json.count).toBe(0);
});
