(function () {
  "use strict";

  const KNOX_BBOX = { west: -84.2, south: 35.75, east: -83.55, north: 36.15 };
  const KNOX_CENTER = [-83.9207, 35.9606];

  const $ = (sel, root = document) => root.querySelector(sel);

  function inKnoxBBox(lng, lat) {
    return (
      lng >= KNOX_BBOX.west &&
      lng <= KNOX_BBOX.east &&
      lat >= KNOX_BBOX.south &&
      lat <= KNOX_BBOX.north
    );
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
    if (!Number.isFinite(m)) return "";
    if (m < 1000) return `${Math.round(m / 50) * 50} m`;
    return `${(m / 1609.34).toFixed(1)} mi`;
  }

  const MOCK_EVENTS = [
    {
      key: "mock-1",
      name: "Mobile Pantry Pickup",
      address: "Downtown Knoxville, TN",
      kind: "Food pantry",
      lng: -83.9207,
      lat: 35.9606,
    },
    {
      key: "mock-2",
      name: "Community Meal Night",
      address: "Old City, Knoxville, TN",
      kind: "Free meal",
      lng: -83.9142,
      lat: 35.9684,
    },
    {
      key: "mock-3",
      name: "Nonprofit Food Box Giveaway",
      address: "East Knoxville, TN",
      kind: "Nonprofit",
      lng: -83.8886,
      lat: 35.975,
    },
    {
      key: "mock-4",
      name: "Weekend Pantry Hours",
      address: "Bearden, Knoxville, TN",
      kind: "Food pantry",
      lng: -83.9658,
      lat: 35.9432,
    },
    {
      key: "mock-5",
      name: "Fresh Produce Pop‑Up",
      address: "North Knoxville, TN",
      kind: "Free food",
      lng: -83.9234,
      lat: 35.9842,
    },
    {
      key: "mock-6",
      name: "School Supplies + Food Drive",
      address: "South Knoxville, TN",
      kind: "Community event",
      lng: -83.9382,
      lat: 35.9395,
    },
    {
      key: "mock-7",
      name: "Drive‑Through Pantry",
      address: "West Knoxville, TN",
      kind: "Food bank",
      lng: -84.0222,
      lat: 35.9249,
    },
    {
      key: "mock-8",
      name: "Hot Lunch Distribution",
      address: "University area, Knoxville, TN",
      kind: "Free meal",
      lng: -83.9422,
      lat: 35.9527,
    },
  ].map((x) => ({
    ...x,
    distM: haversineMeters(KNOX_CENTER, [x.lng, x.lat]),
  }));

  function directionsUrl({ lng, lat, name }) {
    return (
      "map.html?destLng=" +
      encodeURIComponent(String(lng)) +
      "&destLat=" +
      encodeURIComponent(String(lat)) +
      "&destName=" +
      encodeURIComponent(String(name || ""))
    );
  }

  function render(container, items) {
    container.innerHTML = items
      .map((x) => {
        const dirHref = directionsUrl(x);
        const hasCoords = Number.isFinite(x.lng) && Number.isFinite(x.lat);
        return `
          <article class="event-card home-card"
            data-lng="${escapeAttr(x.lng)}"
            data-lat="${escapeAttr(x.lat)}"
            data-name="${escapeAttr(x.name)}"
          >
            <div class="event-card__top">
              <div class="event-card__main">
                <div class="event-card__title">${escapeHtml(x.name)}</div>
                <div class="event-card__meta">
                  <span class="event-card__tag">${escapeHtml(x.kind)}</span>
                  <span class="event-card__dot" aria-hidden="true">·</span>
                  <span>${escapeHtml(formatDistance(x.distM))}</span>
                </div>
                <div class="event-card__addr">${escapeHtml(x.address)}</div>
              </div>
              <button class="home-fav event-save-btn" type="button" data-action="toggle-fav" aria-label="Save">
              </button>
            </div>
            <div class="event-card__actions">
              ${
                hasCoords
                  ? `<a class="event-dir-btn" href="${escapeAttr(dirHref)}" aria-label="Directions to ${escapeAttr(
                      x.name,
                    )}">Directions</a>`
                  : `<button class="event-dir-btn" type="button" disabled>No location available</button>`
              }
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function main() {
    const root = $("#home-events");
    if (!root) return;

    const items = MOCK_EVENTS.filter((x) => inKnoxBBox(x.lng, x.lat)).slice().sort((a, b) => a.distM - b.distM);
    render(root, items);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

