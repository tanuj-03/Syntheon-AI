// lib/webhook.ts
import crypto from 'crypto';

export function verifyWebhookSignature(options: {
  secret: string;
  payload: string;
  signature: string;
}): boolean {
  const { secret, payload, signature } = options;
  const normalizedSignature = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature;

  // Create HMAC-SHA256
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Constant-time comparison (prevents timing attacks)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(normalizedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}
