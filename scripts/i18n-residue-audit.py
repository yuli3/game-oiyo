#!/usr/bin/env python3
"""i18n residue audit over built dist/ HTML (visible text only).

Flags three classes of translation breakage:
  1. raw i18n keys leaking into text (e.g. "faq.questions.1.q", "[nav.home]")
  2. "[object Object]"
  3. literal "undefined" / "NaN" standing alone in visible text

Usage: python3 scripts/i18n-residue-audit.py [dist-dir] [ns1,ns2,...]
Namespaces default to common i18n roots; pass the repo's real list for
precision. Exit 1 on any finding.
"""
import re
import sys
from pathlib import Path

DIST = Path(sys.argv[1] if len(sys.argv) > 1 else "dist")
NS = (sys.argv[2].split(",") if len(sys.argv) > 2 else [
    "about", "common", "contact", "error", "faq", "header", "hero", "landing",
    "legal", "marketing", "nav", "navigation", "ontology", "page", "seo",
    "support", "features", "akashic", "catalog", "chosun", "commerce",
    "dashboard", "egyptian", "saju", "ui", "universal", "fortune", "hobby",
    "lifestyle", "mbti", "numerology", "tci", "colorPersonality",
])

TAG_STRIP = re.compile(r"<script\b.*?</script>|<style\b.*?</style>|<pre\b.*?</pre>|<code\b.*?</code>|<[^>]+>", re.S)
BRACKET_KEY = re.compile(r"\[(?:%s)\.[A-Za-z0-9_.]+\]" % "|".join(map(re.escape, NS)))
RAW_KEY = re.compile(r"(?<![\w/.@-])(?:%s)\.[a-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+(?![\w/-])" % "|".join(map(re.escape, NS)))
OBJ = re.compile(r"\[object Object\]")
UNDEF = re.compile(r"(?<![\w/.-])undefined(?![\w/.-])")  # NaN dropped: legit in data-science prose


def main() -> None:
    findings: list[tuple[str, str]] = []
    pages = 0
    for html in DIST.rglob("index.html"):
        pages += 1
        text = TAG_STRIP.sub(" ", html.read_text(errors="ignore"))
        key = "/" + str(html.parent.relative_to(DIST))
        is_en = key.startswith("/en")
        for pat, label in ((BRACKET_KEY, "bracket-key"), (RAW_KEY, "raw-key"), (OBJ, "object"), (UNDEF, "undef")):
            if label == "undef" and is_en:
                continue  # "undefined"/"NaN" are legitimate English prose / code talk
            for m in set(pat.findall(text)):
                # domain-like tokens are not i18n keys
                if m.split(".")[-1].lower() in {"net", "com", "org", "io", "dev", "kr", "app"}:
                    continue
                findings.append((key, f"{label}: {m}"))

    print(f"## i18n residue audit — {pages} pages")
    if not findings:
        print("clean — no residue found")
        return
    print(f"❌ {len(findings)} findings")
    for k, f in sorted(findings)[:80]:
        print(f"  {k} → {f}")
    sys.exit(1)


if __name__ == "__main__":
    main()
