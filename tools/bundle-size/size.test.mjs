import test from "node:test";
import assert from "node:assert/strict";
import { compare, status } from "./size.mjs";

const size = (gzip) => ({ raw: gzip * 3, gzip, brotli: gzip - 1 });

test("status follows the gzip thresholds", () => {
  assert.equal(status(size(100_000), size(104_000)), "ok");
  assert.equal(status(size(100_000), size(106_000)), "warn");
  assert.equal(status(size(100_000), size(111_000)), "fail");
  assert.equal(status(size(100_000), size(99_000)), "smaller");
  assert.equal(status(size(2_000), size(2_900)), "ok", "under 1 kB is noise");
  assert.equal(status(undefined, size(50_000)), "ok", "new entries pass");
});

test("compare lists only changed entries and reports failures", () => {
  const { markdown, failed, warned } = compare(
    { button: size(10_000), badge: size(5_000), old: size(1_000) },
    { button: size(20_000), badge: size(5_000), card: size(3_000) },
  );
  assert.deepEqual(
    failed.map((row) => row.name),
    ["button"],
  );
  assert.equal(warned.length, 0);
  const changed = markdown.split("<details>")[0];
  assert.match(
    changed,
    /`button` \| 10\.0 kB \| 20\.0 kB \| \+10\.0 kB \(\+100\.0%\)/,
  );
  assert.match(changed, /`card` \| — \| 3\.0 kB \| new/);
  assert.match(changed, /`old` \| 1\.0 kB \| removed/);
  assert.doesNotMatch(changed, /`badge`/);
});
