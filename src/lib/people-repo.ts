// Personnes: the names money is lent to or borrowed from, in their order —
// offered under the name of a debt or a loan. A list of names only: renaming
// or removing one changes no debt or loan.
import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";

export interface Person {
  id: string;
  name: string;
  position: number;
}

const select = { id: true, name: true, position: true } as const;
const same = (a: string, b: string) => a.trim().toLocaleLowerCase("fr") === b.trim().toLocaleLowerCase("fr");

export async function getPeople(): Promise<Person[]> {
  return prisma.person.findMany({ select, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
}

/** Adds `name` (last) unless someone has it already; gives the one kept. */
export async function addPerson(name: string): Promise<Person> {
  const people = await getPeople();
  const existing = people.find((p) => same(p.name, name));
  if (existing) return existing;
  const position = people.reduce((max, p) => Math.max(max, p.position + 1), 0);
  return prisma.person.create({ data: { id: randomUUID(), name: name.trim(), position, createdAt: new Date().toISOString() }, select });
}

/** A debt or a loan saved under `name`: the name is offered from then on. */
export async function rememberPerson(name: string): Promise<void> {
  if (name.trim()) await addPerson(name);
}

/** "taken": someone else has that name already. */
export async function renamePerson(id: string, name: string): Promise<Person | null | "taken"> {
  const people = await getPeople();
  if (people.some((p) => p.id !== id && same(p.name, name))) return "taken";
  const { count } = await prisma.person.updateMany({ where: { id }, data: { name: name.trim() } });
  return count > 0 ? ((await prisma.person.findFirst({ where: { id }, select })) ?? null) : null;
}

export async function deletePerson(id: string): Promise<boolean> {
  const { count } = await prisma.person.deleteMany({ where: { id } });
  return count > 0;
}

/** The new order, as ids (anyone left out keeps their place after). */
export async function reorderPeople(ids: string[]): Promise<void> {
  await prisma.$transaction(ids.map((id, position) => prisma.person.updateMany({ where: { id }, data: { position } })));
}
