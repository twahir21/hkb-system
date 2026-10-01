import { countPublishedNews, listPublishedNews, toPublicNews } from "@/features/news/queries/news";
import { corsJson, corsPreflight } from "@/lib/http/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 50;

/**
 * GET /api/news?limit=10&page=1
 *
 * Public, unauthenticated feed of PUBLISHED articles for the marketing website
 * (cross-origin allow-listed via lib/http/cors). Returns only safe public fields.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("limit") ?? "10") || 10)
  );
  const offset = (page - 1) * pageSize;

  try {
    const [rows, total] = await Promise.all([
      listPublishedNews(pageSize, offset),
      countPublishedNews(),
    ]);

    return corsJson(
      request,
      {
        ok: true,
        data: rows.map(toPublicNews),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
      200,
      { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
    );
  } catch (error) {
    console.error("[api/news] list failed:", error);
    return corsJson(request, { ok: false, error: "Could not load news." }, 500);
  }
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}
