#!/bin/bash
# Test script for ANAF endpoint
# Usage: ./test-anaf-endpoint.sh <CUI>

CUI=${1:-29496051}
DATE=$(date +%Y-%m-%d)

echo "Testing ANAF endpoint with CUI: $CUI, Date: $DATE"
echo ""

echo "=== Testing v8 endpoint ==="
curl -X POST "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva" \
  -H "Content-Type: application/json" \
  -H "User-Agent: RoMarketCap/1.0" \
  -d "[{\"cui\":$CUI,\"data\":\"$DATE\"}]" \
  -v

echo ""
echo "=== Testing v7 endpoint ==="
curl -X POST "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v7/ws/tva" \
  -H "Content-Type: application/json" \
  -H "User-Agent: RoMarketCap/1.0" \
  -d "[{\"cui\":$CUI,\"data\":\"$DATE\"}]" \
  -v
