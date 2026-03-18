/**
 * A community-published indicator available in the marketplace.
 */
export interface MarketplaceIndicator {
  /** Unique indicator ID */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Author username */
  author: string;
  /** Version string (semver) */
  version: string;
  /** Category tag */
  category: MarketplaceCategory;
  /** JavaScript source code of the indicator */
  source: string;
  /** Number of installs/users */
  installs: number;
  /** Average rating (1-5) */
  rating: number;
  /** Number of ratings */
  ratingCount: number;
  /** Publish timestamp (unix ms) */
  publishedAt: number;
  /** Last update timestamp (unix ms) */
  updatedAt: number;
  /** Tags for search */
  tags: string[];
}

/** Marketplace indicator categories. */
export type MarketplaceCategory =
  | 'trend'
  | 'momentum'
  | 'volatility'
  | 'volume'
  | 'orderflow'
  | 'custom'
  | 'utility';

/** Sort options for marketplace listing. */
export type MarketplaceSortBy = 'popular' | 'recent' | 'top-rated' | 'name';

/**
 * An installed marketplace indicator (local copy).
 */
export interface InstalledIndicator {
  /** Marketplace indicator ID */
  indicatorId: string;
  /** Installed version */
  version: string;
  /** Local indicator name (may differ from marketplace) */
  name: string;
  /** Source code (cached locally) */
  source: string;
  /** Whether this indicator is enabled */
  enabled: boolean;
  /** Install timestamp */
  installedAt: number;
}
