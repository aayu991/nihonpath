import fs from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const expected = JSON.parse(
    fs.readFileSync("supabase/migrations.manifest.json", "utf8"),
  ),
  files = fs
    .readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();
assert.deepEqual(
  files,
  Object.keys(expected).sort(),
  "Migration files changed: append/version and review the manifest intentionally",
);
const versions = new Set();
for (const file of files) {
  assert(/^\d{12}_[a-z0-9_]+\.sql$/.test(file), file);
  const version = file.split("_")[0];
  assert(!versions.has(version), "Duplicate migration version");
  versions.add(version);
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync("supabase/migrations/" + file))
      .digest("hex"),
    expected[file],
    `Historical SQL changed: ${file}`,
  );
}
console.log(
  `${files.length} versioned migration checksums match the reviewed manifest. No SQL was applied.`,
);
