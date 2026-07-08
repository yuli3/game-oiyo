// Fetches Chrome UX Report (CrUX) p75 Core Web Vitals for this site's origin.
// This is real-user field data, complementary to the synthetic Lighthouse
// scores in lighthouserc.json. It never fails the build: if CRUX_API_KEY is
// not configured, or the API has no data yet for this origin, it warns and
// exits 0.

const ORIGIN = "https://game.oiyo.net";
const API_KEY = process.env.CRUX_API_KEY;

const METRICS = [
  "largest_contentful_paint",
  "interaction_to_next_paint",
  "cumulative_layout_shift",
  "first_contentful_paint",
  "experimental_time_to_first_byte",
];

if (!API_KEY) {
  console.warn("[crux-report] CRUX_API_KEY not set — skipping CrUX fetch.");
  process.exit(0);
}

try {
  const res = await fetch(
    `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: ORIGIN, formFactor: "PHONE" }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.warn(`[crux-report] CrUX API returned ${res.status} for ${ORIGIN} — skipping. ${body}`);
    process.exit(0);
  }

  const data = await res.json();
  const metrics = data.record?.metrics ?? {};

  console.log(`\n=== CrUX (real-user field data) — ${ORIGIN}, mobile ===`);
  for (const key of METRICS) {
    console.log(`  ${key}: p75=${metrics[key]?.percentiles?.p75 ?? "n/a"}`);
  }

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const fs = await import("node:fs");
    const lines = [
      `\n### CrUX (real-user field data) — ${ORIGIN}, mobile`,
      "",
      "| Metric | p75 |",
      "| --- | --- |",
      ...METRICS.map((key) => `| ${key} | ${metrics[key]?.percentiles?.p75 ?? "n/a"} |`),
      "",
    ];
    fs.appendFileSync(summaryPath, lines.join("\n"));
  }
} catch (err) {
  console.warn(`[crux-report] fetch failed — skipping. ${err.message}`);
  process.exit(0);
}
