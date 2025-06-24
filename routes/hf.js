import express from 'express';
import { sendDiscordEmbed, createHuggingFaceEmbed } from '../services/discord.js';

const router = express.Router();

/**
 * POST /webhook/huggingface
 * Handle Hugging Face repository webhook events
 */
router.post('/', async (req, res) => {
  try {
    console.log('Received Hugging Face webhook:', {
      headers: req.headers,
      body: req.body
    });

    const payload = req.body;
    
    // Validate payload structure
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid payload received');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Check if Discord webhook URL is configured
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!discordWebhookUrl) {
      console.error('DISCORD_WEBHOOK_URL not configured');
      return res.status(500).json({ error: 'Discord webhook not configured' });
    }

    // Handle different event types
    const eventType = req.headers['x-event-type'] || 'push';
    
    switch (eventType) {
      case 'push':
      case 'repo.update':
        await handleRepositoryUpdate(payload, discordWebhookUrl);
        break;
      
      default:
        console.log(`Unhandled Hugging Face event type: ${eventType}`);
        // Still send a generic notification
        await handleGenericEvent(payload, discordWebhookUrl, eventType);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      eventType 
    });

  } catch (error) {
    console.error('Error processing Hugging Face webhook:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
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
      console.log('Successfully sent Hugging Face update to Discord');
    } else {
      console.error('Failed to send Hugging Face update to Discord');
    }
    
    return success;
  } catch (error) {
    console.error('Error handling repository update:', error);
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
      color: 0xFF6B35, // Hugging Face orange
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: '📦 Repository',
          value: payload.repo?.name || payload.repository?.name || 'Unknown',
          inline: true
        },
        {
          name: '🔔 Event Type',
          value: eventType,
          inline: true
        }
      ],
      footer: {
        text: 'Hugging Face',
        icon_url: 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg'
      }
    };

    // Add repository URL if available
    const repoUrl = payload.repo?.url || payload.repository?.html_url;
    if (repoUrl) {
      embed.url = repoUrl;
    }

    const success = await sendDiscordEmbed(discordWebhookUrl, embed);
    
    if (success) {
      console.log(`Successfully sent Hugging Face ${eventType} event to Discord`);
    } else {
      console.error(`Failed to send Hugging Face ${eventType} event to Discord`);
    }
    
    return success;
  } catch (error) {
    console.error('Error handling generic event:', error);
    throw error;
  }
}

/**
 * GET /webhook/huggingface
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    service: 'Hugging Face Webhook Handler',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: 'POST /webhook/huggingface'
    }
  });
});

export default router;
