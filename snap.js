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

    // Swipe/drag on the large preview image (touch + desktop drag).
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swiping = false;
    const SWIPE_MIN_PX = 34;
    let activePointerId = null;
    let lastDx = 0;

    // Prevent native browser "drag image" behavior from stealing the gesture.
    img.setAttribute("draggable", "false");
    img.addEventListener("dragstart", (e) => e.preventDefault());

    img.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.buttons !== 1) return;
      e.preventDefault();
      swiping = true;
      activePointerId = e.pointerId;
      swipeStartX = e.clientX;
      swipeStartY = e.clientY;
      lastDx = 0;
      try {
        img.setPointerCapture(activePointerId);
      } catch {
        // ignore
      }
    });
    img.addEventListener("pointermove", (e) => {
      if (!swiping || activePointerId !== e.pointerId) return;
      e.preventDefault();
      const dx = e.clientX - swipeStartX;
      const dy = e.clientY - swipeStartY;
      // Only drag when gesture is primarily horizontal.
      if (Math.abs(dx) < Math.abs(dy) && Math.abs(dy) > 8) return;
      lastDx = dx;
      const clamped = Math.max(-140, Math.min(140, dx));
      const rot = (clamped / 140) * 6;
      document.documentElement.style.setProperty("--snap-card-drag-x", `${clamped}px`);
      document.documentElement.style.setProperty("--snap-card-rot", `${rot}deg`);
    });
    img.addEventListener("pointerup", (e) => {
      if (!swiping || activePointerId !== e.pointerId) return;
      e.preventDefault();
      swiping = false;
      activePointerId = null;
      const dx = e.clientX - swipeStartX;
      const dy = e.clientY - swipeStartY;
      document.documentElement.style.setProperty("--snap-card-drag-x", `0px`);
      document.documentElement.style.setProperty("--snap-card-rot", `0deg`);
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
      // Swipe left → next, swipe right → prev
      step(dx < 0 ? 1 : -1);
    });
    img.addEventListener("pointercancel", () => {
      swiping = false;
      activePointerId = null;
      document.documentElement.style.setProperty("--snap-card-drag-x", `0px`);
      document.documentElement.style.setProperty("--snap-card-rot", `0deg`);
    });

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

