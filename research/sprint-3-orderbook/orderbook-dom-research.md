# Orderbook and DOM (Depth of Market) Features Research
## Date: 2026-03-16

---

## 1. Aggregated Orderbooks

### Price-Level Aggregation Algorithm

1. **Normalize tick sizes** — Round all prices to a common granularity:
   - Absolute tick rounding: `floor(price / tick) * tick`
   - Relative/basis-point buckets from mid price (better for different absolute prices)

2. **Sum quantities** at each unified price level across exchanges

3. **Maintain sort order** — Bids descending, asks ascending. Use Red-Black tree or sorted skip list for O(log n) insert/delete

4. **Handle latency** — Timestamp alignment, sequence tracking, staleness markers

### Reference: jose-donato/crypto-orderbook
- Go 1.22+ backend, React + Vite + Tailwind frontend
- 9+ exchanges (Binance, Bybit, Kraken, OKX, Coinbase, etc.)
- Backend maintains per-exchange books via WebSocket, streams aggregated view to client

### Normalization Libraries

| Library | Language | Key Feature |
|---------|----------|-------------|
| **CCXT / CCXT Pro** | JS/TS/Python/C#/PHP/Go | 100+ exchanges, unified API, `watchOrderBook()` |
| **bmoscon/cryptofeed** | Python | Normalized callbacks, synthetic NBBO, backend persistence |
| **tardis-dev** | Node.js/TS | Red-Black tree orderbook, real-time + historical replay, 20+ exchanges |

### Other Implementations

| Project | Language | Notes |
|---------|----------|-------|
| furryboffin/obagg | Rust/gRPC | Aggregates Binance + Bitstamp |
| suleymanozkeskin/btc_aggregated_orderbook | Python + C++ | Merges Bybit, OKEx, Binance |
| elank96/Crypto-OrderBook-Aggregator | Python | Coinbase Pro + Kraken + Gemini |

---

## 2. Aggregated DOM (Depth of Market)

### How DOM Ladders Work
- Price on center axis (each row = one tick)
- Bid quantity left, ask quantity right
- Last traded price highlighted
- Cumulative depth as horizontal bars

### Aggregating Multi-Exchange DOM
1. Unified price ladder with chosen tick size
2. Map each exchange's levels to ladder (snap to nearest tick)
3. Sum quantities, optionally color-code by exchange
4. Auto-scroll to keep mid-price centered

### Real-Time Update Patterns
- **Snapshot + Delta:** Initial full snapshot, then incremental updates
- **Throttled rendering:** Batch all updates between frames, render at 60fps via `requestAnimationFrame`
- **Efficient diffing:** Only re-render changed rows. Canvas/WebGL avoids DOM diffing overhead

### DOM Implementations
- **Databento DOM Tutorial** — React frontend + Rust backend + WebSocket (19M events/sec replay)
- **ekrembk/itch-orderbook-replay** — ITCH protocol order book replay in React
- **mihailgaberov/orderbook** — React/TypeScript, Redux, tick-size grouping

---

## 3. Orderbook Imbalances

### Imbalance Ratio Calculations

**Static OBI:**
```
OBI = (Sum_bid_qty - Sum_ask_qty) / (Sum_bid_qty + Sum_ask_qty)
```
Range: -1.0 to +1.0. Zero = balanced.

**Weighted Variants:**
- **Micro-Price:** Shifts mid toward heavier side
- **VAMP:** Cross-multiplies price and quantity across N levels
- **Depth-weighted OBI:** Closer levels weighted more

### Stacked Imbalances (from footprint analysis)
- Buy imbalance: buy volume > sell volume at level below by 3:1+
- Sell imbalance: sell volume > buy volume at level above by 3:1+
- **Stacked:** 3+ consecutive levels same direction = institutional activity = high-probability S/R

### Detection Algorithms
- **CUSUM:** Cumulative deviation from running mean
- **Change Point Detection:** Abrupt shifts in OBI distribution
- **Deep Learning:** MLP/LSTM/CNN for price prediction from LOB imbalance (Westray)
- **Structural Filtration:** Filter transient orders existing <50ms

