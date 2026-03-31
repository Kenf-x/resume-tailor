import fs from "fs/promises";
import path from "path";
import { getUploadDir } from "./env";

export async function ensureUploadDir(): Promise<string> {
  const dir = path.resolve(process.cwd(), getUploadDir());
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function storagePathFor(fileId: string, originalName: string): string {
  const ext = path.extname(originalName) || ".bin";
  return path.join(getUploadDir(), `${fileId}${ext}`);
}

export async function saveUploadedFile(
  buffer: Buffer,
  fileId: string,
  originalName: string
): Promise<string> {
  const dir = await ensureUploadDir();
  const relative = path.join(getUploadDir(), `${fileId}${path.extname(originalName) || ".bin"}`);
  const absolute = path.join(dir, `${fileId}${path.extname(originalName) || ".bin"}`);
  await fs.writeFile(absolute, buffer);
  return relative;
}

export async function readStoredFile(relativePath: string): Promise<Buffer> {
  const absolute = path.resolve(process.cwd(), relativePath);
  return fs.readFile(absolute);
}
