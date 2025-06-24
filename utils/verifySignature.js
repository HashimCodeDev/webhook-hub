import crypto from 'crypto';

/**
 * Verify HMAC signature for webhook security
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from request headers
 * @param {string} secret - Webhook secret
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {boolean} - Whether signature is valid
 */
export function verifyHmacSignature(payload, signature, secret, algorithm = 'sha256') {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('hex');
    
    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying HMAC signature:', error);
    return false;
  }
}

/**
 * Verify Vercel webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - x-vercel-signature header value
 * @param {string} secret - Vercel webhook secret
 * @returns {boolean} - Whether signature is valid
 */
export function verifyVercelSignature(payload, signature, secret) {
  if (!signature || !signature.startsWith('sha1=')) {
    return false;
  }

  const providedSignature = signature.replace('sha1=', '');
  return verifyHmacSignature(payload, providedSignature, secret, 'sha1');
}

/**
 * Verify GitHub webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - x-hub-signature-256 header value
 * @param {string} secret - GitHub webhook secret
 * @returns {boolean} - Whether signature is valid
 */
export function verifyGitHubSignature(payload, signature, secret) {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const providedSignature = signature.replace('sha256=', '');
  return verifyHmacSignature(payload, providedSignature, secret, 'sha256');
}

/**
 * Middleware to verify webhook signatures
 * @param {string} secretEnvVar - Environment variable name for the secret
 * @param {string} signatureHeader - Header name containing the signature
 * @param {Function} verifyFunction - Verification function to use
 * @returns {Function} - Express middleware function
 */
export function createSignatureVerificationMiddleware(secretEnvVar, signatureHeader, verifyFunction) {
  return (req, res, next) => {
    const secret = process.env[secretEnvVar];
    
    if (!secret) {
      console.warn(`Warning: ${secretEnvVar} not set, skipping signature verification`);
      return next();
    }

    const signature = req.get(signatureHeader);
    const payload = req.rawBody || JSON.stringify(req.body);

    if (!verifyFunction(payload, signature, secret)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  };
}

/**
 * Middleware to capture raw body for signature verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export function captureRawBody(req, res, next) {
  let data = '';
  
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
}
