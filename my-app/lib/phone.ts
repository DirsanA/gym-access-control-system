/**
 * Ethiopian phone number utilities.
 * Handles standard 09xx / 07xx formats, normalizing +251 / 251 prefixes to 09 / 07.
 */

export function normalizePhoneNumber(raw: string | null | undefined): string {
  if (!raw) return "";

  // Remove whitespace, dashes, parens, dots
  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, "");

  // Convert international +251 or 251 to standard local 0 format
  if (cleaned.startsWith("+251")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("251") && cleaned.length >= 12) {
    cleaned = "0" + cleaned.slice(3);
  }

  // If user entered 9 digits starting with 9 or 7 (e.g. 911223344), prepend leading 0
  if (/^[79]\d{8}$/.test(cleaned)) {
    cleaned = "0" + cleaned;
  }

  return cleaned;
}

export function isValidEthiopianPhone(raw: string | null | undefined): boolean {
  const normalized = normalizePhoneNumber(raw);
  // Must be 10 digits starting with 09 or 07
  return /^0[79]\d{8}$/.test(normalized);
}

export function formatEthiopianPhone(raw: string | null | undefined): string {
  const norm = normalizePhoneNumber(raw);
  if (norm.length === 10) {
    // Format as 0911 234 567
    return `${norm.slice(0, 4)} ${norm.slice(4, 7)} ${norm.slice(7)}`;
  }
  return raw || "";
}

