import { expect, test } from "vitest";
import { generateKeyPairSync, verify } from "node:crypto";
import { createDeveloperToken } from "./apple-music-token.mjs";
test("developer tokens carry an origin restriction and a real ES256/P1363 signature", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const value = createDeveloperToken({
    teamId: "ABCDEFGHIJ",
    keyId: "0123456789",
    privateKey,
    origins: ["https://example.com"],
    now: 100000,
  });
  const [head, body, signature] = value.split(".");
  expect(JSON.parse(Buffer.from(head, "base64url"))).toEqual({
    alg: "ES256",
    kid: "0123456789",
  });
  expect(JSON.parse(Buffer.from(body, "base64url"))).toEqual({
    iss: "ABCDEFGHIJ",
    iat: 100000,
    exp: 100000 + 180 * 86400,
    origin: ["https://example.com"],
  });
  expect(
    verify(
      "sha256",
      Buffer.from(`${head}.${body}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url"),
    ),
  ).toBe(true);
  expect(value).not.toContain("PRIVATE KEY");
});
