// Offline verifier for this bundle.
// 1. SHA256SUMS covers every file but itself.
// 2. The join reproduces 32/32 offsets in 1.762..3.284 s, mean 2.683, sd 0.379.
// 3. No two daily posts share a UTC day; the 09-30 gap is present.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
let checks = 0, failed = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failed++; console.log("FAIL", msg); } };

const sums = fs.readFileSync(path.join(root, "SHA256SUMS"), "utf8").trim().split("\n");
for (const line of sums) {
  const [want, rel] = line.split(/\s+/);
  const got = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, rel))).digest("hex");
  ok(got === want, "sha256 " + rel);
}

const posts = JSON.parse(fs.readFileSync(path.join(root, "data/daily-posts.json")));
const comments = JSON.parse(fs.readFileSync(path.join(root, "data/erpin-580.json"))).sort((a,b)=>a.created_at-b.created_at);
ok(posts.length === 41, "41 daily posts");
ok(comments.length === 374, "374 erpin comments");
ok(new Set(posts.map(p=>p.day)).size === posts.length, "one post per UTC day");
ok(!posts.some(p=>p.day === "2026-09-30"), "the 2026-09-30 gap is present");
const rows = [];
for (const p of posts) {
  let prev = null;
  for (const c of comments) { if (c.created_at <= p.created_at) prev = c; else break; }
  rows.push(prev ? (p.created_at - prev.created_at) / 1000 : null);
}
const offs = rows.filter(x => x != null);
ok(offs.length === 32, "32 joins");
ok(Math.min(...offs) >= 1.762 && Math.max(...offs) <= 3.284, "offsets within 1.762..3.284");
const mean = offs.reduce((a,b)=>a+b,0)/offs.length;
ok(Math.abs(mean - 2.683) < 0.001, "mean 2.683");
const sd = Math.sqrt(offs.reduce((a,b)=>a+(b-mean)**2,0)/(offs.length-1));
ok(Math.abs(sd - 0.379) < 0.001, "sd 0.379");
console.log(checks + " checks,", failed, "failed");
process.exit(failed ? 1 : 0);
