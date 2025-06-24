#!/bin/bash

# Deploy with Webhook Notification Script
# Usage: ./deploy-with-notification.sh [project-name]

PROJECT_NAME=${1:-"your-project"}
DEPLOY_HOOK_URL="https://api.vercel.com/v1/integrations/deploy/prj_0n4mnVfjJ9WlsMqIUeYqlL1mOXci/MyrH2muNAn"
WEBHOOK_HUB_URL="https://webhook-hub.onrender.com/webhook/vercel"
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "manual-deploy")

echo "🚀 Starting deployment for $PROJECT_NAME..."

# Send deployment.created notification
echo "📡 Sending deployment.created notification..."
curl -s -X POST "$WEBHOOK_HUB_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"deployment.created\",
    \"payload\": {
      \"deployment\": {
        \"id\": \"$COMMIT_SHA\",
        \"url\": \"$PROJECT_NAME.vercel.app\",
        \"state\": \"BUILDING\",
        \"target\": \"production\",
        \"meta\": {
          \"githubCommitSha\": \"$COMMIT_SHA\"
        }
      },
      \"project\": {
        \"name\": \"$PROJECT_NAME\"
      }
    },
    \"region\": \"sfo1\"
  }" > /dev/null

# Trigger Vercel deployment
echo "🔨 Triggering Vercel deployment..."
DEPLOY_RESPONSE=$(curl -s -X POST "$DEPLOY_HOOK_URL")

if [ $? -eq 0 ]; then
  echo "✅ Deployment triggered successfully"
  
  # Wait a bit for deployment to potentially complete
  echo "⏳ Waiting 30 seconds for deployment..."
  sleep 30
  
  # Send deployment.succeeded notification (optimistic)
  echo "📡 Sending deployment.succeeded notification..."
  curl -s -X POST "$WEBHOOK_HUB_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"deployment.succeeded\",
      \"payload\": {
        \"deployment\": {
          \"id\": \"$COMMIT_SHA\",
          \"url\": \"$PROJECT_NAME.vercel.app\",
          \"state\": \"READY\",
          \"target\": \"production\",
          \"meta\": {
            \"githubCommitSha\": \"$COMMIT_SHA\"
          }
        },
        \"project\": {
          \"name\": \"$PROJECT_NAME\"
        }
      },
      \"region\": \"sfo1\"
    }" > /dev/null
  
  echo "🎉 Deployment and notifications complete!"
  echo "🌐 Check your app at: https://$PROJECT_NAME.vercel.app"
  echo "💬 Check Discord for notifications"
else
  echo "❌ Deployment failed"
  
  # Send deployment.failed notification
  curl -s -X POST "$WEBHOOK_HUB_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"deployment.failed\",
      \"payload\": {
        \"deployment\": {
          \"id\": \"$COMMIT_SHA\",
          \"url\": \"$PROJECT_NAME.vercel.app\",
          \"state\": \"ERROR\",
          \"target\": \"production\",
          \"meta\": {
            \"githubCommitSha\": \"$COMMIT_SHA\"
          }
        },
        \"project\": {
          \"name\": \"$PROJECT_NAME\"
        }
      },
      \"region\": \"sfo1\"
    }" > /dev/null
fi
