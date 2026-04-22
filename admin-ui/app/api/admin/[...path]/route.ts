/**
 * Proxy /api/admin/* → retrieval-service /admin/*
 *
 * Injects the Bearer admin secret server-side so the browser bundle never
 * sees it. Forwards method, query string, and body verbatim.
 */

import { NextResponse } from "next/server";

const BASE = process.env.RETRIEVAL_ADMIN_BASE_URL ?? "http://localhost:8787";
const SECRET =
  process.env.RETRIEVAL_ADMIN_SECRET ??
  process.env.RETRIEVAL_SHARED_SECRET ??
  null;

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx) {
  if (!SECRET) {
    return NextResponse.json(
      {
        error: "missing_admin_secret",
        hint:
          "Set RETRIEVAL_ADMIN_SECRET (or RETRIEVAL_SHARED_SECRET) in admin-ui/.env.local",
      },
      { status: 500 },
    );
  }

  const { path } = await ctx.params;
  const incoming = new URL(request.url);
  const targetUrl =
    `${BASE.replace(/\/$/, "")}/admin/${(path ?? []).join("/")}` +
    incoming.search;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${SECRET}`,
    Accept: "application/json",
  };

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  if (hasBody) headers["Content-Type"] = "application/json";

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
