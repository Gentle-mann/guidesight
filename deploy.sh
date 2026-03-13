#!/usr/bin/env bash
# GuideSight — Google Cloud Run deployment script
# Usage: ./deploy.sh [PROJECT_ID] [REGION]
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - .env file with API keys (GOOGLE_API_KEY, STREAM_API_KEY, STREAM_API_SECRET, ANTHROPIC_API_KEY)
#   - Docker installed (for local builds) OR use Cloud Build

set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${2:-us-central1}"
REPO="guidesight"
TOKEN_SERVER_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/token-server:latest"
AGENT_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/agent:latest"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No project ID. Run: ./deploy.sh YOUR_PROJECT_ID"
  exit 1
fi

echo "=== GuideSight Cloud Run Deployment ==="
echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo ""

# Load env vars
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "Loaded .env"
else
  echo "Warning: No .env file found. Set env vars manually."
fi

# --- 1. Create Artifact Registry repo (if needed) ---
echo ""
echo "=== Step 1: Artifact Registry ==="
gcloud artifacts repositories describe "$REPO" \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null \
  || gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --project="$PROJECT_ID"

# Configure Docker auth
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# --- 2. Build and push images ---
echo ""
echo "=== Step 2: Build & Push Images ==="

echo "Building and pushing token-server..."
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t "$TOKEN_SERVER_IMAGE" \
  -f Dockerfile.token-server \
  --push \
  .

echo "Building and pushing agent..."
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t "$AGENT_IMAGE" \
  -f Dockerfile.agent \
  --push \
  .

# --- 3. Deploy token server ---
echo ""
echo "=== Step 3: Deploy Token Server ==="
gcloud run deploy guidesight-token-server \
  --image="$TOKEN_SERVER_IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --port=8080 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_API_KEY=${GOOGLE_API_KEY:-},STREAM_API_KEY=${STREAM_API_KEY:-},STREAM_API_SECRET=${STREAM_API_SECRET:-},SHISA_API_KEY=${SHISA_API_KEY:-}" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=60

# Get the token server URL
TOKEN_SERVER_URL=$(gcloud run services describe guidesight-token-server \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)")

echo "Token server deployed: $TOKEN_SERVER_URL"

# --- 4. Deploy agent ---
echo ""
echo "=== Step 4: Deploy Agent ==="
gcloud run deploy guidesight-agent \
  --image="$AGENT_IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --port=8080 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_API_KEY=${GOOGLE_API_KEY:-},STREAM_API_KEY=${STREAM_API_KEY:-},STREAM_API_SECRET=${STREAM_API_SECRET:-},ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-},TOKEN_SERVER=${TOKEN_SERVER_URL}" \
  --memory=2Gi \
  --cpu=2 \
  --no-cpu-throttling \
  --min-instances=1 \
  --max-instances=2 \
  --timeout=3600

AGENT_URL=$(gcloud run services describe guidesight-agent \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)")

echo "Agent deployed: $AGENT_URL"

# --- 5. Build and deploy frontend ---
echo ""
echo "=== Step 5: Deploy Frontend ==="
FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/frontend:latest"

echo "Building and pushing frontend with TOKEN_SERVER=$TOKEN_SERVER_URL..."
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t "$FRONTEND_IMAGE" \
  -f Dockerfile.frontend \
  --build-arg "VITE_TOKEN_SERVER=$TOKEN_SERVER_URL" \
  --push \
  .

gcloud run deploy guidesight-frontend \
  --image="$FRONTEND_IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --port=80 \
  --allow-unauthenticated \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3

FRONTEND_URL=$(gcloud run services describe guidesight-frontend \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)")

echo "Frontend deployed: $FRONTEND_URL"

# --- 6. Summary ---
echo ""
echo "========================================="
echo "  GuideSight deployed successfully!"
echo "========================================="
echo ""
echo "Frontend:     $FRONTEND_URL"
echo "Token Server: $TOKEN_SERVER_URL"
echo "Agent:        $AGENT_URL"
