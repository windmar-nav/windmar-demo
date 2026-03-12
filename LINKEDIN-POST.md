# LinkedIn Post Draft — Windmar Demo

---

I open-sourced WINDMAR — a physics-based weather routing engine for merchant ships.

Most voyage optimization tools are black boxes. Windmar puts the physics front and center: Holtrop-Mennen resistance prediction, STAWAVE-1 wave added resistance (ISO 15016), SFOC curves at variable engine loads, and seakeeping safety constraints — all calibratable from your own noon reports and engine logs.

Try it locally in 2 minutes — no build step, no credentials needed:

```
mkdir windmar && cd windmar
curl -LO https://raw.githubusercontent.com/windmar-nav/windmar-demo/main/docker-compose.standalone.yml
curl -L -o .env https://raw.githubusercontent.com/windmar-nav/windmar-demo/main/.env.standalone
docker compose -f docker-compose.standalone.yml up -d
```

Open http://localhost:3000 — wind data loads automatically from NOAA GFS.

What's included:
- A* and Dijkstra weather-aware route optimization (6 variants: fuel / balanced / safety)
- Real-time GFS wind fields with Windy-style particle animation
- Wave, current, SST, and ice overlays (with free Copernicus Marine credentials)
- IMO CII compliance tracking and FuelEU Maritime GHG intensity
- Engine log analytics: speed-power scatter, fuel distributions, voyage KPIs
- Monte Carlo confidence intervals (P10/P50/P90 for ETA and fuel)
- 9 pre-validated commercial strait shortcuts (Gibraltar, Dover, Malacca, Hormuz...)
- Charter party weather clause tools

The stack: FastAPI + Next.js + PostgreSQL + Redis, fully containerized.

Important caveat: this is an educational release. The vessel model ships with default MR tanker parameters not yet calibrated against sea trial data. Routing algorithms have not been benchmarked against commercial solutions. A sea validation campaign is planned — results will be published.

Full source code is Apache 2.0 licensed. If you want to improve it, fork it. If you want a production-ready solution, a commercial version is in development.

Demo: https://github.com/windmar-nav/windmar-demo
Source: https://github.com/windmar-nav/windmar
Docs: https://windmar-nav.github.io

#maritime #shipping #weatherrouting #opensource #python #docker #voyageoptimization #decarbonization #navalarchitecture

---

*Attach: 4 screenshots from docs/screenshots/ — weather-wind.png, route-portugal-casquets.png, engine-log-analytics.png, vessel-model.png*
