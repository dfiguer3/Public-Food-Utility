(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  // Bump this string any time you replace coupon PNGs to force reloads.
  const ASSET_VERSION = "2026-04-27-2212";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(d) {
    try {
      return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return String(d || "");
    }
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function couponImageSrc(path) {
    if (!path) return "";
    try {
      const url = new URL(path, document.baseURI);
      // Avoid stale cached PNGs during iterative design updates.
      if (url.pathname.toLowerCase().includes("/assets/") && url.pathname.toLowerCase().endsWith(".png")) {
        url.searchParams.set("v", ASSET_VERSION);
      }
      return url.href;
    } catch {
      return String(path).replace(/ /g, "%20");
    }
  }

  const MAIL = [
    {
      id: "c-publix-bogo",
      type: "coupon",
      category: "Grocery",
      store: "Publix",
      offer:
        "Buy One, Get One (microwavable meals). Look for packages with orange stickers. Scan barcode or give coupon code at the register to redeem.",
      valueText: "BOGO",
      expires: "2026-05-20",
      code: "PLX-F5014-6261",
      image: "./assets/Group 52.png",
      tags: ["nutritional", "financial"],
    },
    {
      id: "c-love-kitchen",
      type: "coupon",
      category: "Community",
      store: "Love Kitchen",
      offer:
        "Weekly supply packages: meal prep, clothing, and hygiene. Limited — show up early. Please sign in upon arrival.",
      valueText: "Weekly Supplies",
      expires: "2026-05-20",
      code: "LKN-F5014-5261",
      image: "./assets/Group 55.png",
      tags: ["nutritional", "housing", "financial"],
    },
    {
      id: "c-whole-foods",
      type: "coupon",
      category: "Grocery",
      store: "Whole Foods",
      offer: "$5.50 off all produce purchases (see terms on coupon).",
      valueText: "$5.50 Off",
      expires: "2026-05-20",
      code: "WLF-F5014-5261",
      image: "./assets/Group 53.png",
      tags: ["nutritional", "financial"],
    },
    {
      id: "c-brenz-pizza",
      type: "coupon",
      category: "Restaurant",
      store: "Brenz Pizza Co.",
      offer: "Free personal pies from 12pm till 6pm. Dependent on Brenz location (check before placing order).",
      valueText: "Free Meal",
      expires: "2026-05-20",
      code: "BPC-F5014-5261",
      image: "./assets/Group 56.png",
      tags: ["nutritional", "financial"],
    },
    {
      id: "c-kroger-points",
      type: "coupon",
      category: "Grocery",
      store: "Kroger",
      offer:
        "5× points with a purchase of fruits, veggies, whole grains, protein, and healthy fats. Show coupon at register to redeem.",
      valueText: "×5 Points",
      expires: "2026-05-20",
      code: "KRG-F5014-5261",
      image: "./assets/Group 54.png",
      tags: ["nutritional", "financial"],
    },
    {
      id: "l-nutritionist-followup",
      type: "letter",
      from: "Your Nutritionist Office",
      subject: "Follow‑up: meal plan & next appointment",
      date: "2026-04-27",
      body: [
        "Hi Dani,",
        "Thanks again for meeting with us. Based on your goals, here are two simple steps to focus on this week:",
        "1) Build a plate with half vegetables or fruit when possible.",
        "2) Add one protein option you enjoy (beans, eggs, chicken, tofu).",
        "Next appointment: Thursday, May 7 at 3:30 PM (in‑person).",
        "Bring: a quick list of your go‑to meals and any foods you want to avoid.",
        "— Nutrition Team",
      ],
      tags: ["nutritional"],
    },
    {
      id: "l-snap-notice",
      type: "letter",
      from: "SNAP Benefits Office",
      subject: "Reminder: renewal & approved items",
      date: "2026-04-23",
      body: [
        "This is a friendly reminder that your SNAP eligibility renewal is coming up soon.",
        "Renewal window: May 1 – May 20",
        "Common approved items include: fruits, vegetables, bread, dairy, meat, and seeds/plants that produce food.",
        "Not approved: hot prepared foods (in most cases), alcohol, tobacco, vitamins/supplements, and non‑food household items.",
        "If you have questions, contact your caseworker or visit your state benefits portal.",
      ],
      tags: ["financial"],
    },
  ];

  function couponCard(item) {
    const src = couponImageSrc(item.image);
    const aria = `${item.store} coupon — ${item.valueText}`;
    return `
      <button
        class="mail-card mail-card--coupon mail-card--coupon--ticket"
        type="button"
        data-mail-id="${escapeAttr(item.id)}"
        role="listitem"
        aria-label="${escapeAttr(aria)}"
      >
        <img
          class="coupon-ticket-img"
          src="${escapeAttr(src)}"
          alt=""
          width="320"
          height="180"
          loading="lazy"
          decoding="async"
        />
      </button>
    `;
  }

  function letterCard(item) {
    const d = formatDate(item.date);
    const preview = Array.isArray(item.body) ? item.body.slice(0, 2).join(" ") : "";
    return `
      <button class="mail-card mail-card--letter mail-item" type="button" data-mail-id="${escapeHtml(
        item.id,
      )}" role="listitem" aria-label="Letter from ${escapeHtml(item.from)}">
        <div class="letter-card-top">
          <div class="letter-card-sender">
            <div class="letter-card-logo" aria-hidden="true"></div>
            <div>
              <div class="letter-card-from">${escapeHtml(item.from)}</div>
              <div class="letter-card-date">${escapeHtml(d)}</div>
            </div>
          </div>
          <div class="letter-card-stamp" aria-hidden="true">POST</div>
        </div>
        <div class="letter-card-subject">${escapeHtml(item.subject)}</div>
        <div class="letter-card-preview">${escapeHtml(preview)}</div>
      </button>
    `;
  }

  function getMailForFilters(applied) {
    if (!applied.size) return MAIL;
    return MAIL.filter((m) => {
      const tags = Array.isArray(m.tags) ? m.tags : [];
      return tags.some((t) => applied.has(t));
    });
  }

  function renderList(root, applied) {
    const items = getMailForFilters(applied);
    root.innerHTML = items.map((m) => (m.type === "coupon" ? couponCard(m) : letterCard(m))).join("");
  }

  function main() {
    const list = $("#mailbox-list");
    if (!list) return;

    const walletDialog = $('dialog[data-modal-root="coupon-wallet"]');
    const letterDialog = $('dialog[data-modal-root="letter-view"]');
    const filterDialog = $('dialog[data-modal-root="mailbox-filter"]');

    const filterBtn = $("#mailbox-filter-btn");
    const filterApply = $("#mailbox-filter-apply");
    const filterReset = $("#mailbox-filter-reset");
    const filterPills = Array.from(document.querySelectorAll("[data-filter]"));

    const walletStore = $("#wallet-store");
    const walletOffer = $("#wallet-offer");
    const walletValue = $("#wallet-value");
    const walletExp = $("#wallet-exp");
    const walletCodeText = $("#wallet-code-text");
    const walletAction = $("[data-wallet-action]");
    const walletTicketImg = $("#wallet-ticket-img");

    const letterFrom = $("#letter-from");
    const letterSubject = $("#letter-subject");
    const letterMeta = $("#letter-meta");
    const letterBody = $("#letter-body");

    const appliedFilters = new Set();
    let pendingFilters = new Set();

    function syncPillsFromPending() {
      for (const pill of filterPills) {
        const key = pill.getAttribute("data-filter");
        pill.classList.toggle("is-selected", pendingFilters.has(key));
      }
    }

    function refreshAppliedUI() {
      renderList(list, appliedFilters);
      if (filterBtn) filterBtn.classList.toggle("is-active", appliedFilters.size > 0);
    }

    function openFilterPanel() {
      pendingFilters = new Set(appliedFilters);
      syncPillsFromPending();
      openDialog(filterDialog);
    }

    if (filterBtn) {
      filterBtn.addEventListener("click", (e) => {
        e.preventDefault?.();
        openFilterPanel();
      });
    }

    for (const pill of filterPills) {
      pill.addEventListener("click", () => {
        const key = pill.getAttribute("data-filter");
        if (!key) return;
        if (pendingFilters.has(key)) pendingFilters.delete(key);
        else pendingFilters.add(key);
        syncPillsFromPending();
      });
    }

    if (filterReset) {
      filterReset.addEventListener("click", () => {
        pendingFilters = new Set();
        syncPillsFromPending();
      });
    }

    if (filterApply) {
      filterApply.addEventListener("click", () => {
        appliedFilters.clear();
        for (const k of pendingFilters) appliedFilters.add(k);
        refreshAppliedUI();
        closeDialog(filterDialog);
      });
    }

    if (filterDialog) {
      filterDialog.addEventListener("close", () => {
        // If user dismisses, don't change applied filters.
        pendingFilters = new Set(appliedFilters);
        syncPillsFromPending();
      });
    }

    refreshAppliedUI();

    list.addEventListener("click", (e) => {
      const card = e.target?.closest?.("[data-mail-id]");
      if (!card) return;
      const id = card.getAttribute("data-mail-id");
      const item = MAIL.find((x) => x.id === id);
      if (!item) return;

      if (item.type === "coupon") {
        if (walletTicketImg) {
          walletTicketImg.src = couponImageSrc(item.image);
          walletTicketImg.alt = `${item.store} coupon`;
          walletTicketImg.width = 333;
          walletTicketImg.height = 209;
          walletTicketImg.loading = "eager";
          walletTicketImg.decoding = "async";
        }
        if (walletStore) walletStore.textContent = item.store;
        if (walletOffer) walletOffer.textContent = item.offer;
        if (walletValue) walletValue.textContent = item.valueText;
        if (walletExp) walletExp.textContent = `Expires ${formatDate(item.expires)}`;
        if (walletCodeText) walletCodeText.textContent = item.code;
        if (walletAction) walletAction.textContent = "Scan at Register";
        openDialog(walletDialog);
        return;
      }

      if (letterFrom) letterFrom.textContent = item.from;
      if (letterSubject) letterSubject.textContent = item.subject;
      if (letterMeta) letterMeta.textContent = formatDate(item.date);
      if (letterBody) {
        const paras = Array.isArray(item.body) ? item.body : [String(item.body || "")];
        letterBody.innerHTML = paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      }
      openDialog(letterDialog);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

