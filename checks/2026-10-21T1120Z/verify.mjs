#!/usr/bin/env node
// Offline check of the registered 2026-10-21 outcome. No network calls.
// Reads the exact served responses saved in this directory and recomputes the delay.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const dir = path.dirname(new URL(import.meta.url).pathname);
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const post = read("served-post-9551.json");
const comment = read("served-comment-115296.json");
const mod = read("moderation-28828.json");
const anchors = read("anchor-mod-states.json");
const join = JSON.parse(fs.readFileSync(path.join(dir, "../../data/join.json"), "utf8"));

const p = post.post, c = comment.comment, e = mod.event;
const delta = p.created_at - c.created_at;
const iso = (ms) => new Date(ms).toISOString();
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, f))).digest("hex");

const checks = [
  ["post id is 9551", p.id === 9551],
  ["post author is erpin", p.author === "erpin"],
  ["post title is the 2026-10-21 diary", /^Erpin's Black Hole Belly 2026-10-21/.test(p.title)],
  ["post created_at is 1792546249325", p.created_at === 1792546249325],
  ["anchor comment id is 115296", c.id === 115296],
  ["anchor comment is on post 580", c.post_id === 580],
  ["anchor comment author is erpin", c.author === "erpin"],
  ["anchor comment created_at is 1792546246412", c.created_at === 1792546246412],
  ["anchor is the nearest preceding row (0 < delta)", delta > 0],
  ["registered bound: delta <= 3500 ms", delta <= 3500],
  ["moderation 28828 names 115296", String(e.detail).includes("115296")],
  ["moderation 28828 is after the post", e.created_at > p.created_at],
  ["anchor census covers all 32 joined rows", anchors.length === 32],
  ["every anchor is by erpin", anchors.every(a => a.author === "erpin")],
  ["every anchor is collapsed now", anchors.every(a => a.mod_state === "collapsed")],
  ["every anchor offset matches data/join.json", anchors.every(a => {
    const row = join.find(r => r.prev === a.anchor);
    return row && Math.abs(row.offset_s - a.offset_s) < 1e-9;
  })],
];

console.log("registered outcome, 2026-10-21");
console.log("  post      #" + p.id + "  " + iso(p.created_at) + "  " + p.title);
console.log("  anchor    c" + c.id + "  " + iso(c.created_at) + "  post " + c.post_id + "  mod_state " + c.mod_state);
console.log("  delay     " + delta + " ms (" + (delta / 1000).toFixed(3) + " s)  bound <= 3500 ms");
console.log("  verdict   " + (delta > 0 && delta <= 3500 ? "PASS" : "FAIL"));
console.log("  collapse  event " + e.id + " at " + iso(e.created_at) + " (" + ((e.created_at - p.created_at) / 1000).toFixed(3) + " s after the post)");
console.log("  anchors   " + anchors.length + " joined anchors, all now mod_state=collapsed (census: anchor-mod-states.json)");
console.log("");
for (const [name, ok] of checks) console.log((ok ? "ok   " : "FAIL ") + name);
console.log("");
for (const f of ["served-post-9551.json", "served-comment-115296.json", "moderation-28828.json", "anchor-mod-states.json"]) {
  console.log("sha256 " + sha(f) + "  " + f);
}
console.log("");
console.log("This proves the delay for one day. It does not separate a trigger from a shared scheduler,");
console.log("and the slot (first or second comment) was not registered.");

if (!checks.every(([, ok]) => ok)) process.exit(1);
