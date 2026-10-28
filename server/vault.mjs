import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { join } from "node:path";

export async function openVault(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const keyPath = join(directory, "key");
  let key;
  try {
    key = await readFile(keyPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    key = randomBytes(32);
    await writeFile(keyPath, key, { flag: "wx", mode: 0o600 });
  }
  if (key.length !== 32) throw new Error("Invalid local music session key");
  const file = join(directory, "sessions.enc");
  let sessions = new Map();
  try {
    const data = await readFile(file);
    const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    sessions = new Map(
      JSON.parse(
        Buffer.concat([
          decipher.update(data.subarray(28)),
          decipher.final(),
        ]).toString(),
      ),
    );
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error("音乐会话文件无法解密，请保留原文件及密钥检查配置");
  }
  let writing = Promise.resolve();
  return {
    key,
    sessions,
    save() {
      const plain = JSON.stringify([...sessions]);
      writing = writing
        .catch(() => {})
        .then(async () => {
          const iv = randomBytes(12);
          const cipher = createCipheriv("aes-256-gcm", key, iv);
          const encrypted = Buffer.concat([
            cipher.update(plain),
            cipher.final(),
          ]);
          await writeFile(
            file + ".tmp",
            Buffer.concat([iv, cipher.getAuthTag(), encrypted]),
            { mode: 0o600 },
          );
          await rename(file + ".tmp", file);
        });
      return writing;
    },
  };
}
