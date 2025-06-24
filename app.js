import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import route handlers
import huggingFaceRoutes from './routes/hf.js';
import vercelRoutes from './routes/vercel.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-vercel-signature', 'x-hub-signature-256', 'x-event-type']
}));

// Request logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      console.log(message.trim());
    }
  }
}));

// Custom request logging middleware for webhook debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
  
  // Log webhook-specific headers
  const webhookHeaders = [
    'x-vercel-signature',
    'x-hub-signature-256',
    'x-event-type',
    'x-github-event',
    'x-github-delivery'
  ];
  
  webhookHeaders.forEach(header => {
    const value = req.get(header);
    if (value) {
      console.log(`[${timestamp}] Header ${header}: ${value}`);
    }
  });
  
  next();
});

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification
    req.rawBody = buf.toString('utf8');
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Webhook Hub',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /',
      huggingface: 'POST /webhook/huggingface',
      vercel: 'POST /webhook/vercel'
    },
    environment: {
      nodeVersion: process.version,
      port: PORT,
      discordConfigured: !!process.env.DISCORD_WEBHOOK_URL,
      vercelSecretConfigured: !!process.env.VERCEL_WEBHOOK_SECRET
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Mount webhook routes
app.use('/webhook/huggingface', huggingFaceRoutes);
app.use('/webhook/vercel', vercelRoutes);

// Generic webhook endpoint for testing
app.post('/webhook/test', (req, res) => {
  console.log('Test webhook received:', {
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  
  res.json({
    success: true,
    message: 'Test webhook received successfully',
    timestamp: new Date().toISOString(),
    receivedData: {
      headers: req.headers,
      body: req.body,
      query: req.query
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: {
      health: 'GET /',
      healthCheck: 'GET /health',
      huggingface: 'POST /webhook/huggingface',
      vercel: 'POST /webhook/vercel',
      test: 'POST /webhook/test'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook Hub server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤗 Hugging Face webhook: http://localhost:${PORT}/webhook/huggingface`);
  console.log(`⚡ Vercel webhook: http://localhost:${PORT}/webhook/vercel`);
  console.log(`🧪 Test webhook: http://localhost:${PORT}/webhook/test`);
  
  // Log configuration status
  console.log('\n📋 Configuration Status:');
  console.log(`   Discord Webhook: ${process.env.DISCORD_WEBHOOK_URL ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Vercel Secret: ${process.env.VERCEL_WEBHOOK_SECRET ? '✅ Configured' : '❌ Not configured (optional)'}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
