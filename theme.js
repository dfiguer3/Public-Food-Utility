(() => {
  "use strict";

  const THEMES = ["./assets/ebt-card-1.png", "./assets/ebt-card-2.png", "./assets/ebt-card-3.png"];
  const KEY = "puf_snap_card_theme";

  function getThemeUrl() {
    const raw = localStorage.getItem(KEY);
    const idx = Number.parseInt(raw || "", 10);
    if (Number.isFinite(idx) && idx >= 0 && idx < THEMES.length) return THEMES[idx];
    return THEMES[0];
  }

  function apply() {
    const url = getThemeUrl();
    // Used by CSS for the home SNAP card background.
    document.documentElement.style.setProperty("--puf-ebt-card", `url("${url}")`);

    // Used by SNAP page top preview (if present).
    const top = document.getElementById("snap-ebt-card-top");
    if (top && top.tagName === "IMG") top.setAttribute("src", url);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();

  window.addEventListener("storage", (e) => {
    if (e.key === KEY) apply();
  });
})();

