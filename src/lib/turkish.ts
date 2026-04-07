export function turkishUpperCase(str: string): string {
  const map: Record<string, string> = {
    'i': 'İ',
    'ı': 'I',
    'ş': 'Ş',
    'ğ': 'Ğ',
    'ü': 'Ü',
    'ö': 'Ö',
    'ç': 'Ç',
  };

  let result = '';
  for (const char of str) {
    result += map[char] || char.toUpperCase();
  }
  return result;
}
