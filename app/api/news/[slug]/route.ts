import { getPublishedNewsBySlug, toPublicNews } from "@/features/news/queries/news";
import { corsJson, corsPreflight } from "@/lib/http/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/news/[slug]
 *
 * Public single-article endpoint. Returns 404 unless the article is PUBLISHED.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;

  try {
    const article = await getPublishedNewsBySlug(slug);
    if (!article) {
      return corsJson(request, { ok: false, error: "Article not found." }, 404);
    }

    return corsJson(request, { ok: true, data: toPublicNews(article) }, 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  } catch (error) {
    console.error("[api/news/[slug]] failed:", error);
    return corsJson(request, { ok: false, error: "Could not load the article." }, 500);
  }
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}
