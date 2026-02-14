#!/bin/bash
# SVT.one Validator Income Report
# Usage: ./svt-validator-income.sh [epochs] (default: last 3 completed epochs)
# Requires: SVT_API_TOKEN in ~/.config/env/global.env

source ~/.config/env/global.env

VALIDATORS=(
  "Ded Monkes|dedxrPfNqPKBRmUyP9LDkaitpQzU6PD44jA6GP9Ndhk|5|85"
  "Gojira|goJiRADNdmfnJ4iWEyft7KaYMPTVsRba2Ee1akDEBXb|5|62.5"
  "Nebula|nebu1WnZBrFZz5X7sfPWuEqyb8LBSsrXpxaesnK9CRE|0|62.5"
  "Kisetsu|fuyugZxM5S4NyV3ZYoc6ebs3fmRTrZ3X27MKCFvHpVD|5|85"
)

BASE_URL="https://api.svt.one"

# Get current epoch from Solana RPC
CURRENT_EPOCH=$(curl -s https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getEpochInfo"}' | jq '.result.epoch')

NUM_EPOCHS=${1:-3}
START_EPOCH=$((CURRENT_EPOCH - NUM_EPOCHS))

echo "Fetching validator data from SVT.one for epochs $((START_EPOCH+1))-$((CURRENT_EPOCH-1))..."
echo ""

# Output JSON for agent consumption
OUTPUT="["
FIRST=true

for v in "${VALIDATORS[@]}"; do
  IFS='|' read -r NAME VOTE COMMISSION BRANDON_PCT <<< "$v"
  
  for epoch in $(seq $((START_EPOCH)) $((CURRENT_EPOCH - 1))); do
    DATA=$(curl -s "${BASE_URL}/validators-history?network=mainnet&voteId=${VOTE}&epoch=${epoch}" \
      -H "Authorization: Bearer ${SVT_API_TOKEN}" | jq -r ".data[] | select(.voteId==\"${VOTE}\")")
    
    if [ -n "$DATA" ]; then
      if [ "$FIRST" = true ]; then FIRST=false; else OUTPUT+=","; fi
      OUTPUT+=$(echo "$DATA" | jq -c "{name: \"$NAME\", epoch: .epoch, commissionReward, votingReward, jitoReward, totalStake, fee, mevCommission, apy, jitoApy, leaderSlotsTotal, leaderSlotsDone, skippedSlots, brandonPct: $BRANDON_PCT}")
    fi
  done
done

OUTPUT+="]"
echo "$OUTPUT" | jq .
