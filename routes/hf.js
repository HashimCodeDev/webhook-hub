import express from "express";
import {
	sendDiscordEmbed,
	createHuggingFaceEmbed,
} from "../services/discord.js";

const router = express.Router();

/**
 * POST /webhook/huggingface
 * Handle Hugging Face repository webhook events
 */
router.post("/", async (req, res) => {
	try {
		console.log("Received Hugging Face webhook:", {
			headers: req.headers,
			body: req.body,
		});

		const payload = req.body;

		// Validate payload structure
		if (!payload || typeof payload !== "object") {
			console.error("Invalid payload received");
			return res.status(400).json({ error: "Invalid payload" });
		}

		// Check if Discord webhook URL is configured
		const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
		if (!discordWebhookUrl) {
			console.error("DISCORD_WEBHOOK_URL not configured");
			return res.status(500).json({ error: "Discord webhook not configured" });
		}

		// Handle different event types based on the actual HF webhook structure
		const eventScope = payload.event?.scope;
		const eventAction = payload.event?.action;
		const eventType = `${eventScope}.${eventAction}`;

		console.log(`Processing Hugging Face event: ${eventType}`);

		switch (eventScope) {
			case "repo.content":
				// Code changes (commits, new branches, tags)
				await handleRepositoryUpdate(payload, discordWebhookUrl);
				break;

			case "repo":
				// Repository-level events (create, delete, update, move)
				await handleRepositoryEvent(payload, discordWebhookUrl);
				break;

			case "repo.config":
				// Configuration changes
				await handleConfigEvent(payload, discordWebhookUrl);
				break;

			case "discussion":
				// Discussion/PR events
				await handleDiscussionEvent(payload, discordWebhookUrl);
				break;

			case "discussion.comment":
				// Comment events
				await handleCommentEvent(payload, discordWebhookUrl);
				break;

			default:
				console.log(`Unhandled Hugging Face event scope: ${eventScope}`);
				// Still send a generic notification
				await handleGenericEvent(payload, discordWebhookUrl, eventType);
		}

		res.status(200).json({
			success: true,
			message: "Webhook processed successfully",
			eventType,
			eventScope,
			eventAction,
		});
	} catch (error) {
		console.error("Error processing Hugging Face webhook:", error);
		res.status(500).json({
			error: "Internal server error",
			message: error.message,
		});
	}
});

/**
 * Handle repository update events (push, commits)
 * @param {Object} payload - Webhook payload
 * @param {string} discordWebhookUrl - Discord webhook URL
 */
async function handleRepositoryUpdate(payload, discordWebhookUrl) {
	try {
		// Create Discord embed for the repository update
		const embed = createHuggingFaceEmbed(payload);

		// Send to Discord
		const success = await sendDiscordEmbed(discordWebhookUrl, embed);

		if (success) {
			console.log("Successfully sent Hugging Face update to Discord");
		} else {
			console.error("Failed to send Hugging Face update to Discord");
		}

		return success;
	} catch (error) {
		console.error("Error handling repository update:", error);
		throw error;
	}
}

/**
 * Handle repository-level events (create, delete, update, move)
 * @param {Object} payload - Webhook payload
 * @param {string} discordWebhookUrl - Discord webhook URL
 */
