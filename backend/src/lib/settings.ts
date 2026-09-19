import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const cache = new Map<string, { value: string; at: number }>();
const TTL = 60_000;

// Read a THAM_SO setting with 60s cache
export async function getSetting(key: string, fallback = ''): Promise<string> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const row = await prisma.setting.findUnique({ where: { key } });
  const value = row?.value ?? fallback;
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function getNum(key: string, fallback = 0): Promise<number> {
  const v = parseFloat(await getSetting(key));
  return Number.isFinite(v) ? v : fallback;
}

export function clearSettingsCache() {
  cache.clear();
}
