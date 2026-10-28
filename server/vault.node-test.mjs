import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openVault } from "./vault.mjs";

test("session cookies survive restart encrypted and corrupted state fails closed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reipod-vault-"));
  try {
    const vault = await openVault(dir);
    vault.sessions.set("fixture-token", {
      source: "netease",
      cookie: "private-fixture-cookie",
    });
    await vault.save();
    const encrypted = await readFile(join(dir, "sessions.enc"));
    assert.equal(
      encrypted.includes(Buffer.from("private-fixture-cookie")),
      false,
    );
    const restored = await openVault(dir);
    assert.equal(
      restored.sessions.get("fixture-token").cookie,
      "private-fixture-cookie",
    );
    encrypted[encrypted.length - 1] ^= 1;
    await writeFile(join(dir, "sessions.enc"), encrypted);
    await assert.rejects(openVault(dir), /无法解密/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
