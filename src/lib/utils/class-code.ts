/**
 * Mã lớp 6 ký tự. Bỏ 0 O 1 I L để không nhầm khi giáo viên đọc cho học sinh chép.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateClassCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const isValidClassCode = (code: string) =>
  new RegExp(`^[${ALPHABET}]{6}$`).test(code.toUpperCase());
