# UI/UX Multi-Panel Layout Patterns for Professional Trading Terminals

## Research Report — Sprint 8 Architecture

**Date:** 2026-03-17
**Scope:** Dockable, linkable, multi-panel workspace systems for web-based trading terminals

---

## Table of Contents

1. [Developer/Library Network Map](#1-developerlibrary-network-map)
2. [Docking Library Comparison](#2-docking-library-comparison)
3. [UX Patterns from Commercial Trading Platforms](#3-ux-patterns-from-commercial-trading-platforms)
4. [Panel Communication and Symbol Linking Architecture](#4-panel-communication-and-symbol-linking-architecture)
5. [Workspace Serialization Patterns](#5-workspace-serialization-patterns)
6. [Recommended Approach](#6-recommended-approach)

---

## 1. Developer/Library Network Map

### Core Docking Layout Libraries

```
                        ┌─────────────────────┐
                        │   PhosphorJS (dead)  │
                        │   → renamed Lumino   │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼               ▼
            ┌──────────┐  ┌──────────────┐  ┌──────────┐
            │  Lumino   │  │ Golden Layout│  │  Theia   │
            │ (Jupyter) │  │  (IDE-style) │  │  (IDE)   │
            └──────────┘  └──────┬───────┘  └──────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
      ┌──────────────┐  ┌──────────────┐    ┌──────────┐
      │ FlexLayout   │  │   Dockview   │    │  rc-dock │
      │(caplin/React)│  │  (mathuo)    │    │ (ticlo)  │
      └──────────────┘  └──────────────┘    └──────────┘
              │
              ▼
      ┌──────────────────┐
      │ @aptre/flex-layout│ (perf-optimized fork)
      └──────────────────┘

      ┌──────────────┐
      │ react-mosaic  │ (nomcopter — tiling-only, no docking)
      └──────────────┘
```

### Key People and Organizations

| Entity | Role | Notable Projects |
|--------|------|------------------|
| **caplin** (Caplin Systems) | Financial software company | FlexLayout — built for their own trading products |
| **mathuo** | Independent developer | Dockview — zero-dep layout manager, very active |
| **ticlo** | Independent developer | rc-dock — React-native dock layout |
| **nomcopter** | Open source org | react-mosaic — tiling window manager |
| **JupyterLab** (Project Jupyter) | Scientific computing | Lumino — powers JupyterLab's panel system |
| **@annotationhub** | Community maintainer | React wrapper for Golden Layout |
| **aperturerobotics** | Fork maintainer | @aptre/flex-layout — performance-optimized FlexLayout fork |

### Spider Web Connections

- **Caplin Systems** builds financial trading GUIs professionally — FlexLayout originated from their internal needs, which makes it battle-tested for trading UIs specifically.
- **Dockview** (mathuo) studied all prior libraries and built a zero-dependency alternative that addresses pain points from Golden Layout (poor React support), FlexLayout (limited floating panels), and rc-dock (smaller ecosystem).
- **Lumino** descends from PhosphorJS (same author), which also powers Eclipse Theia. It is designed for IDE-style applications, not specifically for trading.
- **Golden Layout** was the original dominant player (6,600+ stars) but has stagnated — last updated 3 years ago, dropped React support in v2, and has no active maintainer.

---

## 2. Docking Library Comparison

### Summary Table

| Feature | FlexLayout | Dockview | Golden Layout | rc-dock | react-mosaic | Lumino |
|---------|-----------|----------|---------------|---------|-------------|--------|
| **Weekly Downloads** | ~46,000 | ~33,500 | ~12,200 | ~9,900 | ~43 projects | ~npm varies |
| **GitHub Stars** | 1,267 | 3,076 | 6,661 | 801 | 4,000+ | 2,800+ |
| **Last Updated** | 11 days ago | 14 days ago | 3 years ago | 6 months ago | Active | Active |
| **Dependencies** | React only | Zero | jQuery (v1) | React | Blueprint (opt) | None |
| **Framework** | React only | React, Vue, Angular, Vanilla TS | Framework-agnostic | React only | React only | Vanilla TS |
| **Tabbed Panels** | Yes | Yes | Yes | Yes | No (tiling only) | Yes |
| **Drag & Drop** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Floating Panels** | Limited | Yes | Yes | Yes | No | No |
| **Popout Windows** | Yes (React Portals) | Yes | Yes (v1 only) | Yes | No | No |
| **Nested Layouts** | Yes | Yes | Yes | Yes | Yes (tree) | Yes |
| **Serialization** | `model.toJson()` | `api.toJSON()` | `config` object | `saveLayout()` | Tree state | `saveLayout()` |
| **TypeScript** | Full | Full | Full (v2) | Full | Full | Full |
| **Dark Theme** | Yes (5 themes) | Yes (customizable) | Basic | Yes | Via Blueprint | Basic |
| **Mobile Support** | Yes | Planned | No | Partial | Yes | No |
| **Border/Edge Panels** | Yes | Yes | No | No | No | No |
| **Mount Strategy** | Mount/unmount | Configurable (display:none OR unmount) | Mount/unmount | Mount/unmount | Mount/unmount | Mount/unmount |

### Detailed Library Profiles

#### FlexLayout (flexlayout-react) — Recommended for Trading

- **Origin:** Built by Caplin Systems, a company that builds financial trading GUIs
- **Architecture:** Tree-based model (rows, columns, tabsets, tabs, borders). All mutations go through `Model.doAction()` — clean unidirectional data flow.
- **Strengths:**
  - Highest download count among React docking libraries
  - Built specifically for financial trading interfaces
  - Five built-in themes including dark mode
  - Border tabsets (side panels with vertical tabs) — useful for watchlists, order panels
  - Popout windows via React Portals (multi-monitor support)
  - React 18 and 19 compatible
  - `model.toJson()` / `Model.fromJson()` for full serialization
  - `onModelChange` callback for auto-save
  - Tab overflow handling (critical when many instruments are open)
- **Weaknesses:**
  - React-only (no Vue/Angular)
  - Floating panels are limited compared to Dockview
  - Mount/unmount on tab switch (no display:none option natively — but `@aptre/flex-layout` fork fixes this)
- **Performance Fork:** `@aptre/flex-layout` renders tab content outside FlexLayout's DOM. Layout changes only trigger CSS updates, not React re-renders — significant for panels with heavy charting components.

#### Dockview — Best Overall Architecture

- **Origin:** Independent project by mathuo, inspired by VS Code's layout system
- **Architecture:** Modular — choose from SplitView, GridView, Panes, or full DockView. Core engine is vanilla TypeScript with framework bindings.
- **Strengths:**
  - Zero dependencies
  - Most flexible rendering: components can stay mounted with `display:none` (avoids costly remount of chart widgets)
  - Floating groups (true floating panels within the layout)
  - Popout windows (panels in separate browser windows)
  - Shadow DOM support
  - Best documentation and examples among all options
  - Active development, responsive maintainer
  - Multi-framework support (React, Vue, Angular, Vanilla TS)
  - High test coverage, SonarCloud analysis
  - `api.toJSON()` / `api.fromJSON()` serialization
  - `api.onDidLayoutChange()` event for auto-save
- **Weaknesses:**
  - Younger project (5 years old vs 10+ for FlexLayout/Golden Layout)
  - No built-in border/edge panels (would need custom implementation for side toolbars)
  - Community smaller than Golden Layout historically

#### Golden Layout — Legacy, Not Recommended

- **Status:** Effectively unmaintained (last update 3 years ago)
- **History:** Was the dominant docking library. Swissquote used it for their forex trading app but abandoned it because "it wasn't really meant to be used with React and needed jQuery."
- **v1:** Required jQuery, class components only
- **v2:** Dropped React support, minimal documentation
- **Verdict:** Do not use for new projects. Historical star count is misleading.

#### rc-dock — Viable Alternative

- **Strengths:** Clean declarative API, tab groups (restrict which tabs can share panels), locked panels, dark theme
- **Weaknesses:** Smallest community, alpha version (4.0.0-alpha.2), fewer features than FlexLayout or Dockview

#### react-mosaic — Tiling Only

- **Model:** Pure tiling window manager (binary tree). No tabs, no docking, no floating.
- **Use case:** When you want a fixed grid of panels that users can resize and rearrange. Used by Palantir internally.
- **Verdict:** Too limited for a full trading terminal. No tab support means each instrument needs its own panel.

#### Lumino — IDE/Notebook Focus

- **Strengths:** Powers JupyterLab, mature architecture, DockPanel with split modes
- **Weaknesses:** Not designed for React, complex API, no built-in floating/popout, steep learning curve
- **Verdict:** Best for building IDE-like apps (Theia, JupyterLab). Overkill and wrong paradigm for trading terminals.

---

## 3. UX Patterns from Commercial Trading Platforms

### TradingView

**Layout Model:** Fixed grid with 1-16 charts per layout (depends on subscription tier)

**Key Patterns:**
- **Multi-chart grid:** Preset grid templates (2x1, 2x2, 3x2, etc.) rather than free-form docking
- **Symbol sync:** Toggle in toolbar — when enabled, changing symbol in one chart changes all charts
- **Selective sync via emoji groups:** Charts can be tagged with emoji markers. Charts sharing the same emoji synchronize symbol/interval/crosshair independently of other groups
- **Synced parameters:** Symbol, crosshair position, interval (timeframe), time/date range
- **Drawing sync:** Drawings can be local to a chart, synced within a layout, or synced globally across all layouts for the same symbol
- **Indicator propagation:** "Add this indicator to the entire layout" applies an indicator across all charts
- **Tab navigation:** Press Tab to cycle between charts in a multi-chart layout
- **Auto-save with manual override:** Layout persists latest interval and symbol; blue "Save" indicator for unsaved changes
- **Layout as document:** A layout is a workspace/document containing multiple charts — symbols are not tied to layouts

**Takeaway for our app:** TradingView's emoji-group sync system is elegant and intuitive. The concept of "sync channels" that users can assign to panels via a colored indicator is the gold standard for symbol linking UX.

### Bloomberg Terminal

**Layout Model:** Evolved from fixed 4-panel maximum to fully flexible tabbed/windowed system (Launchpad)

**Key Patterns:**
- **Launchpad:** User-specific arrangement of connected Bloomberg functions across multi-display desktops. Panels are linked Bloomberg applications that share context.
- **Complexity concealment:** "We're hiding complexity" — thousands of functions organized behind a consistent panel framework. Users see only what they need.
- **Multi-display awareness:** Seamless transition between large multi-monitor desk setup, single laptop, and conference room display
- **Workflow sharing:** Launchpad configurations can be shared among colleagues globally
- **Incremental evolution:** Any abrupt UI change disrupts workflows of 156,000+ users — changes are evolutionary, not revolutionary
- **Color accessibility:** Red/green meaning is critical in finance. Bloomberg designed for 20,000+ users with Color Vision Deficiency (CVD) — uses redundant encoding (shape, position, labels) alongside color

**Takeaway for our app:** Bloomberg's approach to complexity concealment is essential. Start with sensible defaults, let advanced users unlock power features. Multi-display awareness is table stakes for professional traders.

### Quantower

**Layout Model:** Multi-window application with docking to screen edges, grouping, and binding

**Key Patterns:**
- **Workspaces:** Top-level organization. Stored as XML files locally. Auto-saved every 5 minutes + on exit.
- **Groups:** Visual grouping of panels that move together
- **Binds:** Innovative "super-panels" — sets of panels physically stuck together that act as one unit. Users create their own composite widgets.
- **Color-linked panels:** Select a link color on two or more panels to synchronize their symbol parameter. Panel titles change color to show linkage.
- **Templates:** Save any panel's configuration as a reusable template
- **Backup & Restore:** Plugin that bundles all settings, credentials, workspaces into one file
- **Multi-asset connectivity:** 60+ broker/exchange connections — workspace can span multiple data sources

**Takeaway for our app:** Quantower's "Binds" concept (user-created super-panels) is powerful for power users. The color-linking system is the industry standard pattern. Auto-save every 5 minutes is a sensible default.

### Sierra Chart

**Layout Model:** MDI (Multiple Document Interface) — Chartbooks as workspaces

**Key Patterns:**
- **Chartbooks:** Each chartbook is a workspace containing multiple chart windows, Time & Sales, DOM, spreadsheets
- **Chartbook Groups:** Open a collection of chartbooks simultaneously (workspace sets)
- **Window arrangement:** Cascade, tile horizontally, tile vertically, tile as grid (customizable row/column count)
- **Detachable charts:** Any chart can be detached from the main window to become independent (multi-monitor)
- **Always Visible:** Charts can be shared across chartbooks — remain visible when switching active chartbook
- **Chart Templates:** Duplicate chart with all settings to same or different chartbook
- **Multiple instances:** Run separate Sierra Chart instances for fully independent workspaces

**Takeaway for our app:** The "Always Visible" panel concept (a panel that persists across workspace switches) is useful for things like order entry or position monitoring that should always be on screen.

### Bookmap

**Layout Model:** Single primary heatmap visualization with supporting panels

**Key Patterns:**
- **Heatmap-centric:** The 2D heatmap (time x price, color = order volume) is the primary workspace — other panels support it
- **Trade Control Panel (TCP):** Customizable via right-click — drag and drop to rearrange elements
- **Direct execution on chart:** Place, drag, cancel orders directly on the heatmap visualization
- **Multibook:** Aggregates order book data from multiple exchanges into one view
- **Color gradients for liquidity:** Lighter = higher liquidity, darker = less activity

**Takeaway for our app:** Bookmap shows that not every trading UI needs to be a general-purpose docking system. Sometimes a single specialized visualization with supporting panels is more effective.

### ATAS (Advanced Time And Sales)

**Layout Model:** Multi-chart windows with linked panels

**Key Patterns:**
- **Multiple chart types:** Daily, minute, second, tick, range, volume, delta charts
- **Chart Trader:** Trading directly from the chart
- **Linked windows:** Panels can be linked to synchronize symbol/timeframe
- **Volume Profile DOM:** Depth of Market with volume profile visualization

---

## 4. Panel Communication and Symbol Linking Architecture

### The Color-Group Symbol Linking Pattern

This is the universal UX pattern used across all professional trading platforms (TradingView, Quantower, ATAS, Interactive Brokers TWS, Trade Ideas, Sierra Chart):

```
┌─────────────────────────────────────────────────────────┐
│                    Event Bus / Pub-Sub                    │
│                                                          │
│   Channel: RED      Channel: BLUE     Channel: GREEN     │
│   ┌──────────┐     ┌──────────┐      ┌──────────┐       │
│   │ Symbol:  │     │ Symbol:  │      │ Symbol:  │       │
│   │ ES       │     │ NQ       │      │ AAPL     │       │
│   └────┬─────┘     └────┬─────┘      └────┬─────┘       │
│        │                │                  │              │
│   ┌────┴────┐      ┌────┴────┐       ┌────┴────┐        │
│   │ Chart 1 │      │ Chart 3 │       │ Chart 5 │        │
│   │ DOM 1   │      │ T&S 2   │       │ News    │        │
│   │ T&S 1   │      │ DOM 2   │       │ Options │        │
│   └─────────┘      └─────────┘       └─────────┘        │
└─────────────────────────────────────────────────────────┘
```

#### Implementation Architecture

```typescript
// Color-group symbol linking with typed event bus

type LinkColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'none';

interface LinkEvent {
  type: 'symbol' | 'interval' | 'crosshair' | 'timerange';
  value: string;
  sourcePanel: string;
  linkColor: LinkColor;
}

// Option A: Zustand store (recommended for React)
interface LinkStore {
  groups: Record<LinkColor, { symbol: string; interval: string }>;
  panelLinks: Record<string, LinkColor>;  // panelId -> color
  setSymbol: (color: LinkColor, symbol: string, sourcePanel: string) => void;
  setPanelLink: (panelId: string, color: LinkColor) => void;
}

// Option B: Event bus for cross-cutting concerns
class SymbolLinkBus {
  private listeners = new Map<LinkColor, Set<(event: LinkEvent) => void>>();

  subscribe(color: LinkColor, handler: (event: LinkEvent) => void) { /* ... */ }
  publish(event: LinkEvent) { /* ... */ }
  unsubscribe(color: LinkColor, handler: (event: LinkEvent) => void) { /* ... */ }
}
```

### Panel Communication Approaches — Comparison

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Zustand store** | Simple, React-native, devtools, persistent state | Couples panels to store shape | Symbol state, user preferences, workspace config |
| **Event bus (Mitt/custom)** | Fully decoupled, lightweight, fire-and-forget | No state persistence, harder to debug | Crosshair sync, transient UI events, notifications |
| **React Context** | Built-in, no deps | Re-renders all consumers on change, poor scaling | Theme, auth — NOT for high-frequency trading data |
| **Redux** | Predictable, devtools, middleware | Boilerplate, overkill for panel events | Large apps with complex state logic |
| **BroadcastChannel API** | Works across browser tabs/windows | Browser-only, no state | Multi-window/popout synchronization |

### Recommended Hybrid Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Application                       │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │         Zustand Store (Persistent State)     │    │
│  │  - Symbol link groups (color -> symbol)      │    │
│  │  - Panel configurations                      │    │
│  │  - User preferences                          │    │
│  │  - Workspace layout state                    │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │    Event Bus (Transient Cross-Panel Events)  │    │
│  │  - Crosshair position sync                   │    │
│  │  - Order execution notifications             │    │
│  │  - Price alerts                               │    │
│  │  - Panel focus/highlight events               │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  BroadcastChannel (Multi-Window Sync)        │    │
│  │  - Popout window state sync                   │    │
│  │  - Cross-tab symbol changes                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  WebSocket Manager (Real-Time Data)          │    │
│  │  - Market data subscriptions                  │    │
│  │  - Order updates                              │    │
│  │  - Per-panel subscription management          │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Interactive Brokers TWS — Source/Destination Model

IBK TWS adds a directional concept to symbol linking that is worth noting:

- **Source** panels: Can only SEND symbol changes to the group
- **Destination** panels: Can only RECEIVE symbol changes
- **Source/Destination** panels: Both send and receive

This prevents circular updates and gives users fine-grained control. For example, a watchlist could be Source-only, while all charts are Destination-only — clicking a symbol in the watchlist updates all linked charts, but changing a chart's symbol does not update the watchlist.

---

## 5. Workspace Serialization Patterns

### What Gets Serialized

A complete workspace serialization must capture:

```typescript
interface WorkspaceState {
  // Layout structure
  layout: LayoutJSON;           // The docking library's native JSON output

  // Panel states
  panels: Record<string, {
    type: string;               // 'chart' | 'dom' | 'timesales' | 'orderbook' | etc.
    config: PanelConfig;        // Panel-specific settings
    linkColor: LinkColor;       // Symbol linking group
  }>;

  // Global settings
  linkGroups: Record<LinkColor, {
    symbol: string;
    interval: string;
  }>;

  // Metadata
  name: string;
  createdAt: string;
  updatedAt: string;
  version: number;              // Schema version for migrations
}
```

### Library-Specific Serialization

#### FlexLayout
```typescript
// Save
const json = model.toJson();
localStorage.setItem('workspace', JSON.stringify(json));

// Restore
const json = JSON.parse(localStorage.getItem('workspace'));
const model = Model.fromJson(json);

// Listen for changes
model.setOnChange(() => {
  // Auto-save debounced
});
```

#### Dockview
```typescript
// Save
api.onDidLayoutChange(() => {
  const layout = api.toJSON();
  localStorage.setItem('workspace', JSON.stringify(layout));
});

// Restore
const onReady = (event: DockviewReadyEvent) => {
  const saved = localStorage.getItem('workspace');
  if (saved) {
    event.api.fromJSON(JSON.parse(saved));
  } else {
    // Create default layout
    event.api.addPanel({ id: 'chart-1', component: 'Chart' });
  }
};
```

### Serialization Best Practices

1. **Schema versioning:** Always include a version number. When the schema changes, write migration functions.

2. **Debounced auto-save:** Save on every layout change but debounce (e.g., 1-2 seconds). Quantower saves every 5 minutes — for web apps, more frequent is better since browser crashes lose unsaved state.

3. **Named workspaces:** Let users save multiple named workspaces (like TradingView layouts or Sierra Chart chartbooks).

4. **Default layouts:** Ship 3-5 preset layouts:
   - Single chart (beginner)
   - 2x2 grid (multi-instrument)
   - Chart + DOM + T&S (scalping)
   - Multi-timeframe (4 charts, same symbol, different intervals)
   - Full analysis (chart + orderbook + news + positions)

5. **Panel state separation:** Store panel-specific state (indicators, drawing tools, settings) separately from layout structure. This allows panels to be moved without losing their configuration.

6. **Export/import:** Allow users to export workspace as JSON file and import on another machine (like Quantower's Backup & Restore).

7. **Server-side sync:** For logged-in users, sync workspace state to the server so they can access their layout from any device (like TradingView).

---

## 6. Recommended Approach

### Primary Recommendation: Dockview

**Dockview** is the recommended docking library for our trading terminal, with the following rationale:

| Criterion | Why Dockview |
|-----------|-------------|
| **Performance** | Configurable mount strategy — panels can stay mounted with `display:none`, avoiding costly re-renders of charting components |
| **Zero dependencies** | No transitive dependency risk, smaller bundle |
| **Active maintenance** | Updated within 2 weeks, responsive maintainer, high test coverage |
| **Floating panels** | Built-in floating groups — essential for traders who want to pop out a DOM or order entry |
| **Popout windows** | Native support for rendering panels in separate browser windows (multi-monitor) |
| **Serialization** | Clean `toJSON()`/`fromJSON()` API with layout change events |
| **TypeScript** | Full type safety throughout |
| **Future-proof** | Multi-framework support (if we ever migrate from React) |

**Runner-up: FlexLayout** — If we need border/edge panels (vertical side tabs for watchlists, tool palettes) out of the box, FlexLayout is the better choice. Its origin in financial software (Caplin Systems) means its API was designed for our exact use case. Consider the `@aptre/flex-layout` fork for its performance-optimized rendering.

### Architecture Blueprint

```
┌──────────────────────────────────────────────────────────┐
│                     App Shell                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  Top Toolbar                        │  │
│  │  [Workspace: ▼] [Layout: ▼] [+ Panel] [Save] [⚙]  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Dockview Container                     │  │
│  │                                                     │  │
│  │  ┌──────────────────┐  ┌──────────────────────┐    │  │
│  │  │  Chart Panel      │  │  DOM / Ladder        │    │  │
│  │  │  [🔴 ES 5m]      │  │  [🔴 ES]             │    │  │
│  │  │                   │  │                       │    │  │
│  │  │  ┌─────────────┐ │  │  ┌─────────────────┐ │    │  │
│  │  │  │ TradingView │ │  │  │  Depth of Market │ │    │  │
│  │  │  │ or custom   │ │  │  │  price ladder    │ │    │  │
│  │  │  │ chart       │ │  │  │                  │ │    │  │
│  │  │  └─────────────┘ │  │  └─────────────────┘ │    │  │
│  │  └──────────────────┘  └──────────────────────┘    │  │
│  │                                                     │  │
│  │  ┌──────────────────┐  ┌──────────────────────┐    │  │
│  │  │  Time & Sales     │  │  Positions / Orders  │    │  │
│  │  │  [🔴 ES]         │  │  [ALL]               │    │  │
│  │  └──────────────────┘  └──────────────────────┘    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  Status Bar                         │  │
│  │  Connection: ● Live  |  Latency: 2ms  |  CPU: 12%  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Core Layout (Week 1-2)
- Integrate Dockview with `DockviewReact`
- Implement workspace serialization (save/load to localStorage)
- Create 3-5 default layout presets
- Build workspace switcher UI

#### Phase 2: Symbol Linking (Week 2-3)
- Implement Zustand store for link groups (6-8 color channels)
- Build link-color selector component (small colored dot in each panel's tab)
- Wire symbol changes through link groups
- Add interval (timeframe) sync as optional second channel

#### Phase 3: Panel Framework (Week 3-4)
- Define `PanelComponent` interface (every panel type implements this)
- Build panel registry (map of panel type string to React component)
- Implement panel-specific state serialization
- Create "Add Panel" menu with all available panel types

#### Phase 4: Advanced Features (Week 4-5)
- Floating panels (Dockview built-in)
- Popout windows (Dockview built-in, add BroadcastChannel sync)
- Crosshair sync via event bus
- Keyboard shortcuts (Ctrl+1-9 for workspace switch, Ctrl+N for new panel)
- Named workspace save/load
- Export/import workspace as JSON file

#### Phase 5: Polish (Week 5-6)
- Dark theme (required — all trading platforms are dark by default)
- Panel tab customization (show symbol + color indicator)
- Auto-save with debounce (1 second delay)
- Preset layout gallery
- Responsive behavior (collapse to tabs on small screens)
- Accessibility (keyboard navigation between panels, screen reader support)

### Key Technical Decisions

1. **Mount strategy:** Use `display:none` mode for chart panels (avoid remounting heavyweight charting libraries) and unmount mode for less expensive panels (news, positions) to save memory.

2. **State management:** Zustand for persistent shared state (link groups, preferences), lightweight event bus (Mitt — 200 bytes) for transient events (crosshair sync, notifications).

3. **Panel isolation:** Each panel should manage its own WebSocket subscriptions. When a panel's symbol changes (via linking), it unsubscribes from the old symbol's feed and subscribes to the new one.

4. **Performance budget:** Target 10-15 simultaneously active panels. Beyond that, use `display:none` to keep inactive panels mounted but not rendering. Monitor memory usage — chart panels with large datasets can consume 50-100MB each.

5. **Workspace storage hierarchy:**
   - `localStorage` for quick save/restore (immediate, offline-capable)
   - Server-side sync for cross-device access (eventual consistency)
   - File export for backup/sharing

---

## Appendix: Key Resources

### Library Documentation
- Dockview: https://dockview.dev/
- FlexLayout: https://github.com/caplin/FlexLayout
- rc-dock: https://github.com/ticlo/rc-dock
- react-mosaic: https://github.com/nomcopter/react-mosaic
- Lumino: https://github.com/jupyterlab/lumino
- Golden Layout: https://golden-layout.com/

### npm Trends Comparison
- https://npmtrends.com/dockview-vs-flexlayout-react-vs-golden-layout-vs-rc-dock

### Commercial Platform References
- TradingView multi-chart sync: https://www.tradingview.com/support/solutions/43000629992-how-to-sync-the-charts-of-my-layout/
- Bloomberg Launchpad UX: https://www.bloomberg.com/ux/2017/11/10/relaunching-launchpad-disguising-ux-revolution-within-evolution/
- Quantower workspace management: https://help.quantower.com/quantower/general-settings/workspaces-binds-groups
- Quantower panel linking: https://help.quantower.com/quantower/general-settings/link-panels
- Sierra Chart chartbooks: https://www.sierrachart.com/index.php?page=doc/Chartbooks.html
- Bookmap Trade Control Panel: https://bookmap.com/learning-center/getting-started/trading/trade-control-panel-overview
- IBKR TWS color-group linking: https://ibkrguides.com/traderworkstation/color-grouping-linked-panels.htm

### Architecture Patterns
- Event Bus pattern: https://dzone.com/articles/design-patterns-event-bus
- Pub/Sub in React: https://medium.com/@nouraldin.alsweirki/pub-sub-pattern-in-react-e1ea02cfdf96
- Dockview HN discussion: https://news.ycombinator.com/item?id=42666492

### Developer Network
- Dockview author (mathuo): https://github.com/mathuo
- FlexLayout author (Caplin): https://github.com/caplin
- rc-dock author (ticlo): https://github.com/ticlo
- @aptre/flex-layout fork: https://github.com/aperturerobotics/flex-layout
