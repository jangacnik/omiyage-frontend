#!/bin/sh
# Starts the real nginx.conf and checks the JSON access log, the X-Request-Id response header and that probes are
# not logged. Needs docker and curl. Run from the repository root.
set -eu
IMAGE=nginxinc/nginx-unprivileged:alpine
name=nginx-logging-test-$$
root=$(mktemp -d)
trap 'docker rm -f $name >/dev/null 2>&1 || true; rm -rf "$root"' EXIT
echo '<!doctype html><title>test</title>' > "$root/index.html"
chmod -R a+rX "$root"

docker run -d --name $name -p 127.0.0.1::8080 --add-host meishi-api.default.svc.cluster.local:127.0.0.1 \
  -v "$PWD/nginx.conf":/etc/nginx/conf.d/default.conf:ro -v "$root":/usr/share/nginx/html:ro $IMAGE >/dev/null
url=http://$(docker port $name 8080/tcp | head -1)

for _ in $(seq 1 30); do curl -fs -o /dev/null "$url/" && break; sleep 1; done
curl -fs -o /dev/null -H 'User-Agent: kube-probe/1.31' "$url/"
headers=$(curl -si "$url/some/page?token=do-not-log")

docker logs $name 2>&1 | grep '^{' > "$root/access.log" || true
printf '%s\n' "$headers" > "$root/headers.txt"
docker run --rm -v "$root":/r:ro python:3.13-alpine python -I - <<'PY'
import json
import re

headers = open("/r/headers.txt").read()
ids = re.findall(r"(?im)^x-request-id: (\S+)\s*$", headers)
assert len(ids) == 1 and re.fullmatch(r"[0-9a-f]{32}", ids[0]), f"X-Request-Id header: {ids}"

raw = open("/r/access.log").read()
assert "do-not-log" not in raw, "query string was logged"
entries = [json.loads(line) for line in raw.splitlines()]
assert len(entries) == 2, f"expected the first readiness curl and the page request only, got {entries}"
assert entries[-1]["requestId"] == ids[0], "log requestId differs from the response header"
for entry in entries:
    assert entry["level"] == "info" and entry["method"] == "GET" and entry["status"] == 200, entry
    assert isinstance(entry["requestTime"], float) and entry["time"], entry
print("nginx logging ok")
PY
