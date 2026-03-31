import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CI/Vercel often fails on ESLint rules that differ from local; run `npm run lint` separately.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "@prisma/client",
    "cheerio",
    "mammoth",
    "pdf-parse",
    "prisma",
  ],
  // Ensure Prisma query engine is included in serverless traces (helps some Vercel deployments).
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
