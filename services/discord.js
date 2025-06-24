/**
 * Discord service for sending rich embed messages to Discord webhooks
 */

/**
 * Send an embed message to Discord webhook
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} embedData - Embed data object
 * @returns {Promise<boolean>} - Success status
 */
export async function sendDiscordEmbed(webhookUrl, embedData) {
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				embeds: [embedData],
			}),
		});

		if (!response.ok) {
			console.error(
				"Discord webhook failed:",
				response.status,
				response.statusText
			);
			return false;
		}

		console.log("Discord message sent successfully");
		return true;
	} catch (error) {
		console.error("Error sending Discord message:", error);
		return false;
	}
}

/**
 * Create a Hugging Face embed for repository updates
 * @param {Object} payload - HF webhook payload
 * @returns {Object} - Discord embed object
 */
export function createHuggingFaceEmbed(payload) {
	// Extract information from the actual HF webhook payload structure
	const repoName = payload.repo?.name || "unknown";
	const repoUrl =
		payload.repo?.url?.web || `https://huggingface.co/${repoName}`;
	const repoType = payload.repo?.type || "repository";
	const headSha = payload.repo?.headSha;

	// Get updated refs information for commit details
	const updatedRefs = payload.updatedRefs || [];
	const mainRef =
		updatedRefs.find((ref) => ref.ref === "refs/heads/main") || updatedRefs[0];
	const commitSha = mainRef?.newSha || headSha;

	const embed = {
		title: `🚀 New Push to Hugging Face ${
			repoType.charAt(0).toUpperCase() + repoType.slice(1)
		}`,
		description: `A fresh commit just landed in **\`${repoName}\`**.`,
		color: 0xffd700, // Gold
		url: repoUrl,
		timestamp: new Date().toISOString(),
		thumbnail: {
			url: "https://huggingface.co/front/assets/huggingface_logo-noborder.svg",
		},
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
				name: "🆔 Commit SHA",
				value: `\`${commitSha?.slice(0, 7) || "n/a"}\``,
				inline: true,
			},
			{
				name: "📅 Time",
				value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
				inline: true,
			},
		],
		footer: {
			text: "Hugging Face • WebhookBot",
			icon_url: "https://cdn-icons-png.flaticon.com/512/5968/5968705.png",
		},
	};

	// Add updated refs information if available
	if (updatedRefs.length > 0) {
		const refsInfo = updatedRefs
			.map((ref) => {
				const refName = ref.ref
					.replace("refs/heads/", "")
					.replace("refs/tags/", "");
				const action =
					ref.oldSha === null
						? "created"
						: ref.newSha === null
						? "deleted"
						: "updated";
				return `\`${refName}\` (${action})`;
			})
			.join(", ");

		embed.fields.push({
			name: "🌿 Updated References",
			value: refsInfo,
			inline: false,
		});
	}

	return embed;
}

/**
 * Create a Vercel embed for deployment updates
 * @param {Object} payload - Vercel webhook payload
 * @returns {Object} - Discord embed object
 */
export function createVercelEmbed(payload) {
	const { deployment, project, type } = payload;

	let title, color, emoji;

	switch (type) {
		case "deployment.created":
			title = "🚀 Vercel Deployment Started";
			color = 0x0070f3; // Vercel blue
			emoji = "🚀";
			break;
		case "deployment.succeeded":
			title = "✅ Vercel Deployment Succeeded";
			color = 0x00d924; // Green
			emoji = "✅";
			break;
		case "deployment.failed":
			title = "❌ Vercel Deployment Failed";
			color = 0xff0000; // Red
			emoji = "❌";
			break;
		case "deployment.ready":
			title = "🎉 Vercel Deployment Ready";
			color = 0x00d924; // Green
			emoji = "🎉";
			break;
		default:
			title = "📦 Vercel Deployment Update";
			color = 0x0070f3;
			emoji = "📦";
	}

	const embed = {
		title: `${emoji} ${project?.name || "Project"} - ${
			title.split(" - ")[1] || "Update"
		}`,
		color,
		timestamp: new Date().toISOString(),
		fields: [
			{
				name: "🏗️ Project",
				value: project?.name || "Unknown",
				inline: true,
			},
			{
				name: "🌍 Environment",
				value: deployment?.target || "production",
				inline: true,
			},
			{
				name: "📅 Status",
				value: deployment?.state || type?.split(".")[1] || "unknown",
				inline: true,
			},
		],
		footer: {
			text: "Vercel",
			icon_url:
				"https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png",
		},
	};

	// Add deployment URL if available and ready
	if (
		deployment?.url &&
		(type === "deployment.ready" || type === "deployment.succeeded")
	) {
		embed.url = `https://${deployment.url}`;
		embed.fields.push({
			name: "🔗 Deployment URL",
			value: `[${deployment.url}](https://${deployment.url})`,
			inline: false,
		});
	}

	// Add commit info if available
	if (deployment?.meta?.githubCommitSha) {
		embed.fields.push({
			name: "🔗 Commit",
			value: `\`${deployment.meta.githubCommitSha.substring(0, 8)}\``,
			inline: true,
		});
	}

	return embed;
}

/**
 * Create a generic embed for other webhook types
 * @param {Object} options - Embed options
 * @returns {Object} - Discord embed object
 */
export function createGenericEmbed({
	title,
	description,
	color = 0x5865f2,
	fields = [],
	url = null,
}) {
	const embed = {
		title,
		description,
		color,
		timestamp: new Date().toISOString(),
		fields,
	};

	if (url) {
		embed.url = url;
	}

	return embed;
}
