#!/usr/bin/env python3
"""
sitemap-submit.py — Automated sitemap & URL submission to Google and Bing

Supports three submission methods:
  1. Google Search Console API  — sitemap-level submission (requires service account)
  2. Bing Webmaster API         — sitemap-level submission (requires API key)
  3. IndexNow                  — URL-level submission to Bing, Yandex, Naver (requires key)

Usage:
  python scripts/sitemap-submit.py                  # all methods
  python scripts/sitemap-submit.py --google          # Google only
  python scripts/sitemap-submit.py --bing            # Bing Webmaster only
  python scripts/sitemap-submit.py --indexnow        # IndexNow only
  python scripts/sitemap-submit.py --dry-run         # show what would be submitted

Environment variables (or .env file):
  GOOGLE_APPLICATION_CREDENTIALS  path to service account JSON
  BING_WEBMASTER_API_KEY           Bing Webmaster Tools API key
  INDEXNOW_API_KEY                 IndexNow key (generate at https://www.indexnow.org/signup)
  SITE_URL                         override auto-detected site (rarely needed)

Requirements:
  pip install requests python-dotenv
  pip install google-api-python-client google-auth  # for Google GSC only

Note: this file is the cross-repo SSOT — see
  /Users/seuncho/coding/shared/scripts/sitemap-submit.py
  /Users/seuncho/coding/shared/scripts/sync.sh
Edit the canonical copy, then re-run sync.sh to fan it out to
oiyo/blog/wiki/game. Do not hand-edit the per-repo copies.
"""

import argparse
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Optional

import requests

# ── optional: load .env file ────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env.local")
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

# ── optional: Google API client ──────────────────────────────────────────────
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build as google_build
    HAS_GOOGLE_CLIENT = True
except ImportError:
    HAS_GOOGLE_CLIENT = False


# ── configuration ─────────────────────────────────────────────────────────────
# Every Oiyo repo (oiyo/blog/wiki/game) uses a different production domain, but
# this script is synced byte-identical across all four (see sync.sh above). So
# instead of hardcoding a domain, read it from this repo's own astro.config —
# each repo already declares its `site:` there. SITE_URL env var can override.
def _detect_site_url() -> str:
    override = os.environ.get("SITE_URL")
    if override:
        return override.rstrip("/")

    repo_root = Path(__file__).parent.parent
    for name in ("astro.config.mjs", "astro.config.ts"):
        config_path = repo_root / name
        if config_path.exists():
            match = re.search(r"site:\s*['\"]([^'\"]+)['\"]", config_path.read_text())
            if match:
                return match.group(1).rstrip("/")

    raise SystemExit(
        "Cannot determine SITE_URL: set the SITE_URL env var or add "
        "`site: 'https://example.com'` to astro.config.mjs"
    )


SITE_URL = _detect_site_url()
SITEMAP_INDEX_URL = f"{SITE_URL}/sitemap-index.xml"

# Astro's default build output dir. When this exists (i.e. `npm run build` ran
# earlier in the same CI job), IndexNow URL collection reads the sitemap XML
# straight from disk instead of HTTP-fetching the live site from within CI —
# that self-fetch 403s every time on GitHub Actions runners because Cloudflare
# blocks the datacenter IP range regardless of User-Agent (see
# AI-Sessions/wiki/errors/recurring-build-deploy-gotchas.md #10).
DEFAULT_DIST_DIR = Path(__file__).parent.parent / "dist"

# GSC site identifier — usually equals SITE_URL (a URL-prefix property), but
# some Oiyo properties are registered in Search Console as *domain* properties
# (siteUrl="sc-domain:example.com" instead of "https://example.com/"). Domain
# and URL-prefix properties are distinct GSC resources with separate
# permission grants, so submitting to the wrong form 403s even with a valid
# service account (see AI-Sessions/wiki/errors/recurring-build-deploy-gotchas.md #9).
# Set GSC_SITE_URL per-repo in CI when the registered property is a domain property.
GSC_SITE_URL = os.environ.get("GSC_SITE_URL", SITE_URL).rstrip("/")

# Additional sitemaps to submit (beyond the index)
SITEMAPS = [
    SITEMAP_INDEX_URL,
]

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def log(msg: str, level: str = "INFO") -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    symbols = {"INFO": "→", "OK": "✓", "WARN": "!", "ERR": "✗"}
    print(f"[{ts}] {symbols.get(level, '·')} {msg}")


