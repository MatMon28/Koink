import { ICON_SIZE, logoMarkup, TILE_RADIUS, WORDMARK_BOX, wordmarkMarkup } from '../brand/art.js';

interface BrandProps {
  className?: string;
}

/*
 * Both marks are drawn from src/brand/art.js, the one place that holds the Koink artwork. Their
 * colours are CSS variables, so the light or the dark version shows with the theme (index.css:
 * --kk-tile, --kk-tile-ink, --kk-coin). See docs/brand.md.
 */
const WORDMARK_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK_BOX.x} ${WORDMARK_BOX.y} ${WORDMARK_BOX.width} ${WORDMARK_BOX.height}" aria-hidden="true">` +
  `${wordmarkMarkup({ ink: 'currentColor', coin: 'var(--kk-coin)' })}</svg>`;

const ICON_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}"><rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${TILE_RADIUS}" fill="var(--kk-tile)"/>` +
  `${logoMarkup({ ink: 'var(--kk-tile-ink)', bg: 'var(--kk-tile)', coin: 'var(--kk-coin)' })}</svg>`;

/**
 * The name: K, the pig as the "o" with its coin above, "ink". It has no plate and takes the
 * colour of the text around it, so it follows the theme behind it; the coin keeps its own colour.
 */
export function Wordmark({ className = '' }: BrandProps) {
  return (
    <span
      role="img"
      aria-label="Koink"
      className={`koink-wordmark inline-flex items-center text-[var(--text)] [&>svg]:block [&>svg]:h-full [&>svg]:w-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: WORDMARK_SVG }}
    />
  );
}

/** The app icon on its tile: the light version in the light theme, the dark one in the dark themes. */
export function AppIcon({ className = '' }: BrandProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block aspect-square shrink-0 [&>svg]:block [&>svg]:size-full ${className}`}
      dangerouslySetInnerHTML={{ __html: ICON_SVG }}
    />
  );
}
