(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function randInt(min, max) {
    // inclusive
    const r = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    return Math.floor(r * (max - min + 1)) + min;
  }

  function randFloat(min, max) {
    const r = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    return r * (max - min) + min;
  }

  function formatUSD(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function generateSnapMetrics() {
    // Reasonable ranges for a demo UI (not official/authoritative).
    const household = randInt(1, 6);
    const monthlyBenefitBase = randInt(80, 900);
    // Bias upward slightly for larger households.
    const monthlyBenefit = clamp(
      Math.round(monthlyBenefitBase * (0.8 + household * 0.08)),
      80,
      900,
    );

    const nextDepositDays = randInt(1, 30);

    // Weekly target: 18%–30% of monthly benefit, rounded to whole dollars.
    const weeklyTarget = Math.round(monthlyBenefit * randFloat(0.18, 0.3));

    // Balance mockup stays coherent with issued amount (loads new numbers each visit).
    const pctRemaining = randFloat(0.12, 0.92);
    const ebtRemaining = Math.round(monthlyBenefit * pctRemaining * 100) / 100;
    const ebtUsed = Math.round((monthlyBenefit - ebtRemaining) * 100) / 100;

    return { household, monthlyBenefit, nextDepositDays, weeklyTarget, ebtRemaining, ebtUsed };
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function formatShortDate(d) {
    // e.g. Apr 18
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function generatePurchases() {
    const merchants = [
      "Kroger",
      "Food City",
      "Walmart",
      "Aldi",
      "Target",
      "Publix",
      "Three Rivers Market",
      "Ingles",
      "United Grocery Outlet",
      "Local Farmers Market",
    ];
    const categories = ["Groceries", "Produce", "Pantry staples", "Deli", "Household items"];

    const count = randInt(4, 7);
    const now = new Date();
    const items = [];
    for (let i = 0; i < count; i++) {
      const daysAgo = randInt(0, 28);
      const dt = new Date(now);
      dt.setDate(now.getDate() - daysAgo);
      const amount = Math.round(randFloat(6, 86) * 100) / 100;
      items.push({
        merchant: pick(merchants),
        sub: `${pick(categories)} · ${formatShortDate(dt)}`,
        amount,
      });
    }
    // Most recent first (smallest daysAgo already random; just sort by date string isn't safe)
    return items;
  }

  function generateBills() {
    const payees = [
      { name: "KUB Utilities", hint: "Electric / water" },
      { name: "Phone", hint: "Mobile service" },
      { name: "Internet", hint: "Home connection" },
      { name: "Rent", hint: "Housing" },
      { name: "Gas", hint: "Heat / cooking" },
    ];

    const count = randInt(3, 5);
    const now = new Date();
    const items = [];
    for (let i = 0; i < count; i++) {
      const p = pick(payees);
      const dueInDays = randInt(2, 21);
      const due = new Date(now);
      due.setDate(now.getDate() + dueInDays);
      const amount = Math.round(randFloat(18, 220));
      items.push({
        name: p.name,
        sub: `${p.hint} · Due ${formatShortDate(due)}`,
        amount,
      });
    }
    return items;
  }

  function setText(metric, text) {
    for (const el of $$(`[data-snap-metric="${CSS.escape(metric)}"]`)) {
      el.textContent = text;
    }
  }

  function renderRows(container, rows, type) {
    if (!container) return;
    container.innerHTML = "";
    for (const r of rows) {
      const row = document.createElement("div");
      row.className = "snap-row";
      row.setAttribute("role", "listitem");
      if (type === "purchase") {
        row.innerHTML = `
          <div class="snap-row-main">
            <div class="snap-row-title">${escapeHtml(r.merchant)}</div>
            <div class="snap-row-sub">${escapeHtml(r.sub)}</div>
          </div>
          <div class="snap-row-value">${formatUSD(r.amount)}</div>
        `;
      } else {
        row.innerHTML = `
          <div class="snap-row-main">
            <div class="snap-row-title">${escapeHtml(r.name)}</div>
            <div class="snap-row-sub">${escapeHtml(r.sub)} · ${escapeHtml(formatUSD(r.amount))}</div>
          </div>
          <button type="button" class="snap-pay-btn" aria-label="Pay ${escapeAttr(r.name)}">Pay</button>
        `;
      }
      container.appendChild(row);
    }

    for (const btn of $$(".snap-pay-btn", container)) {
      btn.addEventListener("click", () => {
        // Demo action: just change button label briefly.
        const old = btn.textContent;
        btn.textContent = "Queued";
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = old;
          btn.disabled = false;
        }, 1200);
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

  function initCardCustomizer() {
    const img = $("#snap-ebt-card");
    if (!img) return;
    const carousel = img.closest?.(".snap-card-carousel") || img.parentElement;
    if (!carousel) return;
    const prevImg = document.querySelector("[data-snap-ebt-prev]");
    const nextImg = document.querySelector("[data-snap-ebt-next]");

    const themes = ["./assets/ebt-card-1.png", "./assets/ebt-card-2.png", "./assets/ebt-card-3.png"];
    const key = "puf_snap_card_theme";
    const confirmBtn = $("#snap-confirm-card");
    const dialog = confirmBtn?.closest?.("dialog[data-modal-root]") || img.closest?.("dialog[data-modal-root]");
    let idx = 0;
    const saved = Number.parseInt(localStorage.getItem(key) || "", 10);
    if (Number.isFinite(saved) && saved >= 0 && saved < themes.length) idx = saved;

    function applyPreview() {
      img.src = themes[idx];
    }
    function applySides() {
      if (prevImg) prevImg.src = themes[(idx + themes.length - 1) % themes.length];
      if (nextImg) nextImg.src = themes[(idx + 1) % themes.length];
    }

    function applyAll() {
      applyPreview();
      applySides();
    }

    applyAll();

    // Apply saved choice to the main (top) card immediately on page load.
    const top = $("#snap-ebt-card-top");
    if (top && top.tagName === "IMG") top.setAttribute("src", themes[idx]);
    document.documentElement.style.setProperty("--puf-ebt-card", `url("${themes[idx]}")`);

    function step(delta) {
      idx = (idx + themes.length + delta) % themes.length;
      applyAll();
    }

    // Swipe/drag to switch card themes (touch + desktop drag).
    const isCoarsePointer =
      (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);

    let swipeStartX = 0;
    let swipeStartY = 0;
    let swiping = false;
    // Touch devices often register smaller finger movement; keep it forgiving.
    const SWIPE_MIN_PX = isCoarsePointer ? 18 : 34;
    const SWIPE_MIN_PX_TOUCH = isCoarsePointer ? 12 : 20;
    let activePointerId = null;
    let lastDx = 0;
    let ignorePointerDuringTouch = false;

    // Touch fallback (some mobile browsers are inconsistent with pointer events inside <dialog>).
    let touchSwiping = false;
    let touchId = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;

    // Prevent native browser "drag image" behavior from stealing the gesture.
    for (const el of [img, prevImg, nextImg]) {
      if (!el) continue;
      el.setAttribute("draggable", "false");
      el.addEventListener("dragstart", (e) => e.preventDefault());
    }

    carousel.addEventListener("pointerdown", (e) => {
      if (ignorePointerDuringTouch || touchSwiping) return;
      // Some older browsers may not implement `isPrimary`; only filter when it's explicitly false.
      if (e.isPrimary === false) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      swiping = true;
      activePointerId = e.pointerId;
      swipeStartX = e.clientX;
      swipeStartY = e.clientY;
      lastDx = 0;
      try {
        carousel.setPointerCapture(activePointerId);
      } catch {
        // ignore
      }
    });
    carousel.addEventListener("pointermove", (e) => {
      if (ignorePointerDuringTouch || touchSwiping) return;
      if (!swiping || activePointerId !== e.pointerId) return;
      const dx = e.clientX - swipeStartX;
      const dy = e.clientY - swipeStartY;
      // Only drag when gesture is primarily horizontal.
      if (Math.abs(dx) < Math.abs(dy) && Math.abs(dy) > 8) return;
      // Prevent page/modal scroll once we're sure it's a horizontal swipe.
      e.preventDefault();
      lastDx = dx;
      const clamped = Math.max(-140, Math.min(140, dx));
      const rot = (clamped / 140) * 6;
      document.documentElement.style.setProperty("--snap-card-drag-x", `${clamped}px`);
      document.documentElement.style.setProperty("--snap-card-rot", `${rot}deg`);
    });
    carousel.addEventListener("pointerup", (e) => {
      if (ignorePointerDuringTouch || touchSwiping) return;
      if (!swiping || activePointerId !== e.pointerId) return;
      swiping = false;
      activePointerId = null;
      const dx = e.clientX - swipeStartX;
      const dy = e.clientY - swipeStartY;
      document.documentElement.style.setProperty("--snap-card-drag-x", `0px`);
      document.documentElement.style.setProperty("--snap-card-rot", `0deg`);

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < SWIPE_MIN_PX) return;
      // Allow diagonal swipes to still count as "horizontal".
      if (absDy > absDx * 0.95) return;

      // Swipe left → next, swipe right → prev
      step(dx < 0 ? 1 : -1);
    });
    carousel.addEventListener("pointercancel", () => {
      if (ignorePointerDuringTouch || touchSwiping) return;
      swiping = false;
      activePointerId = null;
      document.documentElement.style.setProperty("--snap-card-drag-x", `0px`);
      document.documentElement.style.setProperty("--snap-card-rot", `0deg`);
    });

    function resetTouchSwipe() {
      touchSwiping = false;
      touchId = null;
      touchMoved = false;
      ignorePointerDuringTouch = false;
      document.documentElement.style.setProperty("--snap-card-drag-x", `0px`);
      document.documentElement.style.setProperty("--snap-card-rot", `0deg`);
    }

    carousel.addEventListener(
      "touchstart",
      (e) => {
        // Only single-finger swipe on the carousel.
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        touchSwiping = true;
        ignorePointerDuringTouch = true;
        touchId = t.identifier;
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchMoved = false;
      },
      { passive: false },
    );

    carousel.addEventListener(
      "touchmove",
      (e) => {
        if (!touchSwiping) return;
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        if (touchId !== t.identifier) return;

        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Start preventing page/modal movement only once it's clearly a horizontal swipe.
        if (absDx < 5) return;
        // If it's mostly horizontal (allow some jitter), lock it in as a swipe.
        if (absDy > absDx * 0.85) return;

        // At this point, lock it in as a swipe gesture.
        e.preventDefault();
        touchMoved = true;
        // Keep the drag preview subtle on touch so the dialog doesn't feel like it "moves".
        const clamped = Math.max(-90, Math.min(90, dx));
        const rot = (clamped / 90) * 6;
        document.documentElement.style.setProperty("--snap-card-drag-x", `${clamped}px`);
        document.documentElement.style.setProperty("--snap-card-rot", `${rot}deg`);
      },
      { passive: false },
    );

    carousel.addEventListener(
      "touchend",
      (e) => {
        if (!touchSwiping) return;
        if (!e.changedTouches || e.changedTouches.length < 1) return;
        const t = e.changedTouches[0];
        if (touchId !== t.identifier) return;

        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;

        document.documentElement.style.setProperty("--snap-card-drag-x", `0px`);
        document.documentElement.style.setProperty("--snap-card-rot", `0deg`);

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        // Consider it a swipe if horizontal distance is strong enough.
        const shouldStep = absDx >= SWIPE_MIN_PX_TOUCH && absDy <= absDx * 1.1;
        if (shouldStep) step(dx < 0 ? 1 : -1);
        resetTouchSwipe();
      },
      { passive: false },
    );

    carousel.addEventListener(
      "touchcancel",
      () => {
        if (!touchSwiping) return;
        resetTouchSwipe();
      },
      { passive: false },
    );

    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        localStorage.setItem(key, String(idx));
        // Update the top card immediately.
        const top = $("#snap-ebt-card-top");
        if (top && top.tagName === "IMG") top.setAttribute("src", themes[idx]);
        // Let the shared theme script update CSS var too.
        document.documentElement.style.setProperty("--puf-ebt-card", `url("${themes[idx]}")`);
        // Close the editor automatically after save.
        if (dialog) {
          if (typeof dialog.close === "function") dialog.close();
          else dialog.removeAttribute("open");
        }
      });
    }
  }

  function main() {
    const screen = $("main[data-screen]");
    if (!screen || screen.getAttribute("data-screen") !== "snap") return;

    const m = generateSnapMetrics();
    setText("monthlyBenefit", formatUSD(m.monthlyBenefit));
    setText("household", String(m.household));
    setText("nextDeposit", `${m.nextDepositDays} days`);
    setText("weeklyTarget", formatUSD(m.weeklyTarget));
    setText("ebtRemaining", formatUSD(m.ebtRemaining));
    setText("ebtUsed", formatUSD(m.ebtUsed));

    renderRows($(".snap-purchases"), generatePurchases(), "purchase");
    renderRows($(".snap-bills"), generateBills(), "bill");
    initCardCustomizer();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

