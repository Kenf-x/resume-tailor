import { prisma } from "./prisma";
import { getDefaultUserId } from "./env";
import { disableDbFallbackMode, useDb } from "./fallback-store";

export async function ensureDefaultUser() {
  const id = getDefaultUserId();
  if (!useDb()) {
    return id;
  }
  try {
    await prisma.user.upsert({
      where: { id },
      create: { id },
      update: {},
    });
  } catch (error) {
    // If DB connectivity/config is broken in serverless, continue with in-memory fallback mode.
    console.error("DB unavailable, switching to fallback mode:", error);
    disableDbFallbackMode();
  }
  return id;
}
