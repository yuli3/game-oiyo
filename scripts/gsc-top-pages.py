#!/usr/bin/env python3
"""
GSC top pages & queries — targeting data for the ahoxy→OIYO funnel.

Unlike seo-weekly-report.py (aggregate clicks/impressions only), this pulls the
per-page and per-query breakdown we need to decide WHERE to place cross-site CTAs
and WHICH content to invest in.

Auth: set GSC_SERVICE_ACCOUNT_JSON to the service-account JSON (the same secret the
seo-weekly workflow uses). The service account must be a user on each GSC property.

Usage:
    GSC_SERVICE_ACCOUNT_JSON="$(cat sa.json)" python3 scripts/gsc-top-pages.py
    # or, if already exported in your shell:
    python3 scripts/gsc-top-pages.py [--days 28] [--rows 25]
"""
import argparse
import json
import os
import sys
from datetime import date, timedelta

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build as google_build
except ImportError:
    print("Missing deps: pip install google-api-python-client google-auth", file=sys.stderr)
    sys.exit(1)

PROPERTIES = [
    {"name": "ahoxy.com", "gsc": "sc-domain:ahoxy.com"},
    {"name": "oiyo.net", "gsc": "sc-domain:oiyo.net"},
    {"name": "blog.oiyo.net", "gsc": "https://blog.oiyo.net/"},
    {"name": "wiki.oiyo.net", "gsc": "sc-domain:wiki.oiyo.net"},
]


def service():
    raw = os.environ.get("GSC_SERVICE_ACCOUNT_JSON")
    if not raw:
        print("ERROR: GSC_SERVICE_ACCOUNT_JSON not set.", file=sys.stderr)
        print("Run: GSC_SERVICE_ACCOUNT_JSON=\"$(cat your-sa.json)\" python3 scripts/gsc-top-pages.py", file=sys.stderr)
        sys.exit(2)
    info = json.loads(raw)
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    return google_build("webmasters", "v3", credentials=creds)


def query(svc, prop, dimension, start, end, rows):
    try:
        resp = svc.searchanalytics().query(siteUrl=prop, body={
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": [dimension],
            "rowLimit": rows,
            "dataState": "all",
        }).execute()
    except Exception as exc:  # noqa: BLE001
        print(f"<!-- error {prop} [{dimension}]: {exc} -->")
        return []
    return resp.get("rows", [])


def table(title, rows, dim_label):
    print(f"### {title}")
    if not rows:
        print("_(no data)_\n")
        return
    print(f"| {dim_label} | clicks | impressions | ctr | pos |")
    print("|---|--:|--:|--:|--:|")
    for r in rows:
        key = r["keys"][0]
        print(f"| {key} | {int(r.get('clicks',0))} | {int(r.get('impressions',0))} "
              f"| {r.get('ctr',0)*100:.1f}% | {r.get('position',0):.1f} |")
    print()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=28)
    ap.add_argument("--rows", type=int, default=25)
    args = ap.parse_args()

    svc = service()
    end = date.today() - timedelta(days=2)  # GSC data lags ~2 days
    start = end - timedelta(days=args.days)

    print(f"# GSC top pages & queries — last {args.days}d ({start} → {end})\n")
    for p in PROPERTIES:
        print(f"## {p['name']}\n")
        table("Top pages", query(svc, p["gsc"], "page", start, end, args.rows), "page")
        table("Top queries", query(svc, p["gsc"], "query", start, end, args.rows), "query")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
