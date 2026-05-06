import { createClient, type RedisClientType } from 'redis';

let clientPromise: Promise<RedisClientType | null> | null = null;
let connectionFailed = false;
let lastAttempt = 0;
const RETRY_AFTER_MS = 30_000;

function redisUrl() {
  return process.env.REDIS_URL?.trim().replace(/^['"]|['"]$/g, '');
}

function shouldUseRedis() {
  return process.env.VERCEL === '1' || process.env.USE_REDIS_LOCAL === '1';
}

export function hasRedisUrl() {
  return shouldUseRedis() && !!redisUrl();
}

export async function getRedisClient() {
  if (!shouldUseRedis()) return null;
  const url = redisUrl();
  if (!url || connectionFailed) return null;
  if (process.env.VERCEL !== '1' && Date.now() - lastAttempt < RETRY_AFTER_MS) return null;

  if (!clientPromise) {
    lastAttempt = Date.now();
    clientPromise = createClient({ url, socket: { connectTimeout: 5000 } })
      .on('error', (error) => {
        console.error('Redis error', error);
      })
      .connect()
      .catch((error) => {
        clientPromise = null;
        if (process.env.VERCEL !== '1') {
          connectionFailed = true;
          console.warn('Redis unavailable locally; falling back to JSON storage.', error);
          return null;
        }
        throw error;
      }) as Promise<RedisClientType | null>;
  }

  return clientPromise;
}
