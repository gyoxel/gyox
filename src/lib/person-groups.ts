// Debts (and loans) to the same person: the same name, whatever its case,
// accents or spaces. Shown together — their total, each one under it.
export const personKey = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

/** `items` in groups of the same person, in the order the first of each comes. */
export function byPerson<T>(items: T[], nameOf: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = personKey(nameOf(item));
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.values()];
}

/** Whose a debt or a loan is: its person, else (older ones) its name. */
export const personOf = (item: { name: string; person?: string | null }) => item.person?.trim() || item.name;
