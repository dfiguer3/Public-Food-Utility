# Public Food Utility

## Map page (`map.html`)

1. Copy `map-config.example.js` to `map-config.js` in the project root.
2. Set `window.MAPBOX_ACCESS_TOKEN` to your **public** Mapbox token (`pk.`…).
3. Open `map.html` via a local static server (recommended) so `fetch("./data/knox-food-resources.geojson")` works; opening the file as `file://` may block fetches depending on the browser.

The file `map-config.js` is listed in `.gitignore` so tokens are not committed.

### Local server (Windows PowerShell)

From this folder, run (use `;` not `&&` in older PowerShell):

```powershell
Set-Location "C:\path\to\Public Food Utility"
node server.js
```

Then open `http://localhost:5173/map.html` (default port **5173**; override with `PORT=8080 node server.js` on Unix, or `$env:PORT=8080; node server.js` in PowerShell).

If the map is blank, confirm in Mapbox that your token allows requests from `http://localhost:5173` (URL restrictions), or temporarily use an unrestricted public token for local dev.

