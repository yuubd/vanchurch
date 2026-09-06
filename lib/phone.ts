// Inserts dashes as the user types digits (e.g. "7788683636" -> "778-868-3636"), so a
// TextInput can just wire this into onChangeText without the user typing dashes themselves.
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  return [area, prefix, line].filter(Boolean).join('-');
}
