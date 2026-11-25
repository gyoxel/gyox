// Historique (Menu): a line for everything done in the app — added,
// changed, deleted, paid… — newest first. Only the last KEEP are kept: one
// more, the oldest goes. Changing something old adds a line now; the line
// of when it was added stays as it was. Written by the API routes once
// what they did is done; never makes them fail.
import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import type { Activity, ActivityAction, ActivityKind } from "./activity-titles";

export type { Activity, ActivityAction, ActivityKind };

export const ACTIVITY_KEEP = 60;

/** Records what was just done (errors are swallowed: the action itself succeeded). */
export async function logActivity(a: { kind: ActivityKind; action: ActivityAction; name: string; amount?: number | null; detail?: string | null }): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        id: randomUUID(),
        at: new Date().toISOString(),
        kind: a.kind,
        action: a.action,
        name: a.name.trim() || "—",
        amount: a.amount == null || !Number.isFinite(a.amount) ? null : Math.round(a.amount * 100) / 100,
        detail: a.detail?.trim() || null,
      },
    });
    const old = await prisma.activity.findMany({ orderBy: { at: "desc" }, skip: ACTIVITY_KEEP, select: { id: true } });
    if (old.length > 0) await prisma.activity.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  } catch (error) {
    console.error("logActivity", error);
  }
}

export async function getActivities(): Promise<Activity[]> {
  const rows = await prisma.activity.findMany({ orderBy: { at: "desc" }, take: ACTIVITY_KEEP });
  return rows.map(({ id, at, kind, action, name, amount, detail }) => ({ id, at, kind: kind as ActivityKind, action: action as ActivityAction, name, amount, detail }));
}
