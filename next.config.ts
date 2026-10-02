import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The public /jobs page moved to the marketing website — keep old links
  // (shared posters, WhatsApp messages) working.
  async redirects() {
    return [
      {
        source: "/jobs",
        destination: "https://www.hkbprotection.co.tz/jobs",
        permanent: true,
      },
    ];
  },
  // Legacy server-action uploads (superseded by POST /api/job-applications):
  // the /jobs application form uploads up to eight documents (2 MB each) —
  // the default 1 MB body limit would reject it.
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
