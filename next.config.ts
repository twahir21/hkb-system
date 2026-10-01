import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /jobs application form uploads up to six documents (2 MB each) through
  // a Server Action — the default 1 MB body limit would reject it.
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