async function handleRepositoryEvent(payload, discordWebhookUrl) {
	try {
		const action = payload.event?.action || "updated";
		const repoName = payload.repo?.name || "Unknown";
		const repoType = payload.repo?.type || "repository";

		const embed = {
			title: `🏗️ Repository ${
				action.charAt(0).toUpperCase() + action.slice(1)
			}`,
			description: `The ${repoType} **\`${repoName}\`** was ${action}.`,
			color: 0xff6b35, // Hugging Face orange
			timestamp: new Date().toISOString(),
			fields: [
				{
					name: "📦 Repository",
					value: `\`${repoName}\``,
					inline: true,
				},
				{
					name: "🏷️ Type",
					value: `\`${repoType}\``,
					inline: true,
				},
				{
					name: "🔔 Action",
					value: `\`${action}\``,
					inline: true,
				},
			],
			footer: {
				text: "Hugging Face • WebhookBot",
				icon_url: "https://cdn-icons-png.flaticon.com/512/5968/5968705.png",
			},
		};

		if (payload.repo?.url?.web) {
			embed.url = payload.repo.url.web;
		}

		const success = await sendDiscordEmbed(discordWebhookUrl, embed);

		if (success) {
			console.log(
				`Successfully sent Hugging Face repository ${action} event to Discord`
			);
		} else {
			console.error(
				`Failed to send Hugging Face repository ${action} event to Discord`
			);
		}

		return success;
	} catch (error) {
		console.error("Error handling repository event:", error);
		throw error;
	}
}

/**
 * Handle configuration change events
 * @param {Object} payload - Webhook payload
 * @param {string} discordWebhookUrl - Discord webhook URL
 */
async function handleConfigEvent(payload, discordWebhookUrl) {
	try {
		const repoName = payload.repo?.name || "Unknown";
		const updatedConfig = payload.updatedConfig || {};
		const configKeys = Object.keys(updatedConfig);

		const embed = {
			title: `⚙️ Configuration Updated`,
			description: `Configuration changes were made to **\`${repoName}\`**.`,
			color: 0x6366f1, // Indigo
			timestamp: new Date().toISOString(),
			fields: [
				{
					name: "📦 Repository",
					value: `\`${repoName}\``,
					inline: true,
				},
				{
					name: "🔧 Updated Settings",
					value:
						configKeys.length > 0
							? configKeys.map((key) => `\`${key}\``).join(", ")
							: "Configuration updated",
					inline: false,
				},
			],
			footer: {
				text: "Hugging Face • WebhookBot",
				icon_url: "https://cdn-icons-png.flaticon.com/512/5968/5968705.png",
			},
		};

		if (payload.repo?.url?.web) {
			embed.url = payload.repo.url.web;
		}

		const success = await sendDiscordEmbed(discordWebhookUrl, embed);

		if (success) {
			console.log(
				"Successfully sent Hugging Face config update event to Discord"
			);
		} else {
			console.error(
				"Failed to send Hugging Face config update event to Discord"
			);
		}

		return success;
	} catch (error) {
		console.error("Error handling config event:", error);
		throw error;
	}
}

/**
 * Handle discussion/PR events
 * @param {Object} payload - Webhook payload
 * @param {string} discordWebhookUrl - Discord webhook URL
 */
async function handleDiscussionEvent(payload, discordWebhookUrl) {
	try {
		const action = payload.event?.action || "updated";
		const discussion = payload.discussion || {};
		const repoName = payload.repo?.name || "Unknown";
		const isPR = discussion.isPullRequest || false;
		const type = isPR ? "Pull Request" : "Discussion";

		const embed = {
			title: `💬 ${type} ${action.charAt(0).toUpperCase() + action.slice(1)}`,
			description: `A ${type.toLowerCase()} was ${action} in **\`${repoName}\`**.`,
			color: isPR ? 0x22c55e : 0x3b82f6, // Green for PR, Blue for discussion
			timestamp: new Date().toISOString(),
			fields: [
				{
					name: "📦 Repository",
					value: `\`${repoName}\``,
					inline: true,
				},
				{
					name: "📝 Title",
					value: discussion.title || "No title",
					inline: false,
				},
				{
					name: "🔔 Action",
					value: `\`${action}\``,
					inline: true,
				},
			],
			footer: {
				text: "Hugging Face • WebhookBot",
				icon_url: "https://cdn-icons-png.flaticon.com/512/5968/5968705.png",
			},
		};

		if (discussion.url?.web) {
			embed.url = discussion.url.web;
		}

		const success = await sendDiscordEmbed(discordWebhookUrl, embed);

		if (success) {
			console.log(
				`Successfully sent Hugging Face ${type} ${action} event to Discord`
			);
		} else {
			console.error(
				`Failed to send Hugging Face ${type} ${action} event to Discord`
			);
		}

		return success;
	} catch (error) {
		console.error("Error handling discussion event:", error);
		throw error;
	}
}

