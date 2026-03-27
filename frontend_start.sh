#!/bin/bash
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1
mkdir -p logs
export CHOKIDAR_USEPOLLING=true
export CHOKIDAR_INTERVAL=1000

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting live-server..." | tee -a logs/frontend.log

stdbuf -oL -eL live-server --no-browser --cors project/frontend   --entry-file=index.html   --watch-use-polling   --watch-interval=1000   --port=5173   --host=0.0.0.0 2>&1 |   while IFS= read -r line; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
  done >> logs/frontend.log &
