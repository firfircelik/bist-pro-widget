# BIST Pro v2 - Multi-Timeframe Guide (PWA)

**This is an educational tool, not investment advice.**

## Welcome to Hacktoberfest 2025!

We're excited to participate in Hacktoberfest 2025! This project aims to provide a progressive web application (PWA) for analyzing BIST (Borsa Istanbul) data with multi-timeframe capabilities. We welcome contributions from developers of all skill levels.

## How to Contribute

To contribute to this project during Hacktoberfest, please follow these steps:

1.  **Fork** this repository.
2.  **Clone** your forked repository to your local machine.
3.  Create a new **branch** for your feature or bug fix: `git checkout -b feature/your-feature-name` or `git checkout -b bugfix/your-bug-fix-name`.
4.  Make your **changes** and ensure they adhere to the project's coding standards.
5.  **Commit** your changes with a clear and descriptive message.
6.  **Push** your branch to your forked repository.
7.  Open a **Pull Request** (PR) to the `main` branch of this repository.

### Contribution Ideas

-   Improve UI/UX of existing features.
-   Add new analytical tools or indicators.
-   Enhance performance and responsiveness.
-   Improve documentation (e.g., add more detailed explanations for features).
-   Fix bugs and address issues.

## Project Setup

### Mac (Local testing)

```bash
python3 -m http.server 8000
```

Then, open Safari/Chrome: `http://localhost:8000` → **Share/Add to Dock** to install.

### iPhone

Open the page with Safari → **Share > Add to Home Screen**.

> For full PWA behavior, HTTPS (GitHub Pages/Netlify) is recommended.

## Features (v2)

-   **Market Hours & Status**: Open/closed/break + countdown according to Europe/Istanbul time. You can change the hours in **Settings**.
-   **Monte Carlo Simulator**: Distribution, percentiles, and drawdown probability with win rate, R:R, risk %, number of trades, and number of runs.
-   **Daily Statistics + Equity Curve**: Expectancy, max DD, total PnL, avg. R, and plotting — all local.
-   **Watchlist Import/Export (CSV)**.
-   **Tick step & timeframe & theme** settings (dark/light).
-   **Service Worker v2** — more robust caching.

## Usage Tips

-   Enter a symbol and **Apply**; switch between 1D/1h/5m/1m.
-   **Risk** calculator rounds according to tick step; determine the tick value yourself in Settings as market rules may change.
-   Test your risk/reward profile with **Monte Carlo**; results are statistical.
-   **Journal**: Statistics & curve are automatically calculated from your entered results; **CSV** export/import.

## Notes

-   TradingView embedded components are used; check third-party terms.
-   Session hours, ceiling-floor bands, and precautions may change; verify from official sources.