/**
 * Handle comment events
 * @param {Object} payload - Webhook payload
 * @param {string} discordWebhookUrl - Discord webhook URL
 */
async function handleCommentEvent(payload, discordWebhookUrl) {
	try {
		const action = payload.event?.action || "created";
		const comment = payload.comment || {};
		const discussion = payload.discussion || {};
		const repoName = payload.repo?.name || "Unknown";
		const isPR = discussion.isPullRequest || false;
		const type = isPR ? "Pull Request" : "Discussion";

		const embed = {
			title: `💭 Comment ${action.charAt(0).toUpperCase() + action.slice(1)}`,
			description: `A comment was ${action} on a ${type.toLowerCase()} in **\`${repoName}\`**.`,
			color: 0x8b5cf6, // Purple
			timestamp: new Date().toISOString(),
			fields: [
				{
					name: "📦 Repository",
					value: `\`${repoName}\``,
					inline: true,
				},
				{
					name: "📝 Discussion",
					value: discussion.title || "No title",
					inline: false,
				},
				{
					name: "💬 Comment Preview",
					value: comment.content
						? comment.content.length > 100
							? comment.content.substring(0, 100) + "..."
							: comment.content
						: "No content",
					inline: false,
				},
			],
			footer: {
				text: "Hugging Face • WebhookBot",
				icon_url: "https://cdn-icons-png.flaticon.com/512/5968/5968705.png",
			},
		};

		if (comment.url?.web) {
			embed.url = comment.url.web;
		}

		const success = await sendDiscordEmbed(discordWebhookUrl, embed);

		if (success) {
			console.log(
				`Successfully sent Hugging Face comment ${action} event to Discord`
			);
		} else {
			console.error(
				`Failed to send Hugging Face comment ${action} event to Discord`
			);
		}

		return success;
	} catch (error) {
		console.error("Error handling comment event:", error);
		throw error;
	}
}

/**
 * Handle generic/unknown event types
 * @param {Object} payload - Webhook payload
 * @param {string} discordWebhookUrl - Discord webhook URL
 * @param {string} eventType - Event type
 */
async function handleGenericEvent(payload, discordWebhookUrl, eventType) {
	try {
		const embed = {
			title: `🤗 Hugging Face Event: ${eventType}`,
			description: `Received ${eventType} event from Hugging Face`,
			color: 0xff6b35, // Hugging Face orange
			timestamp: new Date().toISOString(),
			fields: [
				{
					name: "📦 Repository",
					value: payload.repo?.name || payload.repository?.name || "Unknown",
					inline: true,
				},
				{
					name: "🔔 Event Type",
					value: eventType,
					inline: true,
				},
			],
			footer: {
				text: "Hugging Face",
				icon_url:
					"https://huggingface.co/front/assets/huggingface_logo-noborder.svg",
			},
		};

		// Add repository URL if available
		const repoUrl = payload.repo?.url || payload.repository?.html_url;
		if (repoUrl) {
			embed.url = repoUrl;
		}

		const success = await sendDiscordEmbed(discordWebhookUrl, embed);

		if (success) {
			console.log(
				`Successfully sent Hugging Face ${eventType} event to Discord`
			);
		} else {
			console.error(
				`Failed to send Hugging Face ${eventType} event to Discord`
			);
		}

		return success;
	} catch (error) {
		console.error("Error handling generic event:", error);
		throw error;
	}
}

/**
 * GET /webhook/huggingface
 * Health check endpoint
 */
router.get("/", (req, res) => {
	res.json({
		service: "Hugging Face Webhook Handler",
		status: "active",
		timestamp: new Date().toISOString(),
		endpoints: {
			webhook: "POST /webhook/huggingface",
		},
	});
});

export default router;
