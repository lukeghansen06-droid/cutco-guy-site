// tests/lead-api.test.js
import { test, expect } from "bun:test";
import { handleLead } from "../api/lead.js";
function memKv(){ const m=new Map(); return {
  async lpush(k,v){ const a=m.get(k)||[]; a.unshift(v); m.set(k,a); return a.length;},
  async lrange(k,a,b){ const arr=m.get(k)||[]; return arr.slice(a,b===-1?undefined:b+1);} , _m:m }; }
test("valid lead is stored; email sender called", async () => {
  const kv = memKv(); let sent=null;
  const out = await handleLead({method:"POST",
    body:{name:"Pat",contact:"p@x.com",contactType:"email",when:"evening",note:"",website:""}},
    kv, async (lead)=>{ sent=lead; });
  expect(out.status).toBe(200); expect(out.json.ok).toBe(true);
  expect(sent.name).toBe("Pat"); expect((kv._m.get("leads:v1")||[]).length).toBe(1);
});
test("honeypot lead rejected, not stored/sent", async () => {
  const kv = memKv(); let sent=false;
  const out = await handleLead({method:"POST",
    body:{name:"X",contact:"p@x.com",contactType:"email",when:"x",website:"bot"}},
    kv, async ()=>{ sent=true; });
  expect(out.status).toBe(400); expect(sent).toBe(false);
});
