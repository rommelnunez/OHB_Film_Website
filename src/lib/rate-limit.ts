import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis client (only if env vars are present)
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Rate limiter: 10 requests per hour per IP
export const entryRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
    })
  : null;

export async function checkRateLimit(
  ip: string
): Promise<{ success: boolean; remaining: number }> {
  if (!entryRateLimit) {
    // If rate limiting is not configured, allow all requests
    return { success: true, remaining: 999 };
  }

  const result = await entryRateLimit.limit(ip);
  return { success: result.success, remaining: result.remaining };
}
