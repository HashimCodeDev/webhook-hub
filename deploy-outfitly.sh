#!/bin/bash

# OutFitly Deployment Script with Webhook Notifications
# Usage: ./deploy-outfitly.sh

set -e  # Exit on any error

# Configuration
PROJECT_NAME="OutFitly"
DEPLOY_HOOK_URL="https://api.vercel.com/v1/integrations/deploy/prj_0n4mnVfjJ9WlsMqIUeYqlL1mOXci/MyrH2muNAn"
WEBHOOK_HUB_URL="https://webhook-hub.onrender.com/webhook/vercel"
APP_URL="https://outfitly.vercel.app"  # Replace with your actual Vercel app URL

# Get current commit info
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "manual-deploy-$(date +%s)")
COMMIT_MESSAGE=$(git log -1 --pretty=%B 2>/dev/null || echo "Manual deployment")
BRANCH_NAME=$(git branch --show-current 2>/dev/null || echo "main")
AUTHOR_NAME=$(git log -1 --pretty=%an 2>/dev/null || echo "Unknown")

echo "🚀 Starting OutFitly deployment..."
echo "📦 Project: $PROJECT_NAME"
echo "🌿 Branch: $BRANCH_NAME"
echo "📝 Commit: $COMMIT_SHA"
echo "💬 Message: $COMMIT_MESSAGE"
echo "👤 Author: $AUTHOR_NAME"
echo ""

# Function to send webhook notification
send_notification() {
    local event_type="$1"
    local state="$2"
    local description="$3"
    
    echo "📡 Sending $event_type notification..."
    
    curl -s -X POST "$WEBHOOK_HUB_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"$event_type\",
            \"payload\": {
                \"deployment\": {
                    \"id\": \"$COMMIT_SHA\",
                    \"url\": \"$APP_URL\",
                    \"state\": \"$state\",
                    \"target\": \"production\",
                    \"meta\": {
                        \"githubCommitSha\": \"$COMMIT_SHA\",
                        \"githubCommitMessage\": \"$COMMIT_MESSAGE\",
                        \"githubBranch\": \"$BRANCH_NAME\",
                        \"githubAuthor\": \"$AUTHOR_NAME\",
                        \"deploymentMethod\": \"manual-script\"
                    }
                },
                \"project\": {
                    \"name\": \"$PROJECT_NAME\"
                }
            },
            \"region\": \"sfo1\"
        }" > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ $description notification sent successfully"
    else
        echo "⚠️  Failed to send $description notification"
    fi
}

# Send deployment.created notification
send_notification "deployment.created" "BUILDING" "Deployment started"

echo ""
echo "🔨 Triggering Vercel deployment..."

# Trigger Vercel deployment
DEPLOY_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$DEPLOY_HOOK_URL")
HTTP_CODE="${DEPLOY_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Deployment triggered successfully (HTTP $HTTP_CODE)"
    
    echo ""
    echo "⏳ Waiting for deployment to complete..."
    echo "   This usually takes 1-3 minutes for frontend deployments"
    
    # Wait and check deployment status
    for i in {1..12}; do  # Check for up to 2 minutes
        sleep 10
        echo "   Checking deployment status... ($i/12)"
        
        # Check if the app is responding
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" || echo "000")
        
        if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
            echo "✅ Deployment appears to be live! (HTTP $HTTP_STATUS)"
            send_notification "deployment.succeeded" "READY" "Deployment completed successfully"
            break
        elif [ $i -eq 12 ]; then
            echo "⚠️  Deployment may have failed or is taking longer than expected"
            send_notification "deployment.failed" "ERROR" "Deployment timeout or failed"
        fi
    done
    
else
    echo "❌ Deployment trigger failed (HTTP $HTTP_CODE)"
    send_notification "deployment.failed" "ERROR" "Deployment trigger failed"
    exit 1
fi

echo ""
echo "🎉 OutFitly deployment process complete!"
echo "🌐 App URL: $APP_URL"
echo "💬 Check Discord for deployment notifications"
echo ""
echo "📊 Deployment Summary:"
echo "   • Project: $PROJECT_NAME"
echo "   • Commit: $COMMIT_SHA"
echo "   • Branch: $BRANCH_NAME"
echo "   • Author: $AUTHOR_NAME"
echo "   • Status: Check Discord for final status"
