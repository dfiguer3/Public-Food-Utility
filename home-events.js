(function () {
  "use strict";

  const KNOX_BBOX = { west: -84.2, south: 35.75, east: -83.55, north: 36.15 };
  const KNOX_CENTER = [-83.9207, 35.9606];
  const PAGE_SIZE = 4;

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
    distM: haversineMeters(KNOX_CENTER, [x.lng, x.lat]), // default; recomputed once we know user location
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

  async function getUserCenter() {
    if (!("geolocation" in navigator)) return KNOX_CENTER;

    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lng = pos?.coords?.longitude;
          const lat = pos?.coords?.latitude;
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) return resolve(KNOX_CENTER);
          resolve([lng, lat]);
        },
        () => resolve(KNOX_CENTER),
        { enableHighAccuracy: false, timeout: 3500, maximumAge: 120000 },
      );
    });
  }

  async function main() {
    const root = $("#home-events");
    if (!root) return;

    const moreWrap = $(".home-events-more");
    const moreBtn = $("#home-events-more-btn");

    const userCenter = await getUserCenter();
    const all = MOCK_EVENTS.filter((x) => inKnoxBBox(x.lng, x.lat))
      .map((x) => ({ ...x, distM: haversineMeters(userCenter, [x.lng, x.lat]) }))
      .sort((a, b) => a.distM - b.distM);

    let visible = PAGE_SIZE;

    function update() {
      render(root, all.slice(0, visible));
      const hasMore = visible < all.length;
      if (moreWrap) moreWrap.hidden = !hasMore;
      if (moreBtn) moreBtn.disabled = !hasMore;
    }

    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        visible = Math.min(all.length, visible + PAGE_SIZE);
        update();
      });
    }

    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

