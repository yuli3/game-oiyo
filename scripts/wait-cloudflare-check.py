#!/usr/bin/env python3
"""Wait until Cloudflare Pages reports success for the current Git commit."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

CHECK_NAME = "Cloudflare Pages"
TERMINAL_FAILURES = {
    "failure",
    "cancelled",
    "timed_out",
    "action_required",
    "stale",
    "neutral",
    "skipped",
    "startup_failure",
}


def find_cloudflare_check(payload: dict) -> dict | None:
    checks = [check for check in payload.get("check_runs", []) if check.get("name") == CHECK_NAME]
    return max(checks, key=lambda check: check.get("started_at") or "", default=None)


def check_state(check: dict | None) -> str:
    if check is None or check.get("status") != "completed":
        return "waiting"
    conclusion = check.get("conclusion")
    if conclusion == "success":
        return "success"
    if conclusion in TERMINAL_FAILURES:
        return "failure"
    return "waiting"


def fetch_checks(repository: str, sha: str, token: str) -> dict:
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repository}/commits/{sha}/check-runs?per_page=100",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "oiyo-cloudflare-deploy-gate",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def main() -> int:
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    sha = os.environ.get("GITHUB_SHA", "")
    token = os.environ.get("GITHUB_TOKEN", "")
    # Cloudflare Pages has taken 41m56s for a valid deployment; keep the gate
    # exact-commit based while allowing a full hour before declaring failure.
    timeout_seconds = int(os.environ.get("CLOUDFLARE_CHECK_TIMEOUT", "3600"))
    if not repository or not sha or not token:
        print("Missing GITHUB_REPOSITORY, GITHUB_SHA, or GITHUB_TOKEN", file=sys.stderr)
        return 2

    deadline = time.monotonic() + timeout_seconds
    delay = 10
    last_label = ""
    while time.monotonic() < deadline:
        try:
            check = find_cloudflare_check(fetch_checks(repository, sha, token))
            state = check_state(check)
            label = "not-created" if check is None else f"{check.get('status')}:{check.get('conclusion') or '-'}"
            if label != last_label:
                print(f"{CHECK_NAME} for {sha[:7]}: {label}", flush=True)
                last_label = label
            if state == "success":
                return 0
            if state == "failure":
                print(f"{CHECK_NAME} failed: {check.get('details_url', '')}", file=sys.stderr)
                return 1
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            print(f"Transient check API error: {error}", flush=True)
        time.sleep(delay)
        delay = min(30, delay + 5)

    print(f"Timed out waiting for {CHECK_NAME} on {sha[:7]}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
