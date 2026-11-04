import { randomBytes, randomUUID, createHash } from "node:crypto";

export const uid = () => randomUUID();
export const token = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (input: string | Buffer) => createHash("sha256").update(input).digest("hex");
export const shortId = () => randomBytes(4).toString("hex");

/** Dossierreferentie, bijv. AK-2026-4821. */
export function dossierReference(): string {
  const year = new Date().getFullYear();
  const n = 1000 + (randomBytes(2).readUInt16BE(0) % 9000);
  return `AK-${year}-${n}`;
}
