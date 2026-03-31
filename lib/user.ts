import { prisma } from "./prisma";
import { getDefaultUserId } from "./env";

export async function ensureDefaultUser() {
  const id = getDefaultUserId();
  await prisma.user.upsert({
    where: { id },
    create: { id },
    update: {},
  });
  return id;
}
