/**
 * Archival imagery ledger.
 *
 * Every stock photograph used in the product is recorded here with its
 * alt text and source, instead of being hotlinked ad hoc from views.
 * URLs use Unsplash's image CDN with `auto=format` (AVIF/WebP negotiation)
 * and explicit widths so the browser can pick a responsive candidate via
 * `srcSet`/`sizes` rather than always downloading the largest file.
 * Verify the live Unsplash licence text at download time before adding
 * new photographs.
 */
export interface ArchiveImage {
  /** Fallback `src` (960w). */
  src: string;
  srcSet: string;
  sizes: string;
  alt: string;
  credit: string;
}

const UNSPLASH_WIDTHS = [640, 960, 1440] as const;

export function unsplashImage(
  photoId: string,
  alt: string,
  sizes = "(min-width: 1024px) 50vw, 100vw",
): ArchiveImage {
  const base = `https://images.unsplash.com/photo-${photoId}?q=80&auto=format&fit=crop`;
  return {
    src: `${base}&w=960`,
    srcSet: UNSPLASH_WIDTHS.map((width) => `${base}&w=${width} ${width}w`).join(
      ", ",
    ),
    sizes,
    alt,
    credit: "Photo via Unsplash",
  };
}

/** Curated feed echoes (src/views/Feed.tsx `curatedEchoes`). */
export const feedImages: Record<number, ArchiveImage> = {
  1: unsplashImage(
    "1755715367389-861e189b9e83",
    "Temple of Poseidon, Sounion, Greece",
  ),
  2: unsplashImage(
    "1585829365295-ab7cd400c167",
    "Newspapers illustrating the circulation of information",
  ),
  3: unsplashImage(
    "1461360370896-922624d12aa1",
    "People walking across a vast open landscape",
  ),
  4: unsplashImage(
    "1541185933-ef5d8ed016c2",
    "Rocket lifting off from a launch pad",
  ),
  5: unsplashImage(
    "1503945438517-f65904a52ce6",
    "Crowd gathered in a city street",
  ),
};

/** Feed sidebar (confidence-states panel). */
export const feedAsideImage: ArchiveImage = unsplashImage(
  "1544654803-b69140b285a1",
  "An open book, eyeglasses and a laptop on a desk",
  "(min-width: 1024px) 33vw, 100vw",
);

/** Build a responsive `srcSet` for an existing Unsplash CDN URL. */
export function responsiveSrcSet(url: string): string | undefined {
  if (!url.includes("images.unsplash.com")) return undefined;
  const widths = [640, 960, 1440] as const;
  return widths
    .map((width) => {
      const next = url.replace(/([?&])w=\d+/, `$1w=${width}`);
      return `${next} ${width}w`;
    })
    .join(", ");
}

/** Landing hero — archival trade-route photograph. */
export const landingHeroImage: ArchiveImage = unsplashImage(
  "1461360370896-922624d12aa1",
  "Travellers crossing an open plain under a wide sky",
  "(min-width: 1024px) 45vw, 100vw",
);

/** Local editorial photography, inspected during the November 2026 redesign.
 * Used as conceptual illustration, never as documentary evidence of a news event.
 * Unsplash license reviewed: https://unsplash.com/license (2026-11-02).
 */
export const editorialPhotography = {
  port: {
    src: "/images/trade-port.jpg",
    alt: "Cargo ships and cranes at a container port",
    source: "https://images.unsplash.com/photo-1578575437130-527eed3abbec",
    credit: "Photo via Unsplash",
  },
  temple: {
    src: "/images/temple-of-poseidon.jpg",
    alt: "The Temple of Poseidon at Sounion, Greece",
    source: "https://unsplash.com/photos/_8meA468pH8",
    credit: "Bikash Guragai / Unsplash",
  },
  library: {
    src: "/images/reading-room.jpg",
    alt: "Books arranged on wooden library shelves",
    source: "https://images.unsplash.com/photo-1507842217343-583bb7270b66",
    credit: "Photo via Unsplash",
  },
} as const;
