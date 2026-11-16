import Image from "next/image";

/** Logo files in public/brand: [width, height] of the artwork. */
const LOGOS = {
  full: { light: "/brand/logo_transparent.png", dark: "/brand/logo_white.png", size: [1454, 512] },
  // Same logo without the tagline, for small places such as the sidebar.
  compact: { light: "/brand/logo_compact.png", dark: "/brand/logo_white_compact.png", size: [1439, 492] },
} as const;

/**
 * The Verified Kitchen logo (the websites never use the app icon).
 * `tone` follows the background: "dark" gives white lettering.
 */
export function BrandLogo({
  tone,
  height = 56,
  compact = false,
  className = "",
}: {
  tone: "light" | "dark";
  height?: number;
  compact?: boolean;
  className?: string;
}) {
  const logo = compact ? LOGOS.compact : LOGOS.full;
  const width = Math.round((height * logo.size[0]) / logo.size[1]);
  return (
    <Image
      src={tone === "dark" ? logo.dark : logo.light}
      alt="Verified Kitchen"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}
