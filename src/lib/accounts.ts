// Accounts: who signed in with Google, and their profile.
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { asUser, signedInUserId } from "./user-scope";
import { createUserDefaults } from "./user-defaults";

export interface GoogleProfile {
  /** Google's account id. */
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface Account {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
}

/**
 * The account of this Google profile: found by its Google id, else by its
 * email (the owner, created by the migration from the email alone, gets
 * linked on their first sign-in), else created with the defaults.
 */
export async function signInWithGoogle(profile: GoogleProfile): Promise<string> {
  const now = new Date().toISOString();
  const email = profile.email.toLowerCase();
  const seen = { name: profile.name, image: profile.picture, lastLoginAt: now };

  const known = await prisma.user.findUnique({ where: { googleSub: profile.sub } });
  if (known) {
    await prisma.user.update({ where: { id: known.id }, data: seen });
    return known.id;
  }
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    await prisma.user.update({ where: { id: byEmail.id }, data: { ...seen, googleSub: profile.sub } });
    return byEmail.id;
  }
  const id = randomUUID();
  await prisma.user.create({ data: { id, email, googleSub: profile.sub, ...seen, createdAt: now } });
  await asUser(id, createUserDefaults);
  return id;
}

/** The signed-in user's account; null if not signed in (or the account is gone). */
export async function currentAccount(): Promise<Account | null> {
  const id = await signedInUserId();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, image: true, createdAt: true },
  });
}
