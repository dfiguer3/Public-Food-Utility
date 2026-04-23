(function () {
  "use strict";

  const CLIENT_ID = "998802855742-0p6uipnfa25cev3alajog3rtvotm5jd4.apps.googleusercontent.com";
  const PROFILE_KEY = "puf_google_profile";
  const PHOTO_KEY = "puf_profile_photo";

  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function decodeJwtPayload(jwt) {
    const parts = String(jwt || "").split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json);
  }

  function setText(sel, text) {
    for (const el of qa(sel)) el.textContent = text;
  }

  function setPhoto(src) {
    for (const img of qa("[data-profile-photo]")) img.src = src;
    const header = q(".home-avatar img");
    if (header) header.src = src;
  }

  function saveProfile(p) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {
      // ignore
    }
  }

  function loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function applyProfile(p) {
    if (!p) return;
    if (p.name) setText("[data-profile-name]", p.name);
    if (p.email) setText("[data-profile-email]", p.email);
    if (p.picture) {
      setPhoto(p.picture);
      try {
        localStorage.setItem(PHOTO_KEY, p.picture);
      } catch {
        // ignore
      }
    }
  }

  function clearProfile() {
    setText("[data-profile-name]", "Anonymous");
    setText("[data-profile-email]", "Not signed in");
    // Don't clear location or user-chosen photo unless you want full reset.
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      // ignore
    }
    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      // ignore
    }
  }

  function initGoogle() {
    const g = window.google?.accounts?.id;
    if (!g) return;

    g.initialize({
      client_id: CLIENT_ID,
      callback: (resp) => {
        const payload = decodeJwtPayload(resp.credential);
        if (!payload) return;
        const profile = {
          sub: payload.sub,
          name: payload.name || "",
          email: payload.email || "",
          picture: payload.picture || "",
        };
        saveProfile(profile);
        applyProfile(profile);
      },
    });

    const btn = q("#google-signin-btn");
    if (btn) {
      btn.innerHTML = "";
      g.renderButton(btn, { theme: "outline", size: "large", shape: "pill", width: 260 });
    }

    // Optional: try to auto select if user already used it in this browser.
    g.prompt();
  }

  function bindSignout() {
    const btn = q("[data-action='google-signout']");
    if (!btn) return;
    btn.addEventListener("click", () => clearProfile());
  }

  function main() {
    applyProfile(loadProfile());
    bindSignout();

    // GIS script loads async, so poll a few times.
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (window.google?.accounts?.id) {
        clearInterval(t);
        initGoogle();
      } else if (tries > 40) {
        clearInterval(t);
      }
    }, 100);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

