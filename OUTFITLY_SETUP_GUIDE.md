# 🚀 OutFitly GitHub Actions Setup Guide

This guide will help you set up GitHub Actions to automatically send Discord notifications when your OutFitly app deploys on Vercel.

## 📁 Step 1: Create the Workflow Directory

In your OutFitly repository, create this directory structure:

```
OutFitly/
├── frontend/
├── .github/
│   └── workflows/
│       └── vercel-webhook.yml
└── ... (other files)
```

## 📝 Step 2: Add the Workflow File

1. **Create the directories** (if they don't exist):
   ```bash
   mkdir -p .github/workflows
   ```

2. **Copy the workflow file**:
   - Copy the content from `outfitly-vercel-webhook.yml` 
   - Save it as `.github/workflows/vercel-webhook.yml` in your OutFitly repository

## ⚙️ Step 3: Configure Your URLs

**You need to update these URLs in the workflow file:**

### 3.1 Production URL
Find this line in the workflow:
```yaml
VERCEL_APP_URL: your-outfitly-app.vercel.app
```

Replace with your actual Vercel app URL:
```yaml
VERCEL_APP_URL: outfitly-hashim.vercel.app  # Example
```

### 3.2 Preview URLs
Find these lines and update the username:
```yaml
echo "app_url=https://outfitly-git-${{ github.ref_name }}-your-username.vercel.app"
```

Replace `your-username` with your actual Vercel username:
```yaml
echo "app_url=https://outfitly-git-${{ github.ref_name }}-hashimcodedev.vercel.app"
```

## 🎯 Step 4: How It Works

### Automatic Triggers
The workflow will automatically run when:

1. **Push to main/master** → Production deployment notification
2. **Pull request** → Preview deployment notification  
3. **Manual trigger** → Custom deployment notification

### What Gets Notified
You'll receive Discord notifications for:

- ✅ **Deployment Started** - When code is pushed
- ✅ **Deployment Succeeded** - When OutFitly is live
- ❌ **Deployment Failed** - If something goes wrong
- 🔍 **Preview Deployments** - For pull requests

### Notification Details
Each Discord message includes:
- 📦 Project name (OutFitly)
- 🌿 Branch name
- 📝 Commit message
- 👤 Author name
- 🆔 Commit SHA
- 🌐 App URL
- 📅 Timestamp

## 🧪 Step 5: Test the Setup

### Test 1: Push to Main
```bash
git add .
git commit -m "Test deployment notification"
git push origin main
```

### Test 2: Manual Trigger
1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **🚀 OutFitly Deployment Notifications**
4. Click **Run workflow**
5. Choose deployment type and run

### Test 3: Pull Request
1. Create a new branch
2. Make changes to `frontend/` folder
3. Create a pull request
4. Check Discord for preview deployment notification

## 🔧 Customization Options

### Change Trigger Paths
To monitor different folders, update:
```yaml
paths:
  - 'frontend/**'        # Current: only frontend changes
  - 'src/**'            # Alternative: src folder
  - '**'                # Alternative: all changes
```

### Add More Environments
To support staging/development:
```yaml
branches: [main, master, staging, develop]
```

### Adjust Wait Time
To change deployment wait time:
```yaml
sleep 60  # Current: 60 seconds
sleep 120 # Alternative: 2 minutes
```

## 🎉 Expected Results

After setup, you should see Discord notifications like:

```
🚀 New Vercel Deployment
A fresh deployment just landed in OutFitly.

📦 Project: OutFitly
🌐 Environment: production  
🆔 Deployment ID: abc123def
📅 Time: Just now
🔗 View App: https://outfitly.vercel.app
```

## 🆘 Troubleshooting

### No Notifications Received
1. Check if the workflow ran in GitHub Actions tab
2. Verify the webhook hub URL is correct
3. Ensure Discord webhook is configured

### Wrong URLs in Notifications
1. Update `VERCEL_APP_URL` in the workflow
2. Update preview URL patterns with correct username

### Workflow Not Triggering
1. Ensure changes are in `frontend/` folder
2. Check branch names match (main vs master)
3. Verify workflow file is in correct location

## 📞 Support

If you need help:
1. Check GitHub Actions logs for errors
2. Test webhook hub manually: `https://webhook-hub.onrender.com/`
3. Verify Discord webhook configuration

---

🎊 **You're all set!** Your OutFitly deployments will now send beautiful Discord notifications! 🎊
