# Backend System Architecture for Real-Time Trading Data Platforms

## Research Report — Sprint 8

**Date:** 2026-03-17
**Method:** Spider Web (Multi-Hop GitHub Network Crawl) + Web Research
**Scope:** Backend architecture for a web-based trading terminal aggregating data from 10+ crypto exchanges

---

## Table of Contents

1. [Developer Network Map](#1-developer-network-map)
2. [Architecture Pattern Catalog](#2-architecture-pattern-catalog)
3. [Database Comparison for Trading Data](#3-database-comparison-for-trading-data)
4. [Recommended Architecture for Our App](#4-recommended-architecture-for-our-app)
5. [Data Pipeline Design: Exchange WebSocket to Browser](#5-data-pipeline-design-exchange-websocket-to-browser)

---

## 1. Developer Network Map

### Seed Projects and Their Authors

| Developer / Org | Key Project(s) | Tech Stack | Stars | Focus Area |
|---|---|---|---|---|
| **Tucsky** (France) | [aggr](https://github.com/Tucsky/aggr), [aggr-server](https://github.com/Tucsky/aggr-server) | Node.js, Vue.js, InfluxDB | 1,010 / 189 | Trade aggregation + visualization terminal |
| **bmoscon** (Bryant Moscon) | [cryptofeed](https://github.com/bmoscon/cryptofeed), [cryptostore](https://github.com/bmoscon/cryptostore) | Python, asyncio | 2,700 / 500+ | Multi-exchange feed handler + storage service |
| **soulmachine** (Frank Dai) | [crypto-crawler-rs](https://github.com/crypto-crawler/crypto-crawler-rs), crypto-crawler-ts | Rust, TypeScript | 500+ | Rock-solid exchange crawlers with FFI bindings |
| **nautechsystems** | [nautilus_trader](https://github.com/nautechsystems/nautilus_trader) | Rust + Python (Cython/PyO3) | 3,000+ | Production-grade trading engine |
| **barter-rs** | [barter-rs](https://github.com/barter-rs/barter-rs) | Rust, Tokio | 1,000+ | Event-driven trading framework |
| **jose-donato** | [cryexc-backend](https://github.com/jose-donato/cryexc-backend) | Python, FastAPI, DuckDB | ~50 | Lightweight orderflow terminal backend |
| **tardis-dev** | [tardis-machine](https://github.com/tardis-dev/tardis-machine), [tardis-node](https://github.com/tardis-dev/tardis-node) | Node.js, TypeScript | 500+ | Historical + real-time normalized market data |
| **ccxt** | [ccxt](https://github.com/ccxt/ccxt) | TypeScript, Python, PHP | 33,000+ | Unified exchange API (REST + WebSocket) |
| **hummingbot** | [hummingbot](https://github.com/hummingbot/hummingbot), [gateway](https://github.com/hummingbot/gateway) | Python, TypeScript | 8,000+ | Market-making bot with exchange connectors |
| **OpenBB-finance** | [OpenBB](https://github.com/OpenBB-finance/OpenBB) | Python, FastAPI | 50,000+ | Financial data platform for analysts/agents |
| **uNetworking** | [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) | C++, Node.js addon | 8,000+ | Ultra-high-perf WebSocket server (used by BitMEX, Bitfinex, Coinbase) |

### Network Connections

The developer network clusters into three groups:

**Group A — Python/asyncio ecosystem (bmoscon hub):**
- bmoscon's cryptofeed is the most-forked feed handler (752 forks)
- cryptostore builds on cryptofeed, adding Redis/Kafka caching + backend storage
- Backends: Redis, Kafka, InfluxDB, PostgreSQL, QuestDB, MongoDB, ZeroMQ
- Connected to OpenBB ecosystem (jose-donato is a founding engineer at OpenBB)

**Group B — Rust/systems-level performance:**
- soulmachine's crypto-crawler-rs provides C FFI bindings for Python/C++ wrappers
- nautilus_trader combines Rust core with Python control plane via PyO3
- barter-rs offers a pure-Rust modular trading ecosystem with Tokio async
- All three prioritize zero-copy, thread-safety, and deterministic execution

**Group C — JavaScript/TypeScript web-native:**
- Tucsky's aggr is a complete trade aggregation terminal (Vue.js frontend + Node.js backend)
- tardis-dev provides normalized data replay via Node.js async iterators
- ccxt offers the broadest exchange coverage (100+ exchanges) in JS/TS/Python
- uWebSockets.js is the WebSocket infrastructure layer used by major exchanges

---

## 2. Architecture Pattern Catalog

### Pattern 1: Collector-API Split (aggr-server)

**Source:** [Tucsky/aggr-server](https://github.com/Tucsky/aggr-server)

```
Exchange WSs ──> [Collector Node 1] ──> InfluxDB
Exchange WSs ──> [Collector Node 2] ──> InfluxDB
                                           │
                              [API Node] <──┘──> Browser Clients
                                  │
                        (queries collectors for
                         data not yet in InfluxDB)
```

**Stack:** Node.js, InfluxDB v1.8, WebSocket Workers

**How it works:**
- Collectors are dedicated to listening for trades and storing data for a given set of markets
- API node serves data to clients, using InfluxDB as primary source but querying collectors for not-yet-stored data
- Each exchange runs in its own Web Worker for isolation
- Trades are grouped by time, market, and side before storage
- Configuration splits: collector config (`api: false, collect: true`) and API config (`api: true, collect: false`)

**Backpressure handling:** Worker-per-exchange isolation prevents one slow exchange from blocking others. Data is broadcast to the UI every 500ms with aggregated statistics rather than raw ticks.

**Scaling:** Horizontal via multiple collector instances, each handling a subset of markets. Single API node queries across all collectors.

**Best for:** Small-to-medium deployments (< 50 markets). Simple to deploy with Docker Compose.

**Limitations:** InfluxDB v1.8 only (not v2+). Single API node is a bottleneck. No message broker for buffering.

---

### Pattern 2: Feed Handler + Caching Store Pipeline (cryptofeed + cryptostore)

**Source:** [bmoscon/cryptofeed](https://github.com/bmoscon/cryptofeed) + [bmoscon/cryptostore](https://github.com/bmoscon/cryptostore)

```
Exchange WSs ──> [cryptofeed]        ──> Redis Streams / Kafka
                  (Python asyncio)        (caching layer)
                       │                       │
                       │                  [cryptostore aggregator]
                       │                       │
                       │              ┌────────┼────────┐
                       │              ▼        ▼        ▼
                       │          InfluxDB  Parquet   S3/GCS
                       │
                       └──> ZeroMQ (real-time pass-through)
                                       │
                                  [Consumer apps]
```

**Stack:** Python 3.8+, asyncio, Redis 5.0+ or Kafka, multiple storage backends

**How it works:**
- cryptofeed connects to exchange WebSockets, normalizes data into unified callbacks
- Supports L2/L3 orderbooks, trades, funding, liquidations, open interest, candles
- Redis Streams or Kafka batch updates from cryptofeed
- cryptostore reads batches, aggregates, and writes to final storage
- Real-time ZeroMQ pass-through bypasses aggregation for latency-sensitive consumers
- Synthetic NBBO (National Best Bid/Offer) computed across exchanges
- Config-driven via YAML, hot-reloadable without restart

**Backpressure handling:** Redis Streams provide persistent buffering with consumer groups for parallel processing. `retention_time` controls Redis memory. ZeroMQ pass-through is fire-and-forget.

**Scaling:** Multiple cryptofeed instances can run, each handling different exchange subsets. Consumer groups in Redis/Kafka allow parallel storage writers.

**Best for:** Research, data collection, and building custom analytics pipelines. Python ecosystem integration.

**Limitations:** Python GIL limits per-process throughput. Not designed as a direct-to-browser server. Requires separate API layer.

---

### Pattern 3: Rust-Native Crawlers with FFI Bindings (crypto-crawler-rs)

**Source:** [crypto-crawler/crypto-crawler-rs](https://github.com/crypto-crawler/crypto-crawler-rs)

```
Exchange WSs ──> [crypto-ws-client]     (Rust WebSocket layer)
                       │
                 [crypto-crawler]       (Rust crawl orchestration)
                       │
                 [crypto-msg-parser]    (Rust message parsing)
                       │
                  ┌────┼────┐
                  ▼    ▼    ▼
               C FFI  Python  C++      (language bindings)
                  │
             [Application layer]
```

**Stack:** Rust, tokio async, C FFI via cbindgen

**How it works:**
- crypto-ws-client provides universal WebSocket APIs per exchange
- crypto-crawler orchestrates connections for trades, orderbooks (L2/L3), BBO, funding rates, open interest, candlesticks
- crypto-msg-parser converts raw exchange JSON into normalized structs
- FFI bindings expose everything to Python and C++ consumers
- Supports 20+ exchanges across spot, futures, swaps, options

**Backpressure handling:** Rust's ownership model prevents unbounded memory growth. Tokio async runtime handles thousands of concurrent connections efficiently.

**Scaling:** Single binary handles many exchange connections. Can spawn multiple instances for different market segments.

**Best for:** High-throughput data collection where Python performance is insufficient. Building polyglot systems.

**Limitations:** Library only, not a complete pipeline. No built-in storage or API layer.

---

### Pattern 4: Hybrid Rust-Python Trading Engine (nautilus_trader)

**Source:** [nautechsystems/nautilus_trader](https://github.com/nautechsystems/nautilus_trader)

```
Exchange WSs ──> [Rust Adapter Layer]
                  (HTTP client, WS client,
                   message parsing, rate limiting)
                       │
                  [PyO3 Bindings]
                       │
              ┌────────┼────────────────┐
              ▼        ▼                ▼
         DataEngine  ExecutionEngine  RiskEngine
              │        │                │
              └────────┼────────────────┘
                       │
                 [MessageBus + Cache]
                       │
                  [Strategy Layer]     (Python — identical for backtest & live)
                       │
              [Infrastructure Crate]
                  ┌────┼────┐
                  ▼    ▼    ▼
               Redis  Parquet  (feature-flag backends)
```

**Stack:** Rust core (tokio async), Python/Cython control plane, PyO3 bindings, Redis state persistence

**How it works:**
- Rust crates handle all networking, parsing, and performance-critical operations
- Python strategies deploy identically from research to production (research-to-live parity)
- DataEngine, ExecutionEngine, RiskEngine, Portfolio, MessageBus, and Cache are shared across backtest and live
- Adapters translate venue-specific APIs into a unified domain model
- Can stream 5 million rows/second from Parquet for replay
- Feature flags control optional functionality (streaming, cloud backends)
- Crash-only design: systems recover cleanly from crashes

**Backpressure handling:** Rust ownership prevents memory leaks. Tokio async runtime with bounded channels. Rate limiting built into HTTP/WS clients.

**Scaling:** Multi-asset, multi-venue by design. Adapters are modular and independent.

**Best for:** Full production trading systems where the same codebase runs backtests and live trading.

**Limitations:** Extremely complex. Overkill if you only need data collection and display, not trade execution.

---

### Pattern 5: Lightweight Embedded Analytics Backend (cryexc-backend)

**Source:** [jose-donato/cryexc-backend](https://github.com/jose-donato/cryexc-backend)

```
Binance Futures WS ──> [FastAPI Server]
Tree of Alpha WS   ──>      │
                        [DuckDB]  (embedded, file-based)
                             │
                        [WebSocket broadcast]  (every 500ms)
                             │
                        Browser Clients
```

**Stack:** Python, FastAPI, DuckDB, WebSocket

**How it works:**
- Single FastAPI process connects to Binance Futures WebSocket
- Trades stored in DuckDB file (`cryexc.duckdb`) for persistence across restarts
- CVD (Cumulative Volume Delta) aggregation computed in DuckDB
- WebSocket broadcasts aggregated data to subscribers every 500ms
- Tree of Alpha WebSocket for real-time crypto news integration
- Pydantic models for data validation

**Backpressure handling:** 500ms broadcast interval naturally throttles output. DuckDB handles analytical queries without blocking the event loop.

**Scaling:** Single-process, single-exchange. Not designed for horizontal scaling.

**Best for:** Personal trading tools, prototyping, single-exchange backends. Extremely simple to deploy.

**Limitations:** Single exchange only. No message broker. DuckDB is OLAP-only (no concurrent writes). Not suitable for multi-exchange aggregation at scale.

---

### Pattern 6: Kafka/Redpanda Streaming Pipeline to ClickHouse

**Source:** Composite pattern from multiple projects including [David Pedersen's crypto analytics platform](https://medium.com/@davidpedersen/creating-a-crypto-analytics-platform-c2c3ac662a17) and [StockHouse](https://clickhouse.com/blog/building-stockhouse)

```
Exchange WSs ──> [WebSocket Producers]
                  (Python / Node.js)
                       │
                 [Kafka / Redpanda]     (distributed streaming)
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
         ClickHouse  Materialized  Real-time
         (analytics)  Views (OHLCV  Consumer
                      aggregation)  (WebSocket server)
              │                          │
              ▼                          ▼
         Grafana / REST API        Browser Clients
```

**Stack:** Python/Node.js producers, Kafka or Redpanda, ClickHouse, Grafana

**How it works:**
- WebSocket producers connect to exchange APIs with auto-reconnection
- Messages normalized into unified format before publishing to Kafka topics
- Kafka provides durability, ordering, and replayability
- ClickHouse ingests from Kafka and stores with columnar compression (5x+ compression ratio)
- Materialized views pre-aggregate OHLCV, VWAP, technical indicators on write
- Schema: `DateTime64(6)` microsecond precision, `LowCardinality(String)` for symbols, `Decimal64(8)` for prices
- Partitioning by `toYYYYMM(trade_time)` and exchange

**Backpressure handling:** Kafka acts as a durable buffer between producers and consumers. Consumer groups allow parallel processing. ClickHouse handles millions of inserts/second.

**Scaling:** Kafka partitions scale horizontally. ClickHouse supports distributed tables across shards. Add more WebSocket producers for more exchanges.

**Best for:** Large-scale data pipelines with both real-time and historical analytics. Enterprise deployments.

**Limitations:** Operational complexity (Kafka/Redpanda cluster management). Higher infrastructure costs. Latency overhead from Kafka hop.

---

### Pattern 7: Normalized Data Replay Server (tardis-machine)

**Source:** [tardis-dev/tardis-machine](https://github.com/tardis-dev/tardis-machine)

```
Exchange WSs ──> [tardis data collection]  (GCP Kubernetes)
                       │
                 [Compressed GZIP storage on disk]
                       │
                 [tardis-machine server]   (locally runnable)
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
         /replay     /replay-   /ws-stream-
         (raw HTTP)  normalized  normalized
                     (HTTP/WS)   (real-time WS)
                                      │
                              ┌───────┼───────┐
                              ▼       ▼       ▼
                          combine()  compute()
                          (multi-    (derived
                           exchange   data: OBI,
                           sync)      bars, etc.)
```

**Stack:** Node.js, TypeScript, async iterators, GZIP compression

**How it works:**
- Data collected from real-time WebSocket feeds (not REST polling) on GCP Kubernetes
- Locally runnable server with built-in caching (no hosted real-time API by design)
- Normalized APIs provide unified format across all exchanges
- Seamless switching between historical replay and real-time streaming
- `combine()` helper merges multiple exchange feeds into synchronized stream
- Transparent local disk caching in GZIP format
- Open-sourced data mappings from exchange-native to normalized format

**Backpressure handling:** Async iterators (`for await...of`) naturally handle backpressure — consumer pulls at its own pace. Local caching prevents repeated network requests.

**Scaling:** Designed for single-user local use. Data collection runs on Kubernetes for reliability.

**Best for:** Research, backtesting, and building systems that need identical interfaces for live and historical data.

**Limitations:** Not a multi-tenant server. Commercial API for historical data. Real-time requires direct exchange connections.

---

## 3. Database Comparison for Trading Data

### Overview Matrix

| Feature | QuestDB | TimescaleDB | InfluxDB 3.0 | ClickHouse | DuckDB |
|---|---|---|---|---|---|
| **Type** | Purpose-built TSDB | PostgreSQL extension | Purpose-built TSDB | Column-oriented OLAP | Embedded OLAP |
| **Language** | Java + C++ (JIT) | C (PostgreSQL) | Rust | C++ | C++ |
| **Query Language** | SQL (PostgreSQL wire) | SQL (full PostgreSQL) | SQL (was Flux) | SQL (ClickHouse dialect) | SQL (PostgreSQL dialect) |
| **Storage Model** | Column-oriented, time-partitioned | Hybrid row-columnar (Hypercore) | Columnar (Apache Parquet) | Columnar, sorted parts, background merge | Columnar, in-process |
| **Deployment** | Standalone server | PostgreSQL extension | Standalone server | Standalone / distributed | Embedded library |
| **Compression** | Yes (custom) | Yes (Hypercore) | Yes (Parquet-native) | Yes (LZ4, ZSTD, Delta) | Yes (various) |

### Performance Benchmarks (Independent)

#### OHLCV from Tick Data (100M records, 3 symbols, 100 trading days)

| Database | Avg Query Time |
|---|---|
| PostgreSQL | 3,493 ms |
| TimescaleDB | 1,021 ms |
| ClickHouse | 547 ms |
| KDB+ | 109 ms |
| **QuestDB** | **25 ms** |

Source: [Sergey Makhnist benchmark](https://medium.com/@smakhnist/picking-the-fastest-database-to-store-time-series-data-411ca3651277)

#### Ingestion Throughput (TSBS Benchmark)

| Database | Relative Ingestion Speed |
|---|---|
| QuestDB | 6-13x faster than TimescaleDB |
| QuestDB | 12-36x faster than InfluxDB 3 Core |
| ClickHouse | Stable but not optimized for pure time-series |

Source: [QuestDB benchmarks](https://questdb.com/blog/comparing-influxdb-timescaledb-questdb-time-series-databases/)

Note: Vendor benchmarks are biased. Each vendor's own benchmark shows itself as fastest. Independent benchmarks should be preferred.

### Detailed Database Assessments

#### QuestDB
- **Strengths:** Fastest query performance for financial tick data. SIMD-accelerated queries. Custom JIT compiler for parallel filters. PostgreSQL wire protocol compatibility. Built-in InfluxDB Line Protocol ingestion endpoint.
- **Weaknesses:** Smaller ecosystem than PostgreSQL/TimescaleDB. Less mature tooling. Single-node only (no native clustering yet). Fewer integrations.
- **Best for:** Medium-size firms, quant research, fast time-to-value analytical workloads. OHLCV aggregation, tick analytics, feature generation for ML.
- **Used by:** cryptofeed (as a backend option).

#### TimescaleDB
- **Strengths:** Full PostgreSQL compatibility (joins, transactions, foreign keys). Hybrid Hypercore storage (row for hot, columnar for cold). Massive ecosystem of PostgreSQL tools. Continuous aggregates for pre-computed rollups.
- **Weaknesses:** Ingestion rate degrades with high-cardinality datasets. Row-based ingestion with heavy indexing. 100x slower than specialized DBs on some queries. Not ideal for raw tick firehoses.
- **Best for:** Teams already in the PostgreSQL ecosystem. Aggregated bars and metadata storage. Systems needing relational features alongside time-series.
- **Schema tip:** Use hypertables with chunk intervals matching your query patterns (e.g., 1 hour for recent data, 1 day for historical).

#### InfluxDB 3.0
- **Strengths:** Complete rewrite in Rust (released April 2025). SQL as primary query language (replacing Flux). Apache Parquet-based storage. Line protocol for high-speed ingestion. Strong ecosystem for metrics/observability.
- **Weaknesses:** Major breaking changes from v1/v2. Ecosystem still maturing around v3. Not primarily designed for financial analytics. Limited JOIN support.
- **Best for:** IoT, metrics, observability. Crypto data collection where InfluxDB Line Protocol ingestion is valued (used by aggr-server with v1.8).
- **Note:** aggr-server specifically requires InfluxDB v1.8.x. The v3 rewrite is a completely different system.

#### ClickHouse
- **Strengths:** Exceptional compression (5x+ for market data). Handles billions of rows efficiently. Materialized views for real-time aggregation. Distributed architecture for horizontal scaling. `LowCardinality(String)` type ideal for symbols/exchanges. Strong Kafka integration.
- **Weaknesses:** Not optimized specifically for time-series (it is an OLAP engine). Worst at bulk writing in academic benchmarks. Map type limitations for orderbook storage (no float keys). More complex operations than purpose-built TSDBs.
- **Best for:** Large-scale historical analytics, dashboards, OHLCV pre-aggregation. Enterprise deployments alongside Kafka. Storing and querying billions of trade records.
- **Real-world:** [Longbridge Technology](https://clickhouse.com/blog/longbridge-technology-simplifies-their-architecture-and-achieves-10x-performance-boost-with-clickhouse) consolidated Redis + DynamoDB into ClickHouse for US stock/options data. [StockHouse](https://clickhouse.com/blog/building-stockhouse) reference architecture ingests millions of rows/sec from WebSocket APIs.

#### DuckDB
- **Strengths:** Zero dependencies, ~10MB package. In-process (no server needed). Exceptional for analytical queries on Parquet/CSV files. Vectorized + SIMD execution. Stable on-disk format since v1.0.
- **Weaknesses:** OLAP only, no concurrent writes. Not for real-time streaming ingestion. Single-writer limitation. Not a server — embedded library only.
- **Best for:** Embedded analytics in trading tools, backtesting, portfolio analysis. Querying historical Parquet files. Prototyping and personal tools (as in cryexc-backend).
- **Used by:** cryexc-backend for trade storage and CVD aggregation.

### Recommendation Matrix

| Use Case | Primary DB | Secondary / Cache |
|---|---|---|
| Real-time tick analytics (<100 markets) | **QuestDB** | Redis Streams |
| Real-time + relational features | **TimescaleDB** | Redis |
| Large-scale historical analytics (10B+ rows) | **ClickHouse** | Kafka / Redpanda |
| Personal/lightweight tools | **DuckDB** | None |
| Metrics/observability alongside trading | **InfluxDB 3.0** | Redis |
| Maximum query performance on tick data | **QuestDB** | Parquet cold storage |

---

## 4. Recommended Architecture for Our App

### Requirements Analysis

Our app needs to:
- Aggregate data from 10+ crypto exchanges simultaneously
- Process orderbook, trade, and liquidation streams in real-time
- Serve aggregated data to browser clients via WebSocket
- Support historical data replay and analysis
- Handle high message throughput (potentially 50,000+ messages/second aggregate)
- Be deployable and operationally manageable by a small team

### Recommended Architecture: Tiered Pipeline with QuestDB

```
┌─────────────────────────────────────────────────────────────────┐
│                     INGESTION TIER                              │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Binance  │  │ Bybit    │  │ OKX      │  │ ...10+   │       │
│  │ Connector│  │ Connector│  │ Connector│  │ Connector│       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│       └──────────────┴──────────────┴──────────────┘             │
│                              │                                   │
│                    [Normalizer Service]                          │
│                    (unified trade/book/                          │
│                     liquidation format)                          │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                     STREAMING TIER                               │
│                              │                                   │
│                    [Redis Streams]                               │
│                    (persistent buffer,                           │
│                     consumer groups)                             │
│                              │                                   │
│              ┌───────────────┼───────────────┐                   │
│              │               │               │                   │
│              ▼               ▼               ▼                   │
│        [Storage        [Aggregation    [Real-time               │
│         Consumer]       Consumer]       Fan-out]                │
│              │               │               │                   │
└──────────────┼───────────────┼───────────────┼───────────────────┘
               │               │               │
┌──────────────┼───────────────┼───────────────┼───────────────────┐
│              ▼               ▼               ▼                   │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │   QuestDB     │  │   In-Memory  │  │  uWebSockets.js  │      │
│  │  (tick store, │  │   Aggregator │  │  (WS server with │      │
│  │   historical  │  │  (OHLCV,CVD, │  │   pub/sub topics │      │
│  │   queries)    │  │   heatmaps)  │  │   per market)    │      │
│  └───────┬───────┘  └──────┬───────┘  └────────┬─────────┘      │
│          │                 │                    │                 │
│          │                 └────────────────────┤                 │
│          │                                     │                 │
│  ┌───────┴───────┐                    ┌────────┴─────────┐       │
│  │  REST API     │                    │  Browser Clients │       │
│  │  (historical  │                    │  (WebSocket)     │       │
│  │   data, OHLCV │                    │                  │       │
│  │   queries)    │                    │                  │       │
│  └───────────────┘                    └──────────────────┘       │
│                      SERVING TIER                                │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Choices and Rationale

#### Ingestion Tier

| Component | Choice | Rationale |
|---|---|---|
| **Exchange Connectors** | Node.js/TypeScript with CCXT Pro | Broadest exchange coverage (100+). Unified WebSocket API. Built-in reconnection and rate limiting. Active maintenance. |
| **Alternative** | Rust (crypto-crawler-rs or custom) | If throughput exceeds what Node.js can handle per-process, Rust connectors provide 10x+ throughput. Consider for v2. |
| **Normalizer** | Custom TypeScript service | Normalize exchange-specific formats into unified schema: `{exchange, symbol, timestamp, side, price, size, type}` |

#### Streaming Tier

| Component | Choice | Rationale |
|---|---|---|
| **Message Buffer** | Redis Streams (Redis 7+) | Persistent, ordered log with consumer groups. Sub-millisecond latency. Simpler to operate than Kafka for our scale. Built-in backpressure via consumer group acknowledgment. Stream trimming for memory management. |
| **Alternative** | Redpanda | If Redis becomes a bottleneck at >100K msg/sec sustained, Redpanda provides Kafka-compatible API with lower operational overhead and C++ performance. |
| **Why not Kafka?** | Operational complexity | Kafka requires ZooKeeper/KRaft, JVM tuning, and multi-node clusters. Overkill for <100 markets. Redpanda is the better Kafka alternative if we outgrow Redis. |

#### Storage Tier

| Component | Choice | Rationale |
|---|---|---|
| **Primary DB** | QuestDB | 25ms OHLCV queries on 100M rows. PostgreSQL wire protocol (use standard SQL tools). Built-in InfluxDB Line Protocol endpoint for fast ingestion. Time-partitioned columnar storage with compression. |
| **Cold Storage** | Parquet files on S3/disk | Export older data (>30 days) to Parquet for cost-effective long-term storage. DuckDB can query these directly for ad-hoc analysis. |
| **In-Memory Cache** | Redis (shared with Streams) | Cache latest orderbook snapshots, recent aggregations, and session state. |

#### Serving Tier

| Component | Choice | Rationale |
|---|---|---|
| **WebSocket Server** | uWebSockets.js (Node.js) | C++ core with Node.js bindings. Built-in pub/sub for topic-based broadcasting. Used by BitMEX, Bitfinex, Coinbase in production. 5-10x more connections than Socket.IO. Built-in backpressure detection via `getBufferedAmount()`. |
| **REST API** | Fastify (Node.js) | Historical data queries, OHLCV endpoints. Proxies to QuestDB. Fastest Node.js HTTP framework. |
| **Serialization** | Protocol Buffers for WS, JSON for REST | Protobuf reduces WS payload size by 60-80% vs JSON. Smallest wire format. JSON for REST for developer-friendliness and debugging. |

### Backpressure Strategy (Critical)

The system must handle the fact that exchange feeds produce data faster than browsers can consume it.

**Layer 1 — Ingestion:** CCXT Pro handles per-exchange rate limiting and reconnection. Each exchange connector runs independently.

**Layer 2 — Redis Streams:** Persistent buffer absorbs bursts. Consumer groups allow parallel consumers to process at their own pace. `MAXLEN` or `MINID` trimming prevents unbounded growth.

**Layer 3 — Aggregation:** In-memory aggregator reduces message frequency. Raw ticks (~50K/sec) become aggregated updates (~100/sec per market). Configurable aggregation windows (100ms, 500ms, 1s).

**Layer 4 — WebSocket Server:** Per-connection backpressure detection via `getBufferedAmount()`. Slow clients receive snapshot updates (latest state) instead of every delta. Configurable `maxBackpressure` per socket (e.g., 64KB). Topic-based pub/sub allows clients to subscribe only to markets they care about.

**Layer 5 — Client:** Client-side throttling for rendering (requestAnimationFrame). Reconnection with state catch-up from Redis cache.

### Horizontal Scaling Path

**Phase 1 (Launch):** Single-node deployment. One ingestion service, one Redis instance, one QuestDB instance, one WS server. Handles ~50 markets, ~1,000 concurrent clients.

**Phase 2 (Growth):** Multiple WS server instances behind a load balancer (sticky sessions or Redis-backed pub/sub for cross-instance broadcast). Separate ingestion service per exchange group. QuestDB on dedicated hardware.

**Phase 3 (Scale):** Replace Redis Streams with Redpanda for higher throughput. Add ClickHouse for historical analytics (separate from real-time path). Multiple ingestion pods on Kubernetes. WS servers scale to 10+ instances.

---

## 5. Data Pipeline Design: Exchange WebSocket to Browser

### Step-by-Step Data Flow

#### Step 1: Exchange Connection and Raw Data Ingestion

```typescript
// Using CCXT Pro for exchange connections
import ccxt from 'ccxt';

const exchanges = [
  new ccxt.pro.binance(),
  new ccxt.pro.bybit(),
  new ccxt.pro.okx(),
  // ... 10+ exchanges
];

// Each exchange runs in parallel
for (const exchange of exchanges) {
  watchTrades(exchange, ['BTC/USDT', 'ETH/USDT', ...]);
  watchOrderBook(exchange, ['BTC/USDT', 'ETH/USDT', ...]);
}

async function watchTrades(exchange, symbols) {
  while (true) {
    for (const symbol of symbols) {
      const trades = await exchange.watchTrades(symbol);
      // trades are already normalized by CCXT
      await publishToRedis('trades', trades);
    }
  }
}
```

#### Step 2: Normalization into Unified Schema

```
Unified Trade Schema:
{
  exchange: "binance",
  symbol: "BTC/USDT",        // normalized symbol
  timestamp: 1710000000123,   // unix ms
  side: "buy",               // taker side
  price: 67890.50,
  amount: 0.15,
  cost: 10183.575,
  id: "trade_123456",
  liquidation: false
}

Unified OrderBook Delta Schema:
{
  exchange: "binance",
  symbol: "BTC/USDT",
  timestamp: 1710000000123,
  bids: [[67889.0, 1.5], [67888.5, 2.3], ...],  // [price, size]
  asks: [[67890.0, 0.8], [67890.5, 1.2], ...],
  type: "delta" | "snapshot"
}
```

#### Step 3: Redis Streams Ingestion

```
XADD trades:BTC/USDT MAXLEN ~100000 * \
  exchange binance \
  side buy \
  price 67890.50 \
  amount 0.15 \
  timestamp 1710000000123

XADD orderbook:BTC/USDT:binance MAXLEN ~1000 * \
  data <protobuf_bytes> \
  type delta
```

#### Step 4: Consumer Processing (Parallel)

**Storage Consumer:** Reads from Redis Streams via consumer group, batch-writes to QuestDB every 1 second using InfluxDB Line Protocol.

**Aggregation Consumer:** Maintains in-memory state per market:
- Aggregated orderbook (merged across exchanges, sorted by price)
- Rolling CVD (Cumulative Volume Delta)
- Trade count and volume by time bucket
- Liquidation sums
- Heatmap data (large orders)

Publishes aggregated state to Redis pub/sub channels every 100-500ms.

**Real-time Consumer:** Subscribes to Redis pub/sub, forwards to uWebSockets.js for browser delivery.

#### Step 5: WebSocket Server to Browser

```
Client subscribes:  ws://server/ws
  → { "action": "subscribe", "channels": ["trades:BTC/USDT", "book:BTC/USDT"] }

Server publishes (Protobuf-encoded):
  → AggregatedUpdate {
      symbol: "BTC/USDT",
      timestamp: 1710000000500,
      trades: [{ exchange: "binance", side: "buy", price: 67890.5, amount: 0.15 }, ...],
      book: {
        bids: [[67889.0, 15.3], ...],  // aggregated across exchanges
        asks: [[67890.0, 8.1], ...],
      },
      cvd: 125.7,
      volume_1m: 450.2,
      liquidations: [{ exchange: "bybit", side: "long", amount: 50000 }]
    }
```

#### Step 6: Client-Side Processing

Browser receives Protobuf messages, deserializes, and updates UI state. Client maintains its own orderbook state, applying deltas from the server. Rendering is throttled to `requestAnimationFrame` (60fps) regardless of update frequency.

### Latency Budget

| Stage | Target Latency | Notes |
|---|---|---|
| Exchange WS to Ingestion Service | 1-5ms | Network dependent |
| Normalization | <1ms | In-process |
| Redis Streams publish | <1ms | Local Redis |
| Aggregation processing | 1-5ms | In-memory computation |
| Redis pub/sub to WS server | <1ms | Local Redis |
| WS server to browser | 5-50ms | Network dependent |
| **Total end-to-end** | **~10-65ms** | Exchange event to browser render |

### Data Retention Strategy

| Data Type | Hot Storage (QuestDB) | Warm (Parquet on disk) | Cold (S3) |
|---|---|---|---|
| Raw trades | 7 days | 90 days | Indefinite |
| Orderbook snapshots (1s) | 3 days | 30 days | 1 year |
| OHLCV (1m candles) | 1 year | Indefinite | Indefinite |
| Liquidations | 30 days | 1 year | Indefinite |
| Aggregated metrics | 30 days | 1 year | Indefinite |

---

## Appendix A: Key Open-Source Projects Reference

| Project | URL | Primary Use |
|---|---|---|
| aggr + aggr-server | https://github.com/Tucsky/aggr | Complete trade aggregation terminal |
| cryptofeed | https://github.com/bmoscon/cryptofeed | Multi-exchange feed handler (Python) |
| cryptostore | https://github.com/bmoscon/cryptostore | Feed handler to storage pipeline |
| crypto-crawler-rs | https://github.com/crypto-crawler/crypto-crawler-rs | Rust exchange crawlers |
| nautilus_trader | https://github.com/nautechsystems/nautilus_trader | Rust/Python trading engine |
| barter-rs | https://github.com/barter-rs/barter-rs | Rust trading framework |
| cryexc-backend | https://github.com/jose-donato/cryexc-backend | FastAPI + DuckDB lightweight backend |
| tardis-machine | https://github.com/tardis-dev/tardis-machine | Normalized data replay server |
| CCXT | https://github.com/ccxt/ccxt | Unified exchange API |
| uWebSockets.js | https://github.com/uNetworking/uWebSockets.js | High-performance WebSocket server |
| hummingbot | https://github.com/hummingbot/hummingbot | Market-making bot |
| OpenBB | https://github.com/OpenBB-finance/OpenBB | Financial data platform |

## Appendix B: Serialization Format Comparison

| Format | Serialization Speed | Wire Size | Deserialization | Best For |
|---|---|---|---|---|
| JSON | Baseline | Baseline | Baseline | REST APIs, debugging |
| Protocol Buffers | 2-3x faster | 60-80% smaller | 2-3x faster | WS market data, gRPC |
| FlatBuffers | 2-3x faster | 50-70% smaller | 10-100x faster (zero-copy) | Ultra-low-latency feeds |
| MessagePack | 1.5-2x faster | 30-50% smaller | 1.5-2x faster | Simple binary alternative |

**Recommendation:** Protocol Buffers for our WebSocket data. Good balance of ecosystem maturity, schema enforcement, and performance. FlatBuffers only if we need sub-microsecond deserialization (unlikely for browser clients).

## Appendix C: Message Broker Comparison

| Feature | Redis Streams | Redpanda | Apache Kafka |
|---|---|---|---|
| **Language** | C | C++ | Java (JVM) |
| **Latency** | <1ms | ~1-5ms | ~5-20ms |
| **Throughput** | ~1M ops/sec | ~1M msg/sec | ~1M msg/sec |
| **Persistence** | Optional (AOF/RDB) | Always (fsync) | Always |
| **Consumer Groups** | Yes | Yes (Kafka API) | Yes |
| **Operational Complexity** | Low | Medium | High |
| **Backpressure** | Manual (MAXLEN) | Built-in | Built-in |
| **Clustering** | Redis Cluster | Built-in Raft | ZooKeeper/KRaft |
| **Best For** | <100K msg/sec, simple ops | 100K-1M msg/sec, low latency | >1M msg/sec, ecosystem |
| **Our Recommendation** | Phase 1-2 | Phase 3 (if needed) | Avoid (complexity) |
