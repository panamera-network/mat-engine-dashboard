# mat-engine-dashboard

Real-time trading dashboard synced with mat-strategy-engine backend. Displays live bias/strategy signals, interactive charting with drawing tools & indicators, and on-demand strategy control.

## Architecture

### Tech Stack
- **Frontend:** React 19 + TypeScript 5.8 + Vite 7
- **State:** Zustand (subscribeWithSelector middleware)
- **Charting:** lightweight-charts (professional OHLCV rendering)
- **Styling:** CSS-in-JS with theme constants
- **WebSocket:** Native browser WS for low-latency data
- **HTTP Proxy:** Vite dev server proxies `/api/*` → `http://localhost:8000`

### Project Structure
```
src/
├── components/
│   ├── app/              # Layout shell (App, Dashboard, Header, SidePanel, Footer)
│   ├── chart/            # Chart suite (LiveChart, ChartPanel, drawing tools, indicators)
│   ├── BiasTable/        # Symbol screening table with bias/confidence
│   ├── InstrumentStrip/  # Per-symbol metrics (audit trail, volatility, CCI, volume, etc)
│   ├── Strength_meter/   # Currency strength visualization
│   ├── Correlation/      # Symbol correlation heatmap
│   ├── Notification/     # Escalation alerts + log panel
│   ├── StrategyControl/  # Strategy toggle UI (backend integration)
│   ├── system/           # LiveSignalFeed, TickStream (WebSocket data pipelines)
│   └── sidepanel/        # System status monitor
├── hooks/
│   └── useActiveSymbol   # Unified symbol resolution (selected + resolved + feed key)
├── lib/
│   ├── symbolUtils       # Symbol name matching & broker resolution
│   ├── indicators        # Technical indicator calculations (SMA, EMA, BB, RSI, MACD, Volume)
│   └── (indicators/)     # Internal indicator functions
├── ui/
│   ├── Panel             # Styled container component
│   ├── PulseBox          # Animated border on state change
│   ├── GaugeMeter        # Needle gauge for numeric values
│   ├── classifyPulse     # Pulse intensity classifier
│   └── HUD               # Header + separator elements
├── theme.ts              # Global color, spacing, radius constants
├── index.css             # Base styles
└── main.tsx              # React entry point

src/_archive/             # Deprecated components (safe to ignore)
```

### Data Flow

```
Backend (mat-strategy-engine, localhost:8000)
    ↓
    ├─→ WebSocket: ws://localhost:8000/core/output/ws
    │   └─→ LiveSignalFeed → store.feed (bias, scalping, swing per symbol/timeframe)
    │
    ├─→ WebSocket: ws://localhost:8000/api/ws/ticks?symbol=XAUUSD
    │   └─→ TickStream → store.ticks (live price ticks)
    │
    └─→ REST API (via vite proxy):
        ├─ GET /api/mt5/symbols → ChartPanel (list)
        ├─ GET /api/mt5/history → LiveChart (500 bars, OHLCV)
        ├─ GET /api/mt5/resolve → symbol broker mapping
        ├─ PATCH /core/strategies/{name} → StrategyControl (toggle on/off)
        └─ GET /api/system-status → useSystemStatus (health check)

Zustand Store (store.ts)
    ↓
    ├─ feed (bias, scalping, swing data per symbol)
    ├─ ticks (price history per symbol)
    ├─ biasTimeline (confidence over time)
    ├─ volatility, volume, cci, momentum (indicators)
    ├─ selectedSymbol, resolvedSymbol
    ├─ pulses (animation triggers)
    └─ [all consumed by UI components]
```

## What's Working Well ✅

### Core Features
1. **Live Data Streams** — WebSocket bias feed + tick stream with auto-reconnect (5s retry)
2. **Symbol Resolution** — Handles broker-specific suffixes (_i, .r, -pro) via fuzzy lookup + MT5 API
3. **Interactive Chart** 
   - Candlestick OHLCV with crosshair + live dot
   - Drawing tools (line, rectangle, freehand) with clear button
   - On-demand indicators (SMA, EMA, RSI, Volume, etc.) added via dropdown
   - OHLC overlay + live status indicator
