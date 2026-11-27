import type { NextConfig } from "next";

/** Kitchen banners and dish photos are served from the project's public Storage bucket. */
function mediaPattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  const { protocol, hostname, port } = new URL(url);
  return [
    {
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      port,
      pathname: "/storage/v1/object/public/kitchen-media/**",
      search: "",
    },
  ];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: mediaPattern(),
  },
};

export default nextConfig;
