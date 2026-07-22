#!/usr/bin/env bash
# Full-stack local: frontend React (Vite) <-> course-service trong kind.
# Chạy: bash local-lab/fullstack-up.sh   (Ctrl+C để dừng, tự dọn port-forward)
set -euo pipefail
cd "$(dirname "$0")/.."

NS=eduvn
API_PORT=8080

echo "→ port-forward course-service ($NS) :$API_PORT ..."
kubectl -n "$NS" port-forward svc/course-service "$API_PORT:80" >/tmp/eduvn-pf.log 2>&1 &
PF=$!
cleanup() { echo; echo "→ dọn dẹp..."; kill "$PF" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

# chờ backend sẵn sàng
for i in $(seq 1 20); do
  curl -sf -m2 "http://localhost:$API_PORT/healthz" >/dev/null 2>&1 && break
  sleep 0.5
done
echo "→ backend OK: http://localhost:$API_PORT/courses"

echo "→ khởi động frontend (Vite dev) trỏ vào backend..."
cd frontend
[ -d node_modules ] || npm ci
VITE_API_URL="http://localhost:$API_PORT" npm run dev
# Mở URL Vite in ra (mặc định http://localhost:5173) trên trình duyệt.
