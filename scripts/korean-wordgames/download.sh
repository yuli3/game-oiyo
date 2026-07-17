#!/bin/bash
# FastText Korean vectors (CC BY-SA 3.0) — 1.2GB, 최초 1회.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .cache
[ -f .cache/cc.ko.300.vec.gz ] && { echo "already downloaded"; exit 0; }
curl -L -o .cache/cc.ko.300.vec.gz https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.ko.300.vec.gz
echo "done: $(ls -lh .cache/cc.ko.300.vec.gz | awk '{print $5}')"
