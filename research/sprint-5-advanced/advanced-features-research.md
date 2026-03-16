# Advanced Trading Platform Features Research
## Date: 2026-03-16

---

## 1. VWAP Suite

### Core Formula (O(1) per update — no historical storage needed)
```
Typical Price = (High + Low + Close) / 3
VWAP = Sum(TP * Volume) / Sum(Volume)
```

Three running accumulators: `sumPV`, `sumV`, `sumP2V` (for std dev bands)

### Variants
- **Session VWAP** — Resets at session open. Institutional benchmark.
- **Rolling VWAP** — Sliding window of N bars. Requires ring buffer for subtraction.
- **Anchored VWAP** — User-selected start point. Same math, custom reset.

### Standard Deviation Bands
```
variance = (sumP2V / sumV) - VWAP^2
stddev = sqrt(variance)
Band_N = VWAP ± N * stddev   (typically N = 1, 2, 3)
```

### Implementation
```javascript
class VWAPSuite {
  constructor() { this.reset(); }
  reset() { this.sumPV = 0; this.sumV = 0; this.sumP2V = 0; }
  update(high, low, close, volume) {
    const tp = (high + low + close) / 3;
    this.sumPV += tp * volume;
    this.sumV += volume;
    this.sumP2V += tp * tp * volume;
    const vwap = this.sumPV / this.sumV;
    const variance = (this.sumP2V / this.sumV) - vwap * vwap;
    const stddev = Math.sqrt(Math.max(0, variance));
    return { vwap, stddev, bands: [1,2,3].map(n => ({
      upper: vwap + n * stddev, lower: vwap - n * stddev
    }))};
  }
}
```

---

## 2. Volume Bubbles

### Concept (pioneered by Bookmap)
Circles on time-price grid where:
- X = execution time, Y = VWAP of cluster
- Size = proportional to total volume
- Color = aggressor side (buyer vs seller)

### Clustering Methods
1. **Smart clustering** — Aggregates overlapping dots by weighted average
2. **By volume** — New bubble when accumulated volume hits threshold
3. **By price** — All volume at same price level until price moves
4. **By price and aggressor** — Resets when aggressor side flips

### Visual Modes
- Gradient (color intensity = buy/sell ratio)
- Solid (split into two colors)
- Pie (split pie chart showing proportion)

### Filtering
- Minimal trade size (filters retail)
- Minimal displayed volume (catches HFT clusters)

---

## 3. Custom Scripting

### aggr.trade's Approach
- JavaScript-based, runs every chart refresh (default 1s)
- Built-in variables: `vbuy`, `vsell`, `cbuy`, `csell`, `lbuy`, `lsell`, `time`
- Variable persistence across bars (no `var` prefix = persistent)
- History access: `myvar[1]`, ring buffers: `myvar(10)`
- Built-in functions: `sma()`, `ema()`, `linreg()`, `sum()`, `avg()`, `highest()`, `lowest()`
- Plot types: `line()`, `candlestick()`, `histogram()`, `area()`, `cloudarea()`, `bar()`
- Auto-generated UI: `options.myParam` creates settings controls
- Cross-indicator refs: `$indicatorId.close`

### Monaco Editor Integration
- IntelliSense, syntax highlighting out of the box
- Custom language services via `monaco.editor.createWebWorker`
- Custom tokenizers via Monarch for domain-specific keywords
- React wrapper: `@monaco-editor/react`

### Sandboxed Execution (by security strength)
1. **Web Worker** — Isolated thread, no DOM access. Recommended baseline.
2. **Sandboxed iframe + Worker** — Origin isolation, blocks cookies/storage
3. **`new Function()` + Proxy scope** — Lighter, good for high-frequency execution
4. **ShadowRealm** — Emerging standard, not yet widely available

### Pine Script vs JavaScript Tradeoffs
| Aspect | Pine Script | JavaScript |
|--------|------------|------------|
| Learning curve | Low (DSL) | Higher |
| Power | Limited by design | Unlimited |
| Security | Server-side sandboxed | Needs sandboxing |
| Ecosystem | 150K+ scripts | Smaller (aggr-lib) |

---

## 4. Community Indicators

### aggr-lib Model
- GitHub-backed: indicators as JSON/JS files
- Auto-pulled into aggr.trade
- PR-based contribution flow
- 49 stars, 36 forks

### Building a System
- **Storage:** Git-backed (simple) or API-backed (scalable)
- **Versioning:** Semantic per indicator, pin configs to versions
- **Quality:** Star count, usage analytics, automated validation, reviews
- **Discovery:** Tags, search, curated collections, trending
- **Moderation:** Automated linting (no network calls, no infinite loops), flagging

---

## 5. 1-Second Timeframes

### Data Volume
- 1s resolution, 24h session = 86,400 candles
- 1 month = 2.59M candles
- Active crypto pair: 1-100+ trades/second

### Canvas Rendering Performance
| Library | Renderer | Throughput |
|---------|----------|------------|
| LightningChart JS | WebGL | 300K pts/sec @ 60fps |
| SciChart.js | WebGL | Millions of points |
| TV Lightweight Charts | Canvas 2D | 50K+ candles smooth |