### Visualization
| Method | Description |
|--------|-------------|
| Color-coded bars | Intensity proportional to imbalance ratio |
| Imbalance line | Sub-chart showing OBI over time |
| Heatmap overlay | Bookmap-style color intensity |
| Threshold alerts | Triangular markers on chart |
| Stacked projection | Horizontal lines from stacked imbalance zones |

---

## 4. Orderbook Depth Overlay

### Rendering Approach
1. Compute cumulative depth from best bid/ask outward
2. Map to chart coordinates (shared price axis, secondary volume axis)
3. Area fill: bids green, asks red, fading to transparent
4. Real-time: lerp between old and new curves for smooth animation

### Implementations
- **amCharts** — Live order book depth chart
- **TimeStored DepthMap** — WebGL heatmap: price x time x volume
- **jpolec/order_book** — Python + Matplotlib + Binance WebSocket

---

## 5. Technical Implementation

### 5.1 WebSocket Architecture
```
[Exchange WS 1] --\
[Exchange WS 2] ----> [Backend Normalizer] --> [Aggregation Engine] --> [Client WS]
[Exchange WS N] --/
```
- One WS per exchange, heartbeat every 30-60s
- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, cap 30s)
- Sequence number tracking, snapshot recovery on gap

### 5.2 Data Structures

| Structure | Insert/Delete | Best Use Case |
|-----------|--------------|--------------|
| **Red-Black Tree** | O(log n) | High-frequency updates (tardis-dev uses this) |
| **Sorted Array + Binary Search** | O(n) | Small books (<100 levels) |
| **Hash Map + Sort-on-Render** | O(1) insert | Throttled rendering (sort only at 60fps) |
| **Skip List** | O(log n) | Alternative to RB-tree |

**Practical recommendation:** Hash map + sort-on-render for <200 levels. RB-tree for 1000+ levels.

**Always use integer keys:** `price * 10^precision` to avoid float comparison bugs.

### 5.3 Canvas vs WebGL

| Factor | Canvas 2D | WebGL |
|--------|-----------|-------|
| Sweet spot | Up to ~10K elements at 60fps | 100K to 1M+ at 60fps |
| Text rendering | Native, easy | Must render as geometry |
| Learning curve | Standard JS | GLSL shaders needed |

**Use Canvas for:** DOM ladder, standard depth chart
**Use WebGL for:** Heatmap/Bookmap-style (100K+ elements)

**Libraries:** PixiJS (WebGL 2D), Apache ECharts (auto Canvas/WebGL), Plotly.js (scattergl/heatmapgl)

### 5.4 Memory Management for High-Frequency Updates

1. **Object pooling** — Reuse price-level objects instead of `new`
2. **Typed Arrays** — `Float64Array` for prices/quantities (reduces GC pressure)
3. **SharedArrayBuffer** — Zero-copy sharing between Web Worker and main thread
4. **Transferable ArrayBuffers** — Fallback if SharedArrayBuffer unavailable
5. **Throttle processing** — Buffer deltas, apply in batch at 60fps
6. **Avoid string allocations** — Parse to numeric types immediately

### Recommended Architecture
```
[Web Worker: Feed Processing]
  - Receives raw WebSocket messages
  - Parses, normalizes, aggregates
  - Writes to SharedArrayBuffer

[Main Thread: Rendering]
  - Reads from SharedArrayBuffer via Atomics
  - Renders at requestAnimationFrame rate
  - No parsing or aggregation on main thread
```

---

## Key Repos Summary

| Repository | Stack | Purpose |
|------------|-------|---------|
| jose-donato/crypto-orderbook | Go + React | Multi-exchange aggregated orderbook |
| tardis-dev/tardis-node | TypeScript | RB-tree orderbook, 20+ exchanges |
| bmoscon/cryptofeed | Python | Feed handler, NBBO, storage |
| ccxt/ccxt | Multi-language | 100+ exchange unified API |
| pverscha/SharedCore | TypeScript | Thread-safe SharedArrayBuffer structures |
| databento/databento-rs | Rust | 19M events/sec market data |
