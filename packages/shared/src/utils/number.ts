/** Threshold above which prices are formatted with 2 decimal places. */
const PRICE_WHOLE_THRESHOLD = 1;

/** Volume thresholds for abbreviated formatting. */
const VOLUME_BILLION = 1_000_000_000;
const VOLUME_MILLION = 1_000_000;
const VOLUME_THOUSAND = 1_000;

/**
 * Formats a price for display with appropriate decimal places.
 * Prices >= 1 get 2 decimals, < 1 get up to 8 decimals.
 *
 * @example
 * formatPrice(45123.50) // => '45,123.50'
 * formatPrice(0.00001234) // => '0.00001234'
 */
export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '—';
  if (price >= PRICE_WHOLE_THRESHOLD) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  // For small prices, show significant digits
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

/**
 * Formats a volume value for display with abbreviations for large numbers.
 *
 * @example
 * formatVolume(1234567) // => '1.23M'
 * formatVolume(1234) // => '1,234.00'
 */
export function formatVolume(volume: number): string {
  if (!Number.isFinite(volume)) return '—';
  if (volume >= VOLUME_BILLION) {
    return `${(volume / VOLUME_BILLION).toFixed(2)}B`;
  }
  if (volume >= VOLUME_MILLION) {
    return `${(volume / VOLUME_MILLION).toFixed(2)}M`;
  }
  if (volume >= VOLUME_THOUSAND) {
    return volume.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return volume.toFixed(2);
}
