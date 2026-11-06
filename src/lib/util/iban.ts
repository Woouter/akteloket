/** IBAN-validatie (ISO 13616, mod-97) met NL-specifieke lengtecontrole. */
export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function validateIban(input: string): { valid: boolean; reason?: string; bank?: string } {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return { valid: false, reason: "Ongeldig IBAN-formaat" };
  if (iban.startsWith("NL") && iban.length !== 18) return { valid: false, reason: "Een Nederlands IBAN heeft 18 tekens" };
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of numeric) remainder = (remainder * 10 + Number(ch)) % 97;
  if (remainder !== 1) return { valid: false, reason: "Het controlecijfer klopt niet, controleer het nummer" };
  const bankCode = iban.startsWith("NL") ? iban.slice(4, 8) : undefined;
  return { valid: true, bank: bankCode ? NL_BANKS[bankCode] : undefined };
}

const NL_BANKS: Record<string, string> = {
  ABNA: "ABN AMRO", RABO: "Rabobank", INGB: "ING", SNSB: "SNS", ASNB: "ASN Bank", RBRB: "RegioBank",
  TRIO: "Triodos Bank", KNAB: "Knab", BUNQ: "bunq", REVO: "Revolut", FVLB: "Van Lanschot", NNBA: "Nationale-Nederlanden",
};