4. **Dashboard Layout** — 4-column grid responsive to content
5. **Bias Table** — Real-time symbol screening, sortable by confidence/momentum
6. **Strategy Control** — Toggle strategies on/off with immediate feedback
   (was actually broken until 2026-06-27 — see "Live Audit Findings" below;
   UI/logic was solid, just hitting the wrong backend path)
7. **Error Handling** — Proper ErrorBoundary, graceful WebSocket disconnects, API error logging
8. **Type Safety** — Full TypeScript, strict mode enabled
9. **Build** — Clean production build, dev server w/ HMR, no console errors

### Code Quality
- Clean separation of concerns (data, UI, utilities)
- Reusable components (Panel, PulseBox, GaugeMeter)
- Consistent theme system (colors, spacing, radius)
- No unused imports, proper dependency arrays
- Git history clean (meaningful commits)

## Known Issues & TODOs 🔧

### High Priority (blocks workflows)

1. **Indicator Rendering** 
   - **Issue:** Multi-series indicators (Bollinger Bands, MACD) not yet rendered (marked "not yet supported")
   - **Why:** lightweight-charts API complexity for multiple series per indicator
   - **Fix:** Create wrapper for multi-series indicators, add histogram rendering for MACD, handle band overlays for BB
   - **Impact:** Users can't visualize volatility bands or momentum divergence

2. **Chart Styling**
   - **Issue:** Drawing tools canvas + OHLC overlay functional but bare-bones (no animations, minimal visual feedback)
   - **Why:** Pragmatic MVP approach — got the core working, polish later
   - **Fix:** Add animations (fade-in on indicator add, smooth line draws), better styling for active drawing mode, tooltip on hover
   - **Impact:** Medium — UX is usable but not polished

3. **Performance** (mostly resolved 2026-06-27)
   - **Issue:** `/core/output` independently fetched MT5 candles per (symbol,
     timeframe) per engine (Bias, Structure, Momentum, Shift, demand) — huge
     redundant round-trips, ~56s for a 36-symbol response.
   - **Fix (done):** Engine added a request-scoped `CandleCache` — one batch
     fetch per (symbol, tf), every engine reads through it. Down to ~15-16s
     for all 36 symbols. See `mat-strategy-engine`'s `CLAUDE.md`.
   - **Fix (done):** Engine also added `POST /core/output` accepting
     `{symbols: [...]}` to process only a subset — ~5s for 5 symbols.
   - **Remaining:** ~15s for the full 36-symbol case is still MT5
     round-trip-bound (324 distinct calls); getting under 5s for the full
     set would need a background-refresh cache architecture, not done.

### Medium Priority (nice-to-have)

4. **Indicator Logic**
   - **Issue:** Simple SMA/EMA calculations working; RSI/MACD/BB logic not battle-tested against real data
   - **Fix:** Validate indicator outputs vs. TradingView reference, add unit tests for edge cases (low volume, gaps)
   - **Impact:** Low — calculations look correct, but real-world edge cases unknown

5. **WebSocket Resilience**
   - **Issue:** Ticks WebSocket resolves symbol on mount; if broker symbol changes mid-session, chart may stale
   - **Why:** Symbol resolution is one-time at selection
   - **Fix:** Re-resolve symbol if WS disconnect + reconnect, or add manual refresh button
   - **Impact:** Low — only affects mid-session broker symbol changes (rare)

6. **Strategy Control UX**
   - **Issue:** StrategyControl polls strategies every 5s; no visual feedback during toggle (button disables but no spinner)
   - **Fix:** Add loading state UI, optimistic updates
   - **Impact:** Low — works but feels laggy

### Low Priority (refactor/tech debt)

7. **Drawing Tools State**
   - **Issue:** Drawings stored only in canvas memory; lost on chart re-render or page reload
   - **Fix:** Persist to localStorage or backend; allow export/import as annotations
   - **Impact:** Nice-to-have — annotations are session-scoped today