def _load_sitemap_xml(url: str, dist_dir: Optional[Path]) -> bytes:
    """
    Load a sitemap's XML content, preferring a local build artifact over the
    network. `dist_dir` is the Astro build output (see DEFAULT_DIST_DIR) — if
    it contains a file matching the <loc> URL's basename, read that instead of
    fetching the URL. This sidesteps Cloudflare 403'ing the self-fetch from CI
    (gotcha #10) since the file was already produced by `npm run build` in the
    same job, from the same commit.
    """
    if dist_dir is not None:
        local_path = dist_dir / url.rstrip("/").rsplit("/", 1)[-1]
        if local_path.exists():
            return local_path.read_bytes()

    # Use an honest UA, not a spoofed Googlebot string — impersonating a
    # named bot (without passing Google's IP/reverse-DNS verification)
    # trips Cloudflare's verified-bot enforcement and gets 403'd when this
    # runs from a datacenter IP like GitHub Actions (see gotcha #9).
    resp = requests.get(url, timeout=30, headers={"User-Agent": "OiyoSitemapSubmitter/1.0 (+https://oiyo.net; sitemap URL enumeration for IndexNow)"})
    resp.raise_for_status()
    return resp.content


def parse_sitemap(url: str, dist_dir: Optional[Path] = None, visited: set | None = None) -> list[str]:
    """
    Recursively parse a sitemap or sitemap index, returning all <loc> URLs.
    Handles both <sitemapindex> and <urlset> formats.
    """
    if visited is None:
        visited = set()
    if url in visited:
        return []
    visited.add(url)

    urls: list[str] = []
    try:
        root = ET.fromstring(_load_sitemap_xml(url, dist_dir))
    except Exception as exc:
        log(f"Cannot load {url}: {exc}", "WARN")
        return urls

    ns = "http://www.sitemaps.org/schemas/sitemap/0.9"
    tag = root.tag.split("}")[-1] if "}" in root.tag else root.tag

    if tag == "sitemapindex":
        # Recurse into child sitemaps
        for sitemap in root.findall(f"{{{ns}}}sitemap"):
            loc = sitemap.findtext(f"{{{ns}}}loc")
            if loc:
                urls.extend(parse_sitemap(loc.strip(), dist_dir, visited))
    else:
        # Regular urlset — collect <loc> entries
        for url_elem in root.findall(f"{{{ns}}}url"):
            loc = url_elem.findtext(f"{{{ns}}}loc")
            if loc:
                urls.append(loc.strip())

    return urls


# ─────────────────────────────────────────────────────────────────────────────
# 1. Google Search Console
# ─────────────────────────────────────────────────────────────────────────────

