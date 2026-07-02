import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  // Content-Security-Policy intentionally omitted: this is a static, no-auth, no-user-data
  // site, so CSP's XSS/exfiltration protection has no high-value target, while a
  // mis-allowlisted CSP silently breaks ads/analytics. Clickjacking/MIME/HTTPS protections
  // remain via the headers set above. (Decision: 2026-06-14)
  return response;
});