### Optimization Patterns
- **Dirty-rect rendering** — Only repaint changed region
- **Off-screen canvas buffering** — Render historical bars once, composite with live
- **RequestAnimationFrame batching** — Batch tick updates per frame
- **Data conflation** — Merge sub-pixel bars when zoomed out (TV LWC v5.1.0)

### aggr.trade's Approach
- Web Worker per exchange processes raw trades
- 1-second refresh rate to UI thread
- Supports time-based and tick-based bar construction

---

## 6. Custom Timeframes

### Bar Construction Types
| Type | Trigger | Best For |
|------|---------|---------|
| **Time-based** | Every N seconds/minutes | Standard use |
| **Tick-based** | After N trades | Equalizing information per bar |
| **Volume-based** | When volume threshold reached | Normalizing activity density |
| **Range bars** | When price moves N units from open | Filtering consolidation noise |

### Client-Side Aggregation
```javascript
class CandleAggregator {
  constructor(targetMs) { this.tf = targetMs; this.current = null; }
  processTick(timestamp, price, volume) {
    const barOpen = Math.floor(timestamp / this.tf) * this.tf;
    if (!this.current || this.current.time !== barOpen) {
      if (this.current) this.emit('bar_closed', this.current);
      this.current = { time: barOpen, open: price, high: price,
                       low: price, close: price, volume: 0 };
    }
    this.current.high = Math.max(this.current.high, price);
    this.current.low = Math.min(this.current.low, price);
    this.current.close = price;
    this.current.volume += volume;
  }
}
```

### Strategy
- Store base timeframe (1s or 1m) on server
- Aggregate higher timeframes on demand (client or server)
- Cache results

---

## 7. Dual Cluster Modes (Footprint Charts)

### Two Primary Modes
1. **Bid x Ask** — Each price level shows `[Bid Vol] x [Ask Vol]` side by side
2. **Delta** — Each price level shows `Ask Vol - Bid Vol` (net pressure)

### Additional Modes (ATAS offers 10 content types × 7 display modes = 630+ variations)
- Volume, Delta, Bid x Ask, Bid/Ask Imbalance, Volume Profile

### Implementation
```javascript
class FootprintBar {
  constructor(time, tickSize) {
    this.time = time; this.tickSize = tickSize;
    this.levels = new Map(); // price -> {bid: 0, ask: 0}
  }
  addTrade(price, volume, isBuy) {
    const level = Math.round(price / this.tickSize) * this.tickSize;
    if (!this.levels.has(level)) this.levels.set(level, { bid: 0, ask: 0 });
    const entry = this.levels.get(level);
    if (isBuy) entry.ask += volume; else entry.bid += volume;
  }
  getDelta(price) { const l = this.levels.get(price); return l ? l.ask - l.bid : 0; }
  getImbalance(price, ratio = 3.0) {
    const l = this.levels.get(price);
    if (!l) return 'none';
    if (l.ask > l.bid * ratio) return 'buy_imbalance';
    if (l.bid > l.ask * ratio) return 'sell_imbalance';
    return 'none';
  }
}
```

### NEW: focus1691/orderflow (TypeScript)
Processes WebSocket trades into footprint candles for Binance, Bybit, OKX, Bitget, Gate.io. Includes stacked imbalance and HVN indicators.

---

## 8. Bucketed Trade Size Groups

### Threshold Approaches

**Static:**
```
Small (retail):        < $10K
Medium:                $10K - $100K
Large (institutional): $100K - $1M
Whale:                 > $1M
```

**Adaptive:** Rolling percentiles (90th, 95th, 99th) of recent trade sizes. Auto-adapts to market conditions.

**Standard deviation:** Mean ± 1σ (medium), 2σ (large), 3σ+ (whale)

### Visualization
1. Colored trade feed (real-time scrolling list)
2. Stacked histograms (volume by size category per bar)
3. Bubble overlay (sized/colored by bucket)
4. Cumulative delta by size (separate CVD per bucket — reveals retail vs institutional divergence)

### Detection Challenges
- Iceberg orders (only fraction visible)
- Algorithmic slicing (large orders → many small trades)
- Cross-exchange sweeps (split across venues, executing in microseconds)

### beatzxbt/mm-toolbox Reference
- HFT-optimized orderbook implementations
- Numba-accelerated calculations
- Ring buffers for fixed-size circular storage
- Multi-trigger candle aggregation (time/tick/volume)

---

## Key Repos Discovered This Sprint

| Repository | Language | Purpose |
|-----------|----------|---------|
| focus1691/orderflow | TypeScript | Footprint candle service for 5 exchanges |
| fer880220/OrderFlow-Chart-demo | React | OrderFlow on lightweight-charts |
| miguelmota/vwap | JS | VWAP calculation |
| Prendus/secure-eval | JS | Sandboxed iframe execution |
| 0xd3lbow/aggr.template | JS | Delta indicators for aggr.trade |
| cryptorife/aggr-templates | JS | Pre-built workspace templates |
