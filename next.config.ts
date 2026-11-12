process.env.TZ = "Asia/Kolkata";

import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

// Resolve env vars — S3_ prefix for Amplify, AWS_ fallback for local dev
const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || "shree-kamal-records";
const S3_REGION = process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1";

const nextConfig: NextConfig = {
  turbopack: {},
  output: "standalone",
  productionBrowserSourceMaps: false,
  typescript: { ignoreBuildErrors: true },
  experimental: {
    cpus: 1,
    workerThreads: false,
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    remotePatterns: [
      {
        // Virtual-hosted style: bucket.s3.region.amazonaws.com
        protocol: "https",
        hostname: `${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`,
        pathname: "/**",
      },
      {
        // Alternate hostname (original bucket name without middle hyphen)
        protocol: "https",
        hostname: "shreekamal-records.s3.ap-south-1.amazonaws.com",
        pathname: "/**",
      },
      {
        // Path-style S3 URL format: s3.region.amazonaws.com
        protocol: "https",
        hostname: `s3.${S3_REGION}.amazonaws.com`,
        pathname: "/**",
      },
    ],
  },
};

export default withPWA(nextConfig);
