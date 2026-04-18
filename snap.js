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

    // Balance: somewhere between 5% and 70% of monthly benefit.
    const balance = Math.round(monthlyBenefit * randFloat(0.05, 0.7) * 100) / 100;

    return { household, monthlyBenefit, nextDepositDays, weeklyTarget, balance };
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

    const themes = ["./assets/ebt-card-1.png", "./assets/ebt-card-2.png", "./assets/ebt-card-3.png"];
    const key = "puf_snap_card_theme";
    const confirmBtn = $("#snap-confirm-card");
    let idx = 0;
    const saved = Number.parseInt(localStorage.getItem(key) || "", 10);
    if (Number.isFinite(saved) && saved >= 0 && saved < themes.length) idx = saved;

    function applyPreview() {
      img.src = themes[idx];
    }
    applyPreview();

    for (const btn of $$("[data-card-theme]")) {
      btn.addEventListener("click", () => {
        const dir = btn.getAttribute("data-card-theme");
        idx = dir === "prev" ? (idx + themes.length - 1) % themes.length : (idx + 1) % themes.length;
        applyPreview();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        localStorage.setItem(key, String(idx));
        // Update the top card immediately.
        const top = $("#snap-ebt-card-top");
        if (top && top.tagName === "IMG") top.setAttribute("src", themes[idx]);
        // Let the shared theme script update CSS var too.
        document.documentElement.style.setProperty("--puf-ebt-card", `url("${themes[idx]}")`);
        confirmBtn.textContent = "Saved";
        confirmBtn.disabled = true;
        setTimeout(() => {
          confirmBtn.textContent = "Confirm";
          confirmBtn.disabled = false;
        }, 1200);
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
    setText("balance", formatUSD(m.balance));

    renderRows($(".snap-purchases"), generatePurchases(), "purchase");
    renderRows($(".snap-bills"), generateBills(), "bill");
    initCardCustomizer();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

