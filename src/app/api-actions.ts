"use server";

import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { findApiHandler } from "@/lib/api-routes";
import { inTransaction } from "@/lib/prisma";

export interface ApiCall {
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  /** e.g. "/api/expenses/abc?monthKey=2026-10" */
  path: string;
  body?: unknown;
}

export interface ApiResult {
  status: number;
  body: string;
}

class BatchFailed extends Error {}

/**
 * Runs API mutations in-process, then refreshes like invalidateAll() — all
 * in one round trip. A fetch() followed by invalidateAll() was two (three
 * with a payment change): from far away each one costs a noticeable delay.
 *
 * All or nothing: the calls run in order in one database transaction and
 * stop at the first that fails, which undoes the ones before it (e.g. an
 * edit saved but its payment refused for lack of money). The results are
 * those of the calls that ran.
 */
export async function callApi(calls: ApiCall[]): Promise<ApiResult[]> {
  const results: ApiResult[] = [];
  try {
    await inTransaction(async () => {
      for (const call of calls) {
        const result = await runCall(call);
        results.push(result);
        if (result.status >= 400) throw new BatchFailed();
      }
    });
  } catch (error) {
    if (!(error instanceof BatchFailed)) throw error;
    return results;
  }
  if (results.length > 0) revalidatePath("/", "layout");
  return results;
}

async function runCall(call: ApiCall): Promise<ApiResult> {
  const url = new URL(call.path, "http://gx.local");
  const found = findApiHandler(call.method, url.pathname);
  if (!found) return { status: 404, body: JSON.stringify({ error: "Introuvable." }) };
  try {
    const req = new NextRequest(url, {
      method: call.method,
      headers: { "Content-Type": "application/json" },
      body: call.body === undefined ? undefined : JSON.stringify(call.body),
    });
    const res = await found.handler(req, { params: Promise.resolve(found.params) });
    return { status: res.status, body: await res.text() };
  } catch (e) {
    console.error(e);
    return { status: 500, body: JSON.stringify({ error: "Erreur serveur." }) };
  }
}
