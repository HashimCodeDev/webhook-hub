import express from 'express';
import { sendDiscordEmbed, createVercelEmbed } from '../services/discord.js';
import { createSignatureVerificationMiddleware, verifyVercelSignature } from '../utils/verifySignature.js';

const router = express.Router();

// Middleware to verify Vercel webhook signatures (optional but recommended)
const verifyVercelWebhook = createSignatureVerificationMiddleware(
  'VERCEL_WEBHOOK_SECRET',
  'x-vercel-signature',
  verifyVercelSignature
);

/**
 * POST /webhook/vercel
 * Handle Vercel deployment webhook events
 */
router.post('/', verifyVercelWebhook, async (req, res) => {
  try {
    console.log('Received Vercel webhook:', {
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

    // Get event type from payload
    const eventType = payload.type || 'deployment.unknown';
    
    // Handle different deployment events
    switch (eventType) {
      case 'deployment.created':
      case 'deployment.succeeded':
      case 'deployment.failed':
      case 'deployment.ready':
      case 'deployment.canceled':
        await handleDeploymentEvent(payload, discordWebhookUrl);
        break;
      
      default:
        console.log(`Unhandled Vercel event type: ${eventType}`);
        // Still send a generic notification for unknown events
        await handleGenericEvent(payload, discordWebhookUrl, eventType);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      eventType 
    });

  } catch (error) {
    console.error('Error processing Vercel webhook:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * Handle deployment events
 * @param {Object} payload - Webhook payload
 * @param {string} discordWebhookUrl - Discord webhook URL
 */
async function handleDeploymentEvent(payload, discordWebhookUrl) {
  try {
    // Create Discord embed for the deployment event
    const embed = createVercelEmbed(payload);
    
    // Send to Discord
    const success = await sendDiscordEmbed(discordWebhookUrl, embed);
    
    if (success) {
      console.log(`Successfully sent Vercel ${payload.type} event to Discord`);
    } else {
      console.error(`Failed to send Vercel ${payload.type} event to Discord`);
    }
    
    return success;
  } catch (error) {
    console.error('Error handling deployment event:', error);
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
      title: `⚡ Vercel Event: ${eventType}`,
      description: `Received ${eventType} event from Vercel`,
      color: 0x0070F3, // Vercel blue
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: '🏗️ Project',
          value: payload.project?.name || 'Unknown',
          inline: true
        },
        {
          name: '🔔 Event Type',
          value: eventType,
          inline: true
        }
      ],
      footer: {
        text: 'Vercel',
        icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png'
      }
    };

    // Add deployment URL if available
    if (payload.deployment?.url) {
      embed.url = `https://${payload.deployment.url}`;
    }

    const success = await sendDiscordEmbed(discordWebhookUrl, embed);
    
    if (success) {
      console.log(`Successfully sent Vercel ${eventType} event to Discord`);
    } else {
      console.error(`Failed to send Vercel ${eventType} event to Discord`);
    }
    
    return success;
  } catch (error) {
    console.error('Error handling generic event:', error);
    throw error;
  }
}

/**
 * GET /webhook/vercel
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    service: 'Vercel Webhook Handler',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: 'POST /webhook/vercel'
    },
    security: {
      signatureVerification: process.env.VERCEL_WEBHOOK_SECRET ? 'enabled' : 'disabled'
    }
  });
});

export default router;
