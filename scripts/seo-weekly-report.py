#!/usr/bin/env python3
"""
seo-weekly-report.py — 4-site weekly SEO health report (GSC + Bing).

Runs in CI on a weekly cron. Prints a Markdown report to stdout, which the
workflow appends to GITHUB_STEP_SUMMARY. No commits, no deploys.

Tracks the recovery after the 2026-06-10 dedup/cn-removal overhaul:
wiki Bing InIndex (was 154/4,364) and crawl errors (was 494) are the key
numbers to watch.

Environment variables:
  GSC_SERVICE_ACCOUNT_JSON   Google service account JSON content
  BING_WEBMASTER_API_KEY     Bing Webmaster Tools API key
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone

import requests

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build as google_build
    HAS_GOOGLE = True
except ImportError:
    HAS_GOOGLE = False

SITES = [
    {"name": "oiyo.net",      "gsc": "sc-domain:oiyo.net",      "url": "https://oiyo.net"},
    {"name": "blog.oiyo.net", "gsc": "https://blog.oiyo.net/",  "url": "https://blog.oiyo.net"},
    {"name": "wiki.oiyo.net", "gsc": "sc-domain:wiki.oiyo.net", "url": "https://wiki.oiyo.net"},
    {"name": "ahoxy.com",     "gsc": "sc-domain:ahoxy.com",     "url": "https://ahoxy.com"},
]

BING_BASE = "https://ssl.bing.com/webmaster/api.svc/json"


def gsc_service():
    raw = os.environ.get("GSC_SERVICE_ACCOUNT_JSON")
    if not (HAS_GOOGLE and raw):
        return None
    info = json.loads(raw)
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
    )
    return google_build("webmasters", "v3", credentials=creds)


def gsc_window(svc, prop, start, end):
    try:
        rows = svc.searchanalytics().query(
            siteUrl=prop,
            body={"startDate": start, "endDate": end, "dimensions": ["date"], "rowLimit": 100},
        ).execute().get("rows", [])
        return (
            int(sum(r.get("clicks", 0) for r in rows)),
            int(sum(r.get("impressions", 0) for r in rows)),
        )
    except Exception as exc:
        print(f"<!-- GSC error {prop}: {exc} -->", file=sys.stderr)
        return None


def gsc_sitemap_errors(svc, prop):
    try:
        maps = svc.sitemaps().list(siteUrl=prop).execute().get("sitemap", [])
        return sum(int(m.get("errors", 0)) for m in maps), len(maps)
    except Exception:
        return None


def bing_crawl_stats(url):
    key = os.environ.get("BING_WEBMASTER_API_KEY")
    if not key:
        return None
    try:
        r = requests.get(
            f"{BING_BASE}/GetCrawlStats", params={"apikey": key, "siteUrl": url}, timeout=30
        )
        if r.status_code != 200:
            return None
        rows = r.json().get("d") or []
        # GetCrawlStats returns a daily series — use the most recent entry
        return rows[-1] if isinstance(rows, list) and rows else (rows if isinstance(rows, dict) else None)
    except Exception:
        return None


def main() -> int:
    today = datetime.now(timezone.utc).date()
    end = (today - timedelta(days=2)).isoformat()        # GSC data lags ~2 days
    start_7 = (today - timedelta(days=9)).isoformat()
    prev_end = (today - timedelta(days=10)).isoformat()
    prev_start = (today - timedelta(days=17)).isoformat()

    svc = gsc_service()

    print(f"## 주간 SEO 리포트 — {today.isoformat()}")
    print()
    print("| 사이트 | 클릭(7d) | 전주 | 노출(7d) | 전주 | 사이트맵 오류 | Bing 색인 | Bing 크롤오류 |")
    print("|---|---|---|---|---|---|---|---|")

    for site in SITES:
        clicks = imps = pclicks = pimps = "—"
        sm_err = "—"
        if svc:
            cur = gsc_window(svc, site["gsc"], start_7, end)
            prev = gsc_window(svc, site["gsc"], prev_start, prev_end)
            if cur:
                clicks, imps = cur
            if prev:
                pclicks, pimps = prev
            sm = gsc_sitemap_errors(svc, site["gsc"])
            if sm is not None:
                sm_err = f"{sm[0]} ({sm[1]}개 등록)"

        in_index = crawl_err = "—"
        stats = bing_crawl_stats(site["url"])
        if stats:
            in_index = stats.get("InIndex", "—")
            crawl_err = stats.get("CrawlErrors", "—")

        print(
            f"| {site['name']} | {clicks} | {pclicks} | {imps} | {pimps} "
            f"| {sm_err} | {in_index} | {crawl_err} |"
        )

    print()
    print("> 기준점(2026-06-10 정비 직후): wiki Bing 색인 154 / 크롤오류 494 · "
          "blog 크롤오류 779 · GSC 90일 클릭 4 (oiyo 도메인 합산)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
