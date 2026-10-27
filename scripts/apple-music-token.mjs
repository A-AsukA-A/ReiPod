import { createPrivateKey, sign } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/** Run only on the developer machine/CI; the private key never enters Vite. */
export function createDeveloperToken({
  teamId,
  keyId,
  privateKey,
  origins = [],
  now = Math.floor(Date.now() / 1000),
}) {
  if (
    !/^[A-Z0-9]{10}$/.test(teamId ?? "") ||
    !/^[A-Z0-9]{10}$/.test(keyId ?? "")
  )
    throw new Error(
      "Apple Team ID and Key ID must contain 10 uppercase letters/digits.",
    );
  const key = createPrivateKey(privateKey);
  if (key.asymmetricKeyDetails?.namedCurve !== "prime256v1")
    throw new Error("MusicKit requires a P-256 signing key.");
  const allowed = origins.map((origin) => {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      (url.protocol !== "https:" &&
        !["localhost", "127.0.0.1"].includes(url.hostname))
    )
      throw new Error("Use HTTPS origins without a trailing slash/path.");
    return origin;
  });
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = {
    iss: teamId,
    iat: now,
    exp: now + 180 * 86400,
    ...(allowed.length ? { origin: allowed } : {}),
  };
  const input = `${encode({ alg: "ES256", kid: keyId })}.${encode(body)}`;
  return `${input}.${sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const env = process.env;
  let token = env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN || "";
  const privateKey =
    env.APPLE_MUSIC_PRIVATE_KEY ||
    (env.APPLE_MUSIC_PRIVATE_KEY_FILE
      ? await readFile(env.APPLE_MUSIC_PRIVATE_KEY_FILE, "utf8")
      : "");
  if (!token && privateKey)
    token = createDeveloperToken({
      teamId: env.APPLE_MUSIC_TEAM_ID,
      keyId: env.APPLE_MUSIC_KEY_ID,
      privateKey: privateKey.replaceAll("\\n", "\n"),
      origins: (env.APPLE_MUSIC_ORIGINS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
  if (token) {
    if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token))
      throw new Error("Invalid developer token format.");
    const previous = await readFile(".env.production.local", "utf8").catch(
      (error) => {
        if (error.code === "ENOENT") return "";
        throw error;
      },
    );
    const retained = previous
      .split(/\r?\n/)
      .filter((line) => !/^\s*VITE_APPLE_MUSIC_DEVELOPER_TOKEN\s*=/.test(line))
      .join("\n")
      .trimEnd();
    await writeFile(
      ".env.production.local",
      `${retained}${retained ? "\n" : ""}VITE_APPLE_MUSIC_DEVELOPER_TOKEN=${token}\n`,
      { mode: 0o600 },
    );
    console.log(
      "Apple Music developer token prepared for this build; no private key is published.",
    );
  } else
    console.log("Apple Music is unconfigured; local music remains available.");
}
