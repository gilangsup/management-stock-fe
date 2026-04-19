#!/usr/bin/env sh
# WSL: "exec: node: Permission denied" when Windows Node shadows Linux, or a broken
# node is first in PATH. Prepend the first node that actually runs.
# Override: NODE_BINARY=/full/path/to/node

set -e

if [ -n "${NODE_BINARY:-}" ] && [ -x "$NODE_BINARY" ] && "$NODE_BINARY" -e "process.exit(0)" 2>/dev/null; then
  export PATH="$(dirname "$NODE_BINARY"):$PATH"
  exec "$@"
fi

if command -v node >/dev/null 2>&1; then
  NODE="$(command -v node)"
  if [ -x "$NODE" ] && "$NODE" -e "process.exit(0)" 2>/dev/null; then
    export PATH="$(dirname "$NODE"):$PATH"
    exec "$@"
  fi
fi

for n in "$HOME"/.nvm/versions/node/*/bin/node; do
  if [ -x "$n" ] && "$n" -e "process.exit(0)" 2>/dev/null; then
    export PATH="$(dirname "$n"):$PATH"
    exec "$@"
  fi
done

for n in /usr/local/bin/node /usr/bin/node; do
  if [ -x "$n" ] && "$n" -e "process.exit(0)" 2>/dev/null; then
    export PATH="$(dirname "$n"):$PATH"
    exec "$@"
  fi
done

echo "with-working-node.sh: no usable node binary found. Set NODE_BINARY or fix PATH." >&2
exit 127
