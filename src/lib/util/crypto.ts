import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/**
 * Versleuteling van opgeslagen documenten (AES-256-GCM).
 * Sleutel: ENCRYPTION_KEY (base64, 32 bytes). In demo-modus valt het systeem terug op
 * een afgeleide demo-sleutel — in productie is ENCRYPTION_KEY verplicht.
 */
function key(): Buffer {
  const env = process.env.ENCRYPTION_KEY;
  if (env) {
    const k = Buffer.from(env, "base64");
    if (k.length !== 32) throw new Error("ENCRYPTION_KEY moet 32 bytes (base64) zijn");
    return k;
  }
  if (process.env.APP_MODE === "production") throw new Error("ENCRYPTION_KEY ontbreekt in productie");
  return createHash("sha256").update("akteloket-demo-sleutel-niet-voor-productie").digest();
}

export function encrypt(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("AK1"), iv, tag, enc]);
}

export function decrypt(blob: Buffer): Buffer {
  if (blob.subarray(0, 3).toString() !== "AK1") return blob;
  const iv = blob.subarray(3, 15);
  const tag = blob.subarray(15, 31);
  const data = blob.subarray(31);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET ?? "akteloket-demo-sessie";
}
