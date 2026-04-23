(function () {
  "use strict";

  const STORAGE_KEY = "puf_profile_photo";
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setPhoto(src) {
    for (const img of qa("[data-profile-photo]")) {
      img.src = src;
    }
    const homeAvatar = q(".home-avatar img");
    if (homeAvatar) homeAvatar.src = src;
  }

  function loadSaved() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPhoto(saved);
    } catch {
      // ignore
    }
  }

  function save(src) {
    try {
      localStorage.setItem(STORAGE_KEY, src);
    } catch {
      // ignore
    }
  }

  function bind() {
    const input = q("[data-profile-photo-input]");
    const btn = q("[data-action='edit-profile-photo']");
    if (!input || !btn) return;

    btn.addEventListener("click", () => {
      input.click();
    });

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result || "");
        if (!src) return;
        setPhoto(src);
        save(src);
      };
      reader.readAsDataURL(file);
      input.value = "";
    });
  }

  function main() {
    loadSaved();
    bind();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

