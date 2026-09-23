/**
 * Latin kebab-case slug from a Russian (or Latin) name — the backend
 * requires every `code` to match `^[a-z0-9]+(-[a-z0-9]+)*$`, which in
 * practice meant typing the same name twice, once in Russian and once
 * transliterated by hand. Every create form now derives the code from the
 * name and leaves the field editable, so a code is only ever typed when a
 * specific one is wanted.
 */
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

export function slugify(input: string): string {
  const transliterated = input
    .toLowerCase()
    .split("")
    .map((char) => (char in CYRILLIC_MAP ? CYRILLIC_MAP[char] : char))
    .join("");
  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

/** Normalizes whatever a user types straight into a `code` field, without
 * collapsing a hyphen they are in the middle of typing. */
export function normalizeCodeInput(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 100);
}

/** Russian plural form for a count — "1 блок", "2 блока", "5 блоков".
 * Takes the three forms in nominative-singular / genitive-singular /
 * genitive-plural order. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} ${many}`;
  if (mod10 === 1) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
}
