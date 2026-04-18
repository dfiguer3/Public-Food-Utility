/* global mapboxgl */
(function () {
  "use strict";

  /** Approximate bounding box for Knoxville / Knox County area (Mapbox order: west, south, east, north). */
  const KNOX_BBOX = { west: -84.2, south: 35.75, east: -83.55, north: 36.15 };
  const KNOX_CENTER = [-83.9207, 35.9606];

  const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
  const FOOD_DATA_URL = "./data/knox-food-resources.geojson";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function inKnoxBBox(lng, lat) {
    return (
      lng >= KNOX_BBOX.west &&
      lng <= KNOX_BBOX.east &&
      lat >= KNOX_BBOX.south &&
      lat <= KNOX_BBOX.north
    );
  }

  function haversineMeters(a, b) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function formatDistance(m) {
    if (m < 1000) return `${Math.round(m / 50) * 50} m`;
    return `${(m / 1609.34).toFixed(1)} mi`;
  }

  function formatDuration(sec) {
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h} hr ${mm} min`;
  }

  const token = window.MAPBOX_ACCESS_TOKEN;
  const mapEl = $("#map");
  const listEl = $("#map-place-list");
  const searchForm = $("#map-search-form");
  const searchInput = $("#map-search-input");
  const locateBtn = $("#map-locate-btn");
  const statusEl = $("#map-status");
  const routeSummaryEl = $("#map-route-summary");
  const routeStepsEl = $("#map-route-steps");
  const routeClearBtn = $("#map-route-clear");

  if (typeof mapboxgl === "undefined") {
    if (mapEl) {
      mapEl.innerHTML =
        '<p class="map-error">Could not load Mapbox GL JS (blocked network or script error). Check your connection and that the Mapbox CDN is allowed, then reload.</p>';
    }
    return;
  }

  if (!mapEl || !token) {
    if (mapEl) {
      mapEl.innerHTML =
        '<p class="map-error">Add your Mapbox public token. Copy <code>map-config.example.js</code> to <code>map-config.js</code> and set <code>MAPBOX_ACCESS_TOKEN</code>, then reload. Open this site via <code>http://localhost:5173/map.html</code> (not <code>file://</code>) so <code>map-config.js</code> loads.</p>';
    }
    return;
  }

  mapboxgl.accessToken = token;

  const map = new mapboxgl.Map({
    container: mapEl,
    style: MAP_STYLE,
    center: KNOX_CENTER,
    zoom: 11,
    maxBounds: [
      [KNOX_BBOX.west - 0.15, KNOX_BBOX.south - 0.08],
      [KNOX_BBOX.east + 0.15, KNOX_BBOX.north + 0.08],
    ],
  });

  map.on("error", (e) => {
    const msg =
      e && e.error && e.error.message
        ? e.error.message
        : "Map error (often an invalid Mapbox token or URL restrictions on the token).";
    setStatus(msg);
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

  let foodCollection = null;
  let selectedId = null;
  /** @type {[number, number] | null} */
  let userLngLat = null;
  /** @type {[number, number] | null} */
  let refLngLat = null;

  function setStatus(msg) {
    if (statusEl) {
      statusEl.textContent = msg || "";
      statusEl.hidden = !msg;
    }
  }

  function setSelectedFeature(id) {
    if (!foodCollection) return;
    for (const f of foodCollection.features) {
      const fid = f.properties && f.properties.id;
      if (!fid) continue;
      map.setFeatureState({ source: "food-places", id: fid }, { selected: fid === id });
    }
    selectedId = id;
    renderList();
  }

  function refPointForSort() {
    if (userLngLat) return userLngLat;
    if (refLngLat) return refLngLat;
    return KNOX_CENTER;
  }

  function sortedFeatures() {
    if (!foodCollection) return [];
    const ref = refPointForSort();
    return foodCollection.features
      .slice()
      .map((f) => ({
        f,
        d: haversineMeters(ref, f.geometry.coordinates),
      }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.f);
  }

  function renderList() {
    if (!listEl || !foodCollection) return;
    listEl.innerHTML = "";
    for (const f of sortedFeatures()) {
      const p = f.properties;
      const id = p.id;
      const dist = formatDistance(haversineMeters(refPointForSort(), f.geometry.coordinates));
      const li = document.createElement("li");
      li.className = "map-place-item" + (id === selectedId ? " is-selected" : "");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", id === selectedId ? "true" : "false");
      li.dataset.id = id;
      li.innerHTML = `
        <div class="map-place-row">
          <div class="map-place-main">
            <div class="map-place-name">${escapeHtml(p.name)}</div>
            <div class="map-place-meta">${escapeHtml(dist)} · ${escapeHtml(p.kind || "")}</div>
            <div class="map-place-address">${escapeHtml(p.address || "")}</div>
          </div>
          <div class="map-place-actions">
            <button type="button" class="map-dir-btn" data-dir-id="${escapeAttr(id)}">Directions</button>
          </div>
        </div>
      `;
      li.addEventListener("click", (e) => {
        if (e.target.closest(".map-dir-btn")) return;
        selectAndFlyTo(id);
      });
      listEl.appendChild(li);
    }

    for (const btn of $$(".map-dir-btn", listEl)) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-dir-id");
        if (id) fetchDirections(id);
      });
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function selectAndFlyTo(id) {
    const f = foodCollection.features.find((x) => x.properties.id === id);
    if (!f) return;
    setSelectedFeature(id);
    map.flyTo({ center: f.geometry.coordinates, zoom: Math.max(map.getZoom(), 13), essential: true });
  }

  function clearRoute() {
    if (map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getSource("route")) map.removeSource("route");
    if (routeSummaryEl) routeSummaryEl.textContent = "";
    if (routeStepsEl) routeStepsEl.innerHTML = "";
    if (routeClearBtn) routeClearBtn.hidden = true;
  }

  async function fetchDirections(destId) {
    const dest = foodCollection.features.find((x) => x.properties.id === destId);
    if (!dest) return;

    const origin = userLngLat || refLngLat || KNOX_CENTER;
    const o = origin;
    const d = dest.geometry.coordinates;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${o[0]},${o[1]};${d[0]},${d[1]}` +
      `?geometries=geojson&steps=true&overview=full&access_token=${encodeURIComponent(token)}`;

    setStatus("Loading directions…");
    clearRoute();
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes || !data.routes[0]) {
        setStatus("Could not find a driving route. Try moving closer or another location.");
        return;
      }
      const route = data.routes[0];
      const geom = route.geometry;
      map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: geom } });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#d87125", "line-width": 5, "line-opacity": 0.85 },
      });

      const bounds = new mapboxgl.LngLatBounds();
      for (const c of geom.coordinates) bounds.extend(c);
      map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 600 });

      if (routeSummaryEl) {
        routeSummaryEl.textContent = `${formatDistance(route.distance)} · ${formatDuration(route.duration)} driving`;
      }
      if (routeStepsEl && route.legs && route.legs[0] && route.legs[0].steps) {
        const steps = route.legs[0].steps.slice(0, 12);
        routeStepsEl.innerHTML = steps
          .map((s) => `<li>${escapeHtml(s.maneuver && s.maneuver.instruction ? s.maneuver.instruction : "")}</li>`)
          .join("");
      }
      if (routeClearBtn) routeClearBtn.hidden = false;
      setSelectedFeature(destId);
      setStatus("");
    } catch {
      setStatus("Directions request failed. Check your connection and token.");
    }
  }

  async function geocodeSearch(query) {
    const q = query.trim();
    if (!q) return;
    const bboxStr = `${KNOX_BBOX.west},${KNOX_BBOX.south},${KNOX_BBOX.east},${KNOX_BBOX.north}`;
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${encodeURIComponent(token)}&bbox=${bboxStr}&limit=1&proximity=${KNOX_CENTER.join(
        ",",
      )}&country=US`;

    setStatus("Searching…");
    try {
      const res = await fetch(url);
      const data = await res.json();
      const feat = data.features && data.features[0];
      if (!feat) {
        setStatus("No results in the Knoxville area. Try a street address or neighborhood.");
        return;
      }
      const [lng, lat] = feat.center;
      if (!inKnoxBBox(lng, lat)) {
        setStatus("That result is outside the Knoxville focus area.");
        return;
      }
      refLngLat = [lng, lat];
      map.flyTo({ center: [lng, lat], zoom: 13, essential: true });
      renderList();
      setStatus("");
    } catch {
      setStatus("Search failed. Check your connection and token.");
    }
  }

  map.on("load", async () => {
    try {
      const res = await fetch(FOOD_DATA_URL);
      foodCollection = await res.json();
    } catch {
      setStatus("Could not load food location data.");
      return;
    }

    map.addSource("food-places", {
      type: "geojson",
      data: foodCollection,
      promoteId: "id",
    });

    map.addLayer({
      id: "food-circles",
      type: "circle",
      source: "food-places",
      paint: {
        "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 11, 7],
        "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], "#d87125", "#0f0f41"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    map.addSource("user-location", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "user-location-circle",
      type: "circle",
      source: "user-location",
      paint: {
        "circle-radius": 8,
        "circle-color": "#2b8c5b",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    map.on("click", "food-circles", (e) => {
      const f = e.features && e.features[0];
      if (!f || !f.properties || !f.properties.id) return;
      selectAndFlyTo(f.properties.id);
    });

    map.on("mouseenter", "food-circles", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "food-circles", () => {
      map.getCanvas().style.cursor = "";
    });

    refLngLat = KNOX_CENTER;
    renderList();

    setStatus(
      "Locations shown are a curated Knoxville-area sample. Always confirm hours and eligibility before visiting.",
    );
  });

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      geocodeSearch(searchInput.value);
    });
  }

  if (locateBtn) {
    locateBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        setStatus("This browser does not support location.");
        return;
      }
      if (!map.getSource("user-location")) {
        setStatus("Map is still loading…");
        return;
      }
      setStatus("Locating you…");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;
          if (!inKnoxBBox(lng, lat)) {
            setStatus(
              "Your location is outside the Knoxville focus area; the map stays centered on Knoxville. You can still get directions from the default point.",
            );
            userLngLat = null;
            map.getSource("user-location").setData({ type: "FeatureCollection", features: [] });
            refLngLat = KNOX_CENTER;
            renderList();
            return;
          }
          userLngLat = [lng, lat];
          refLngLat = [lng, lat];
          map.getSource("user-location").setData({
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} }],
          });
          map.flyTo({ center: [lng, lat], zoom: 12, essential: true });
          renderList();
          setStatus("");
        },
        () => {
          setStatus("Location permission denied. Search for an address or use the default map center.");
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
  }

  if (routeClearBtn) {
    routeClearBtn.addEventListener("click", () => {
      clearRoute();
    });
  }
})();