8. **Archive Folder**
   - **Issue:** `src/_archive/` holds ~15 deprecated files; not needed but safe to keep for reference
   - **Fix:** Delete if confidence old components won't be resurrected; otherwise document why kept
   - **Impact:** None — doesn't affect build/runtime

9. **Theme System**
   - **Issue:** No dark/light mode toggle; single theme baked in
   - **Fix:** Add theme switcher, export theme to CSS variables for dynamic switching
   - **Impact:** Nice-to-have — current theme works well

10. **Test Coverage**
    - **Issue:** No unit/integration tests
    - **Fix:** Add Jest + React Testing Library for store, indicators, components
    - **Impact:** Medium — would catch regressions early

## Live Audit Findings (2026-06-27)

This repo was audited live against the real running `mat-strategy-engine`
backend (a duplicate copy at `D:\mat-engine-dashboard` had already gone
through the same audit independently — found the same bugs, confirming they
weren't one-off mistakes). Findings:

1. **`StrategyControl` was actually broken** — it fetched `/api/core/strategies`,
   proxied by Vite's `/api` rule straight to
   `http://localhost:8000/api/core/strategies`, which doesn't exist. The
   engine mounts strategy routes directly under `/core/strategies` (no `/api`
   prefix) — see `mat-strategy-engine`'s `api/core_router.py`. The component
   itself (loading/error/disable states, toggle UX) was solid; it was purely
   a wrong-path bug, undetected because it was likely never run against the
   live engine before. **Fixed**: added a `/core` proxy rule in
   `vite.config.ts` (mirroring the `/api` one) and changed both fetch calls
   in `StrategyControl.tsx` to `/core/strategies` / `/core/strategies/{name}`.
   Verified live through the dev server proxy — list + PATCH toggle both work.
2. **`store.ts`'s `setFeed()` read fields that never existed in the real
   `/core/output`**: `feed[symbol].trendShort/Mid/Long` and
   `feed[symbol].liquidityLevels`. Fixed — `trendSlope` now derives from real
   `feed[symbol].bias[tf].score` averaged across short/mid/long timeframe
   groups; `liquidityLevels` derives from `feed[symbol].supply_demand_zones`
   flattened across timeframes. Same fix as applied to the `D:` duplicate.
3. **Still parked — no backend data source exists**: `auditTrail`
   (top-level `feed.auditTrail`), `volatilityHistory`, `riskDistance`/
   `rewardDistance`. Same root causes as documented in `mat-strategy-engine`'s
   CLAUDE.md (notification system deleted, no time-series field, no current-
   price reference in the feed). Left reading the old field names — harmless
   fallback to defaults — rather than ripping out the UI wiring.
4. Dead config removed: `USE_MOCK_DATA`/`USE_MOCK` (never read anywhere in
   `src/`), `generate-manifest` npm script (pointed at a `generateManifest.js`
   that never existed). `.env` was tracked in git despite containing
   environment-specific config — added to `.gitignore`, `.env.example` added,
   removed from tracking (`git rm --cached`).
5. `symbolUtils.ts`'s `feedLookupKey()`/`stripBrokerSuffix()` — **left
   untouched, confirmed correct**. Initially assumed (from the `D:` duplicate
   audit) that `selectedSymbol: "XAUUSD"` needing a hardcoded `_i` suffix
   would be a bug here too — it isn't. This repo already solves broker-suffix
   matching dynamically and more robustly than the `D:` duplicate did.
6. `npx tsc -b --noEmit` and `npm run build` were already clean before this
   audit — no TypeScript errors existed here (unlike the `D:` duplicate,
   which had 17).

## Symbol selector + filtered engine output (2026-06-27)

Added alongside the existing `LiveSignalFeed`/`TickStream` (which still
fetch all 36 symbols continuously via websocket):
- **`SymbolSelector.tsx`** — multi-select dropdown in the header. Fetches
  the real symbol list from `GET /core/symbols` (via the `/core` proxy
  rule added above). Selection persists to `localStorage`
  (`selectedSymbols`), default `DEFAULT_SYMBOLS` in `store.ts` (`XAUUSD_i,
  EURUSD_i, GBPUSD_i, USDJPY_i, USDCHF_i`). Changing selection keeps
  `selectedSymbol` valid — falls back to the first selection if the
  currently-shown symbol gets deselected.
- **`EnginePoller.tsx`** (in `system/`) — POSTs `/core/output` with
  `{symbols: selectedSymbols}` on mount, on selection change, and every
  30s, via `api/engineClient.ts`. Drives `store.setFeed()`. Runs
  *alongside* the websocket, not replacing it — `CurrencyMeter` needs full
  symbol coverage to compute strength correctly, and filtering would
  degrade that.
- **`EngineStatus.tsx`** — small colored-dot + label in the header showing
  loading / `"Engine offline"` on fetch failure / last-updated time, all
  driven by `EnginePoller` via new `engineLoading`/`engineError`/
  `engineLastUpdated` store fields.
- **No mock strategy selector added** — this repo already has a real
  `StrategyControl` (just-fixed, see "Live Audit Findings" above), so
  there's no need for a placeholder. (A `D:` duplicate of this repo got a
  10-mock-strategy `StrategySelector` during the same session, specifically
  because *that* copy never had a real one — doesn't apply here.)

Verified live through the dev server's `/core` proxy: `GET /core/symbols`
and `POST /core/output` with a filtered `symbols` body both return real
data.

## Configuration

### Environment Variables (.env)
```
VITE_WS_URL=ws://localhost:8000        # Backend WebSocket base URL
```
(`USE_MOCK_DATA`/`USE_MOCK` removed 2026-06-27 — see "Live Audit Findings".)

### Vite Proxy (vite.config.ts)
```
/api  → http://localhost:8000          # REST API proxy (with WS support)
/core → http://localhost:8000          # Strategy/output routes (added 2026-06-27 — see "Live Audit Findings")
```

### TypeScript (tsconfig.app.json)
- Strict mode enabled
- Excludes `src/_archive` from compilation
- noUnusedLocals, noUnusedParameters enforced

## Development Workflow

### Start Dev Server
```bash
npm install
npm run dev
# Runs on http://localhost:5173 (or next available port)
```

### Build for Production
```bash
npm run build        # Compiles TS + Vite bundle
npm run preview      # Test production build locally
```

### Type Check
```bash
npx tsc --noEmit    # Check without emitting files
```

### Linting
```bash
npm run lint         # ESLint check
```

## Backend Contract

### LiveSignalFeed (WebSocket)
**URL:** `ws://localhost:8000/core/output/ws`
**Payload (per message) — corrected 2026-06-27, this previously documented
fields that never existed in the real backend (`volatilityHistory`,
`trendShort/Mid/Long`, `liquidityLevels` at top level, no `_i` suffix):**
```json
{
  "XAUUSD_i": {
    "last_updated": "2026-06-27T...",
    "bias": { "M1": { "label": "neutral", "score": -0.4, "strength": 1.83 }, ... },
    "scalping": { "alignment_signal": { "decision": "Go Short", "confidence_pct": 50 }, "M1": { "bias": -0.8, "momentum": -0.0002, ... } },
    "swing": { ... },
    "health": { ... },
    "signal_health": { ... },
    "strategy_signals": [{ "symbol": "XAUUSD_i", "timeframe": "M5", "direction": "short", "price": 4071.69, "confidence": 0.5, ... }],
    "snr_levels": { "M1": [{ "type": "Resistance", "level": 4074.13, "source": "HH", "valid": true }], ... },
    "order_blocks": { "H4": [{ "type": "Bullish", "high": ..., "low": ..., "valid": true, "mitigated": false }], ... },
    "fvg": { "M1": [{ "type": "Bullish", "top": ..., "bottom": ..., "mitigated": false }], ... },
    "supply_demand_zones": { "M1": [{ "type": "supply", "top": ..., "bottom": ..., "strength": 1.18, "valid": true }], ... }
  },
  ...
}
```
No raw "current price" field exists anywhere in this payload — `riskDistance`/
`rewardDistance` (RiskRewardMeter) can't be computed from real data until the
engine adds one. `volatilityHistory` and top-level `auditTrail` also don't
exist — see CLAUDE.md's "Live Audit Findings" below.

### TickStream (WebSocket)
**URL:** `ws://localhost:8000/api/ws/ticks?symbol=XAUUSD`  
**Payload (per tick):**
```json
{ "symbol": "XAUUSD", "price": 2500.45, "time": 1719446400, "bid": 2500.43, "ask": 2500.47 }
```

### ChartPanel (REST)
**GET /api/mt5/symbols**  
Response: `{ "symbols": ["XAUUSD", "EURUSD", ...] }`

**GET /api/mt5/history?symbol=XAUUSD&timeframe=60&bars=500**  
Response: `[{ "time": 1719446400, "open": 2500.1, "high": 2500.5, "low": 2499.9, "close": 2500.4, "volume": 1000 }, ...]`

**GET /api/mt5/resolve?base=XAUUSD**  
Response: `{ "status": "ok", "resolved": "XAUUSD" }`

### StrategyControl (REST)
**GET /core/strategies** (note: `/core`, not `/api/core` — fixed 2026-06-27,
see "Live Audit Findings")
Response: `{ "strategies": [{ "name": "ScalpingBiasCascade", "enabled": true }, { "name": "ZoneContinuationStrategy", "enabled": true }, ...] }`
— 5 real strategies, not "scalping"/"swing" mode names.

**PATCH /core/strategies/{name}**
Payload: `{ "enabled": true/false }`

## Key Decisions & Rationale

1. **Zustand over Redux** — Simpler API, subscribeWithSelector for component-level observability
2. **lightweight-charts** — Professional OHLCV charting, lightweight, real-time capable
3. **WebSocket for bias/ticks** — Low-latency streaming; REST for history (batch)
4. **Symbol resolution hook** — Unified logic; avoids prop-drilling selected/resolved/feed keys
5. **Drawing canvas overlay** — Simple, no library dependency; good enough for MVP
6. **On-demand indicators** — User-driven UI; avoids performance hit of pre-computing all indicators
7. **_archive folder** — Soft delete; keeps history, doesn't block build
8. **No E2E tests yet** — Team decided MVP ships without them; can add later

## Future Enhancements

- [ ] Multi-timeframe chart views (side-by-side or tabbed)
- [ ] Alert system (price cross, indicator divergence)
- [ ] Backtesting UI for strategies
- [ ] Indicator parameter customization (period, std dev, etc.)
- [ ] Export chart as image/PDF
- [ ] Annotation persistence (localStorage)
- [ ] Dark mode toggle
- [ ] Mobile-responsive layout
- [ ] Unit/integration test suite

## Support & Debugging

### Chart not updating?
1. Check WebSocket status in browser console (should see "[LiveSignalFeed] Connected to WS")
2. Verify backend is running on `localhost:8000`
3. Check vite proxy config in `vite.config.ts`
4. Open DevTools → Network tab, look for WebSocket connection

### Indicator not rendering?
1. Check browser console for errors (likely "Indicator X not yet supported")
2. Multi-series indicators (BB, MACD) need custom handling — see **Known Issues #1**
3. Verify candle data loaded (OHLC overlay should show values)

### Strategy toggle not working?
1. Check backend `/core/strategies` endpoint is responding
2. Verify PATCH request succeeds (DevTools → Network)
3. Check backend logs for strategy state changes

### Performance slow?
1. Profile backend `/core/output` endpoint response time
2. Check browser DevTools → Performance tab for render bottlenecks
3. Consider reducing indicator count or timeframe history window

---

**Last Updated:** 2026-06-27 (live audit — see "Live Audit Findings")
**Maintainer:** Farez
**Status:** MVP Complete, Testing Phase

**Note:** a duplicate of this repo exists at `D:\mat-engine-dashboard` with no
git remote — that one went through an independent audit pass first (same
session, same bugs found). This repo (`C:\Users\farez\...`, with the real
`panamera-network/mat-engine-dashboard` GitHub remote) is the canonical one.
