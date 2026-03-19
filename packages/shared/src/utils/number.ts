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
  if (price >= 1) {
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
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return volume.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return volume.toFixed(2);
}
