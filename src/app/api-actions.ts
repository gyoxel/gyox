"use server";

import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { findApiHandler } from "@/lib/api-routes";

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

/**
 * Runs API mutations in-process, then refreshes like invalidateAll() — all
 * in one round trip. A fetch() followed by invalidateAll() was two (three
 * with a payment change): from far away each one costs a noticeable delay.
 * Calls run in order and stop at the first that fails; the results are those
 * of the calls that ran.
 */
export async function callApi(calls: ApiCall[]): Promise<ApiResult[]> {
  const results: ApiResult[] = [];
  for (const call of calls) {
    const url = new URL(call.path, "http://gx.local");
    const found = findApiHandler(call.method, url.pathname);
    if (!found) {
      results.push({ status: 404, body: JSON.stringify({ error: "Introuvable." }) });
      break;
    }
    let result: ApiResult;
    try {
      const req = new NextRequest(url, {
        method: call.method,
        headers: { "Content-Type": "application/json" },
        body: call.body === undefined ? undefined : JSON.stringify(call.body),
      });
      const res = await found.handler(req, { params: Promise.resolve(found.params) });
      result = { status: res.status, body: await res.text() };
    } catch (e) {
      console.error(e);
      result = { status: 500, body: JSON.stringify({ error: "Erreur serveur." }) };
    }
    results.push(result);
    if (result.status >= 400) break;
  }
  if (results.some((r) => r.status < 400)) revalidatePath("/", "layout");
  return results;
}
