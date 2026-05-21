// Bridewell crest — the real heraldic mark, ported from the prior Bridewell
// prototype's public/logo.png. Heraldry: navy chief with two fleurs-de-lis
// flanking a rose; on the field, St George's Cross with the silver dagger
// of the City of London arms in the dexter chief. The 1553 foundation by
// royal charter is a City of London institution, so the City arms appear
// alongside the Bridewell distinguishing marks.
//
// Sits top-left of every product surface at 32–40px tall per BRAND.md.

import Image from "next/image";

// New crest sourced 21 May 2026: clean (non-pixel) heraldic mark.
// 557 × 646 source aspect ratio.

const W = 557;
const H = 646;

export function Crest({ size = 36, title = "Bridewell" }: { size?: number; title?: string }) {
  const renderWidth = Math.round(size * (W / H));
  return (
    <Image
      src="/crest.png?v=2"
      alt={title}
      width={renderWidth}
      height={size}
      style={{ width: "auto", height: `${size}px` }}
      priority
      unoptimized
    />
  );
}
