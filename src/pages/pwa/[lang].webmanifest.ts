import type { APIRoute, GetStaticPaths } from "astro";
import { locales } from "../../lib/i18n";
import { buildManifest, isPwaLocale } from "../../lib/pwa/manifest";

export const getStaticPaths: GetStaticPaths = () => locales.map((lang) => ({ params: { lang } }));

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang ?? "en";
  if (!isPwaLocale(lang)) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(buildManifest(lang), null, 2), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
};
