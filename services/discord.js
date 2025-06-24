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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embedData]
      })
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
      return false;
    }

    console.log('Discord message sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending Discord message:', error);
    return false;
  }
}

/**
 * Create a Hugging Face embed for repository updates
 * @param {Object} payload - HF webhook payload
 * @returns {Object} - Discord embed object
 */
export function createHuggingFaceEmbed(payload) {
  const { repo, commits, ref } = payload;
  const latestCommit = commits?.[0];
  
  const embed = {
    title: `🔥 HF Push to ${repo?.name || 'repository'}`,
    description: latestCommit?.message || 'Repository updated',
    color: 0xFF6B35, // Hugging Face orange
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: '👤 Author',
        value: latestCommit?.author?.name || 'Unknown',
        inline: true
      },
      {
        name: '🌿 Branch',
        value: ref?.replace('refs/heads/', '') || 'main',
        inline: true
      },
      {
        name: '📦 Repository',
        value: repo?.name || 'Unknown',
        inline: true
      }
    ],
    footer: {
      text: 'Hugging Face',
      icon_url: 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg'
    }
  };

  // Add repository URL if available
  if (repo?.url) {
    embed.url = repo.url;
  }

  // Add commit ID if available
  if (latestCommit?.id) {
    embed.fields.push({
      name: '🔗 Commit',
      value: `\`${latestCommit.id.substring(0, 8)}\``,
      inline: true
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
    case 'deployment.created':
      title = '🚀 Vercel Deployment Started';
      color = 0x0070F3; // Vercel blue
      emoji = '🚀';
      break;
    case 'deployment.succeeded':
      title = '✅ Vercel Deployment Succeeded';
      color = 0x00D924; // Green
      emoji = '✅';
      break;
    case 'deployment.failed':
      title = '❌ Vercel Deployment Failed';
      color = 0xFF0000; // Red
      emoji = '❌';
      break;
    case 'deployment.ready':
      title = '🎉 Vercel Deployment Ready';
      color = 0x00D924; // Green
      emoji = '🎉';
      break;
    default:
      title = '📦 Vercel Deployment Update';
      color = 0x0070F3;
      emoji = '📦';
  }

  const embed = {
    title: `${emoji} ${project?.name || 'Project'} - ${title.split(' - ')[1] || 'Update'}`,
    color,
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: '🏗️ Project',
        value: project?.name || 'Unknown',
        inline: true
      },
      {
        name: '🌍 Environment',
        value: deployment?.target || 'production',
        inline: true
      },
      {
        name: '📅 Status',
        value: deployment?.state || type?.split('.')[1] || 'unknown',
        inline: true
      }
    ],
    footer: {
      text: 'Vercel',
      icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png'
    }
  };

  // Add deployment URL if available and ready
  if (deployment?.url && (type === 'deployment.ready' || type === 'deployment.succeeded')) {
    embed.url = `https://${deployment.url}`;
    embed.fields.push({
      name: '🔗 Deployment URL',
      value: `[${deployment.url}](https://${deployment.url})`,
      inline: false
    });
  }

  // Add commit info if available
  if (deployment?.meta?.githubCommitSha) {
    embed.fields.push({
      name: '🔗 Commit',
      value: `\`${deployment.meta.githubCommitSha.substring(0, 8)}\``,
      inline: true
    });
  }

  return embed;
}

/**
 * Create a generic embed for other webhook types
 * @param {Object} options - Embed options
 * @returns {Object} - Discord embed object
 */
export function createGenericEmbed({ title, description, color = 0x5865F2, fields = [], url = null }) {
  const embed = {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    fields
  };

  if (url) {
    embed.url = url;
  }

  return embed;
}