def submit_google_gsc(
    site_url: str,
    sitemap_url: str,
    credentials_path: Optional[str] = None,
    dry_run: bool = False,
) -> dict:
    """
    Submit a sitemap to Google Search Console via the Webmasters v3 API.

    Setup:
      1. Go to https://console.cloud.google.com → IAM & Admin → Service Accounts
      2. Create a service account, download JSON key
      3. In Google Search Console → Settings → Users → Add the service account email
         with "Owner" permission
      4. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
    """
    if not HAS_GOOGLE_CLIENT:
        return {
            "status": "skip",
            "reason": "google-api-python-client not installed. Run: pip install google-api-python-client google-auth",
        }

    # Support JSON content via env var (for CI) or file path (for local)
    json_content = os.environ.get("GSC_SERVICE_ACCOUNT_JSON")
    creds_path = credentials_path or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if not json_content and (not creds_path or not Path(creds_path).exists()):
        return {
            "status": "skip",
            "reason": "Set GSC_SERVICE_ACCOUNT_JSON (CI) or GOOGLE_APPLICATION_CREDENTIALS (local)",
        }

    if dry_run:
        return {"status": "dry-run", "would_submit": sitemap_url, "to": "Google Search Console"}

    try:
        if json_content:
            import json as _json
            info = _json.loads(json_content)
            creds = service_account.Credentials.from_service_account_info(
                info,
                scopes=["https://www.googleapis.com/auth/webmasters"],
            )
        else:
            creds = service_account.Credentials.from_service_account_file(
                creds_path,
                scopes=["https://www.googleapis.com/auth/webmasters"],
            )
        service = google_build("webmasters", "v3", credentials=creds)
        service.sitemaps().submit(siteUrl=site_url, feedpath=sitemap_url).execute()
        return {"status": "ok", "submitted": sitemap_url}
    except Exception as exc:
        return {"status": "error", "reason": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# 2. Bing Webmaster API
# ─────────────────────────────────────────────────────────────────────────────

def submit_bing_webmaster(
    site_url: str,
    sitemap_url: str,
    api_key: Optional[str] = None,
    dry_run: bool = False,
) -> dict:
    """
    Submit a sitemap to Bing Webmaster Tools.

    Setup:
      1. Go to https://www.bing.com/webmasters → Settings → API Access → API Key
      2. Set BING_WEBMASTER_API_KEY=<your-key>
    """
    key = api_key or os.environ.get("BING_WEBMASTER_API_KEY")
    if not key:
        return {"status": "skip", "reason": "BING_WEBMASTER_API_KEY not set"}

    if dry_run:
        return {"status": "dry-run", "would_submit": sitemap_url, "to": "Bing Webmaster"}

    # Bing Webmaster JSON API: sitemap submission is the SubmitFeed method
    # (SubmitSitemap does not exist and returns an HTML 404).
    endpoint = "https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed"
    try:
        resp = requests.post(
            endpoint,
            params={"apikey": key},
            json={"siteUrl": site_url, "feedUrl": sitemap_url},
            timeout=15,
        )
        if resp.status_code == 200:
            return {"status": "ok", "submitted": sitemap_url}
        return {"status": "error", "http": resp.status_code, "body": resp.text[:200]}
    except Exception as exc:
        return {"status": "error", "reason": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# 3. IndexNow (Bing, Yandex, Naver, Seznam, …)
# ─────────────────────────────────────────────────────────────────────────────

INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow"
INDEXNOW_BATCH_SIZE = 10_000  # protocol max per request


def submit_indexnow(
    site_url: str,
    urls: list[str],
    api_key: Optional[str] = None,
    dry_run: bool = False,
) -> dict:
    """
    Submit URLs via the IndexNow protocol (used by Bing, Yandex, Naver, Seznam).

    Setup:
      1. Generate a key at https://www.indexnow.org/signup (or just pick a UUID)
      2. Create a verification file at {site_url}/{key}.txt containing only the key
         — for Cloudflare Pages, add the file to /public/{key}.txt
      3. Set INDEXNOW_API_KEY=<your-key>

    Docs: https://www.indexnow.org/documentation
    """
    key = api_key or os.environ.get("INDEXNOW_API_KEY")
    if not key:
        return {"status": "skip", "reason": "INDEXNOW_API_KEY not set"}
    if not urls:
        return {"status": "skip", "reason": "No URLs to submit"}

    host = site_url.replace("https://", "").replace("http://", "").rstrip("/")
    key_location = f"{site_url}/{key}.txt"

    if dry_run:
        return {
            "status": "dry-run",
            "would_submit": f"{len(urls)} URLs",
            "to": "IndexNow",
            "key_location": key_location,
        }

    results = []
    for i in range(0, len(urls), INDEXNOW_BATCH_SIZE):
        batch = urls[i : i + INDEXNOW_BATCH_SIZE]
        payload = {
            "host": host,
            "key": key,
            "keyLocation": key_location,
            "urlList": batch,
        }
        try:
            resp = requests.post(
                INDEXNOW_ENDPOINT,
                json=payload,
                headers={"Content-Type": "application/json; charset=utf-8"},
                timeout=30,
            )
            entry = {
                "batch_start": i,
                "count": len(batch),
                "http": resp.status_code,
                "ok": resp.status_code in (200, 202),
            }
            if resp.status_code not in (200, 202):
                entry["body"] = resp.text[:300]
            results.append(entry)
            if i + INDEXNOW_BATCH_SIZE < len(urls):
                time.sleep(1)  # be polite between batches
        except Exception as exc:
            results.append({"batch_start": i, "error": str(exc)})

    total_ok = sum(r.get("count", 0) for r in results if r.get("ok"))
    return {
        "status": "ok" if total_ok else "error",
        "submitted": total_ok,
        "total": len(urls),
        "batches": results,
    }


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Submit sitemaps/URLs to Google and Bing search engines",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--google", action="store_true", help="Submit to Google Search Console only")
    parser.add_argument("--bing", action="store_true", help="Submit to Bing Webmaster only")
    parser.add_argument("--indexnow", action="store_true", help="Submit via IndexNow only")
    parser.add_argument("--sitemap", default=SITEMAP_INDEX_URL, help="Sitemap URL to submit")
    parser.add_argument("--site", default=SITE_URL, help="Site URL for Bing/IndexNow (e.g. https://example.com)")
    parser.add_argument("--gsc-site", default=GSC_SITE_URL, help="GSC siteUrl (e.g. https://example.com/ or sc-domain:example.com)")
    parser.add_argument("--dist-dir", default=str(DEFAULT_DIST_DIR), help="Local Astro build output dir to read sitemap XML from (avoids CI self-fetch 403s). Falls back to HTTP if a given file isn't found here.")
    parser.add_argument("--no-dist-dir", action="store_true", help="Always fetch sitemap XML over HTTP, ignoring any local build output")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be submitted without making requests")
    parser.add_argument("--json", action="store_true", dest="json_out", help="Output results as JSON")
    args = parser.parse_args()

    run_all = not (args.google or args.bing or args.indexnow)

    dist_dir = None
    if not args.no_dist_dir:
        candidate = Path(args.dist_dir)
        if candidate.is_dir():
            dist_dir = candidate

    print(f"\n{'='*60}")
    print(f"  Sitemap Submission — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Site    : {args.site}")
    if args.gsc_site != args.site:
        print(f"  GSC Site: {args.gsc_site}")
    print(f"  Sitemap : {args.sitemap}")
    print(f"  Dist dir: {dist_dir if dist_dir else '(none — will fetch sitemap over HTTP)'}")
    if args.dry_run:
        print(f"  Mode    : DRY RUN (no requests will be made)")
    print(f"{'='*60}\n")

    all_results: dict = {}

    # ── Google Search Console ────────────────────────────────────────────────
    if run_all or args.google:
        log("Google Search Console...")
        result = submit_google_gsc(args.gsc_site, args.sitemap, dry_run=args.dry_run)
        all_results["google"] = result
        level = "OK" if result["status"] == "ok" else ("WARN" if result["status"] in ("skip", "dry-run") else "ERR")
        log(f"Google GSC: {result}", level)

    # ── Bing Webmaster ───────────────────────────────────────────────────────
    if run_all or args.bing:
        log("Bing Webmaster API...")
        result = submit_bing_webmaster(args.site, args.sitemap, dry_run=args.dry_run)
        all_results["bing"] = result
        level = "OK" if result["status"] == "ok" else ("WARN" if result["status"] in ("skip", "dry-run") else "ERR")
        log(f"Bing Webmaster: {result}", level)

    # ── IndexNow ─────────────────────────────────────────────────────────────
    if run_all or args.indexnow:
        log("Parsing sitemap to collect URLs for IndexNow...")
        if args.dry_run:
            urls = ["(dry-run: sitemap not fetched)"]
        else:
            urls = parse_sitemap(args.sitemap, dist_dir)
            log(f"Found {len(urls):,} URLs in sitemap", "OK")

        log("Submitting via IndexNow...")
        result = submit_indexnow(args.site, urls, dry_run=args.dry_run)
        all_results["indexnow"] = result
        level = "OK" if result.get("status") == "ok" else ("WARN" if result.get("status") in ("skip", "dry-run") else "ERR")
        log(f"IndexNow: {result}", level)

    print()
    if args.json_out:
        print(json.dumps(all_results, indent=2, ensure_ascii=False))

    # Bing Webmaster API is treated as non-fatal (endpoint frequently changes,
    # IndexNow already covers Bing crawling via the same protocol).
    fatal_errors = [
        k for k, v in all_results.items()
        if isinstance(v, dict) and v.get("status") == "error" and k != "bing"
    ]
    all_errors = [k for k, v in all_results.items() if isinstance(v, dict) and v.get("status") == "error"]
    if all_errors:
        log(f"Submission errors (bing is non-fatal): {all_errors}", "WARN")
    if fatal_errors:
        return 1

    log("All submissions complete.", "OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
