#!/usr/bin/env bash
# Watchdog for expiry-alert API: streams container logs and appends any
# captured unhandledRejection / uncaughtException (with a window of
# surrounding context) into a file. Read-only, non-invasive — does not
# touch the app, the DB, or any user data.
#
# Usage (foreground):
#   ./scripts/watch-unhandled-rejections.sh
#
# Usage (background, tmux):
#   tmux new-session -d -s expiry-watchdog \
#     '/root/expiry-alert/scripts/watch-unhandled-rejections.sh'
#
# Usage (systemd one-shot via systemd-run, no unit file needed):
#   sudo systemd-run --unit expiry-alert-watchdog --description='watch API rejections' \
#     /root/expiry-alert/scripts/watch-unhandled-rejections.sh
#   # stop:  sudo systemctl stop expiry-alert-watchdog
#
# Stop the foreground/tmux run with Ctrl-C or `tmux kill-session -t expiry-watchdog`.

set -u
set -o pipefail

CONTAINER="${CONTAINER:-expiry-alert-expiryalert-api-1}"
OUT="${OUT:-/var/log/expiry-alert-rejections.log}"
CONTEXT_LINES="${CONTEXT_LINES:-25}"
CONTEXT_BEFORE="${CONTEXT_BEFORE:-10}"
SINCE="${SINCE:-1s}"

# Ensure output is writable; fall back to /tmp if /var/log is not.
if ! ( : >>"$OUT" ) 2>/dev/null; then
  OUT="/tmp/expiry-alert-rejections.log"
  : >>"$OUT" || { echo "watchdog: cannot write $OUT" >&2; exit 1; }
fi

echo "[watchdog $(date -Iseconds)] start container=$CONTAINER out=$OUT before=$CONTEXT_BEFORE after=$CONTEXT_LINES" \
  | tee -a "$OUT"

# Need docker; fall back to sudo if the calling user is not in docker group.
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi

# Stream with timestamps, line-buffered grep, N lines before/after each hit.
# Before-context is critical: it usually contains the HTTP request line
# whose handler scheduled the rejecting promise.
# Outer loop reconnects after docker compose recreates the container
# (the docker logs stream dies but the container name persists).
while true; do
  "${DOCKER[@]}" logs --since "$SINCE" --timestamps --follow "$CONTAINER" 2>&1 \
    | grep --line-buffered -E -B "$CONTEXT_BEFORE" -A "$CONTEXT_LINES" \
        '\[unhandledRejection\]|\[uncaughtException\]' \
    | while IFS= read -r line; do
        printf '%s\n' "$line" | tee -a "$OUT"
      done
  echo "[watchdog $(date -Iseconds)] log stream ended — reconnecting in 5s" \
    | tee -a "$OUT"
  sleep 5
done
