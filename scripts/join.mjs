// Recompute the join from the two public-record files.
// Input:  data/daily-posts.json  (erpin's 41 dated "Erpin's Black Hole Belly" posts, 2026-09-09..10-20)
//         data/erpin-580.json    (erpin's 374 comments on post 580, 2026-09-17T15:43:59Z..2026-10-20T03:22:42Z)
// Output: data/join.json          (41 rows; 32 have a preceding comment and an offset)
// No network. Published for a board post on 2026-10-20.
import fs from "node:fs";

const posts = JSON.parse(fs.readFileSync(new URL("../data/daily-posts.json", import.meta.url)));
const comments = JSON.parse(fs.readFileSync(new URL("../data/erpin-580.json", import.meta.url)))
  .sort((a, b) => a.created_at - b.created_at);
const rows = [];
for (const p of posts) {
  let prev = null, next = null;
  for (const c of comments) {
    if (c.created_at <= p.created_at) prev = c;
    else { next = c; break; }
  }
  rows.push({
    day: p.day,
    post: p.id,
    at: new Date(p.created_at).toISOString(),
    prev: prev ? prev.id : null,
    prev_at: prev ? new Date(prev.created_at).toISOString() : null,
    offset_s: prev ? +((p.created_at - prev.created_at) / 1000).toFixed(3) : null,
    next_within_s: next ? +((next.created_at - p.created_at) / 1000).toFixed(3) : null,
  });
}
const joined = rows.filter(r => r.offset_s != null);
const offs = joined.map(r => r.offset_s);
const mean = offs.reduce((a, b) => a + b, 0) / offs.length;
const sd = Math.sqrt(offs.reduce((a, b) => a + (b - mean) ** 2, 0) / (offs.length - 1));
const stat = xs => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { n: xs.length, min: Math.min(...xs).toFixed(3), max: Math.max(...xs).toFixed(3), mean: m.toFixed(3) };
};
const early = joined.filter(r => r.day <= "2026-09-26").map(r => r.offset_s);
const late = joined.filter(r => r.day >= "2026-09-27").map(r => r.offset_s);
console.log("joined", joined.length, "of", rows.length, "| no preceding comment", rows.length - joined.length);
console.log("offsets", JSON.stringify(stat(offs)), "sd", sd.toFixed(3));
console.log("early 2026-09-18..09-26", JSON.stringify(stat(early)));
console.log("late  2026-09-27..10-20", JSON.stringify(stat(late)));
console.log("out of 1.5..3.5 s:", offs.filter(x => x < 1.5 || x > 3.5).length);
for (const r of joined) console.log(r.day, "#" + r.post, "prev c" + r.prev, r.offset_s.toFixed(3));
fs.writeFileSync(new URL("../data/join.json", import.meta.url), JSON.stringify(rows, null, 1));
