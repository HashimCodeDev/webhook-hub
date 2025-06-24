# 🚀 Webhook Hub

A Node.js Express application that receives and handles webhooks from multiple services including Hugging Face and Vercel, sending rich embed notifications to Discord.

## ✨ Features

- **Multi-service webhook support**: Hugging Face, Vercel, and easily extensible for GitHub, Stripe, etc.
- **Rich Discord notifications**: Beautiful embed messages with timestamps, fields, and links
- **Security**: HMAC signature verification for Vercel and GitHub webhooks
- **Organized structure**: Modular routes, services, and utilities
- **Request logging**: Comprehensive logging for debugging and monitoring
- **Health checks**: Built-in endpoints for monitoring
- **Easy deployment**: Ready for Render, Railway, Vercel, or any Node.js hosting platform

## 📁 Project Structure

```
webhook-hub/
├── app.js                 # Express application entry point
├── routes/
│   ├── hf.js             # Hugging Face webhook handler
│   └── vercel.js         # Vercel webhook handler
├── services/
│   └── discord.js        # Discord embed formatting and sending
├── utils/
│   └── verifySignature.js # HMAC signature verification
├── .env.example          # Environment variables template
└── package.json          # Dependencies and scripts
```

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd webhook-hub
pnpm install
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your Discord webhook URL:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### 3. Get Discord Webhook URL

1. Go to your Discord server
2. Server Settings → Integrations → Webhooks
3. Create New Webhook or use existing one
4. Copy the Webhook URL

### 4. Run the Application

```bash
# Development mode
pnpm run dev

# Production mode
pnpm start
```

The server will start on `http://localhost:3000`

## 🔗 Webhook Endpoints

### Hugging Face Webhook

- **URL**: `POST /webhook/huggingface`
- **Purpose**: Receives repository update notifications
- **Discord Message**: Rich embed with commit info, author, branch, and repository details

### Vercel Webhook

- **URL**: `POST /webhook/vercel`
- **Purpose**: Receives deployment status notifications
- **Discord Message**: Rich embed with deployment status, project info, and deployment URL
- **Security**: Optional HMAC signature verification

### Test Webhook

- **URL**: `POST /webhook/test`
- **Purpose**: Testing and debugging webhook payloads

## 🧪 Testing with cURL

### Test Hugging Face Webhook

```bash
curl -X POST http://localhost:3000/webhook/huggingface \
  -H "Content-Type: application/json" \
  -H "x-event-type: push" \
  -d '{
    "repo": {
      "name": "my-awesome-model",
      "url": "https://huggingface.co/username/my-awesome-model"
    },
    "commits": [{
      "id": "abc123def456",
      "message": "Update model weights and documentation",
      "author": {
        "name": "John Doe"
      }
    ],
    "ref": "refs/heads/main"
  }'
```

### Test Vercel Webhook

```bash
curl -X POST http://localhost:3000/webhook/vercel \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deployment.succeeded",
    "deployment": {
      "id": "dpl_123456",
      "url": "my-app-abc123.vercel.app",
      "state": "READY",
      "target": "production",
      "meta": {
        "githubCommitSha": "abc123def456"
      }
    },
    "project": {
      "name": "my-awesome-app"
    }
  }'
```

### Test Generic Webhook

```bash
curl -X POST http://localhost:3000/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello from webhook test!",
    "timestamp": "2024-01-01T12:00:00Z"
  }'
```

## 📮 Postman Collection

You can also test using Postman. Here are the request configurations:

### Hugging Face Webhook Request

- **Method**: POST
- **URL**: `http://localhost:3000/webhook/huggingface`
- **Headers**:
  - `Content-Type: application/json`
  - `x-event-type: push`
- **Body** (raw JSON): Use the JSON from the cURL example above

### Vercel Webhook Request

- **Method**: POST
- **URL**: `http://localhost:3000/webhook/vercel`
- **Headers**:
  - `Content-Type: application/json`
- **Body** (raw JSON): Use the JSON from the cURL example above

## 🔧 Configuration

### Environment Variables

| Variable                | Required | Description                                      |
| ----------------------- | -------- | ------------------------------------------------ |
| `DISCORD_WEBHOOK_URL`   | ✅ Yes   | Discord webhook URL for notifications            |
| `VERCEL_WEBHOOK_SECRET` | ❌ No    | Secret for Vercel webhook signature verification |
| `GITHUB_WEBHOOK_SECRET` | ❌ No    | Secret for GitHub webhook signature verification |
| `PORT`                  | ❌ No    | Server port (default: 3000)                      |
| `NODE_ENV`              | ❌ No    | Environment mode (development/production)        |
| `ALLOWED_ORIGINS`       | ❌ No    | CORS allowed origins (comma-separated)           |

### Setting up Webhook Secrets (Recommended)

For production deployments, enable signature verification:

1. **Vercel**: In your project settings, add a webhook with a secret
2. **GitHub**: In repository settings, add a webhook with a secret
3. Set the corresponding environment variables in your deployment platform

## 🚀 Deployment

### Deploy to Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `pnpm install`
4. Set start command: `pnpm start`
5. Add environment variables in Render dashboard

### Deploy to Railway

1. Connect your GitHub repository to Railway
2. Railway will auto-detect the Node.js app
3. Add environment variables in Railway dashboard
4. Deploy automatically on git push

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Add environment variables via Vercel dashboard
4. Note: Vercel has serverless limitations for webhook receivers

## 🔌 Adding New Webhook Providers

The application is designed for easy extension. To add a new provider (e.g., GitHub, Stripe):

### 1. Create a new route file

```javascript
// routes/github.js
import express from "express";
import { sendDiscordEmbed, createGenericEmbed } from "../services/discord.js";

const router = express.Router();

router.post("/", async (req, res) => {
	// Handle GitHub webhook logic
	const embed = createGenericEmbed({
		title: "🐙 GitHub Event",
		description: "Repository activity detected",
		color: 0x24292e,
	});

	await sendDiscordEmbed(process.env.DISCORD_WEBHOOK_URL, embed);
	res.json({ success: true });
});

export default router;
```

### 2. Mount the route in app.js

```javascript
import githubRoutes from "./routes/github.js";
app.use("/webhook/github", githubRoutes);
```

### 3. Add signature verification if needed

Use the utilities in `utils/verifySignature.js` for HMAC verification.

## 🐛 Troubleshooting

### Common Issues

1. **Discord messages not sending**

   - Check `DISCORD_WEBHOOK_URL` is correctly set
   - Verify the webhook URL is valid and active
   - Check server logs for error messages

2. **Signature verification failing**

   - Ensure webhook secrets match between service and environment variables
   - Check that raw body is being captured correctly
   - Verify the signature format matches the service's specification

3. **Port already in use**
   - Change the `PORT` environment variable
   - Kill existing processes: `pkill -f node`

### Debug Mode

Set `NODE_ENV=development` for detailed error messages and request logging.

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the server logs for error messages
3. Test with the `/webhook/test` endpoint first
4. Open an issue on GitHub with detailed information

---

Made with ❤️ for the developer community
