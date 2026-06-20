import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
  root: __dirname,  // tells Turbopack: "the root is THIS folder, not the parent"
}
};

export default nextConfig;
