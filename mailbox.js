(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

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

  const MAIL = [
    {
      id: "c-restaurant-20",
      type: "coupon",
      category: "Restaurant",
      store: "Smoky Mountain Diner",
      offer: "20% Off Your Next Order",
      valueText: "20% OFF",
      expires: "2026-05-31",
      code: "SMD-20OFF-5261",
      tone: "warm",
    },
    {
      id: "c-restaurant-bogo",
      type: "coupon",
      category: "Restaurant",
      store: "Riverfront Tacos",
      offer: "Buy One Get One Free (Entree)",
      valueText: "BOGO",
      expires: "2026-06-15",
      code: "TACOS-BOGO-1148",
      tone: "cool",
    },
    {
      id: "c-grocery-produce",
      type: "coupon",
      category: "Grocery",
      store: "Knox Fresh Market",
      offer: "$1.50 Off Produce (any 3 lbs+)",
      valueText: "$1.50 OFF",
      expires: "2026-05-20",
      code: "KFM-PRODUCE-150",
      tone: "green",
    },
    {
      id: "c-grocery-points",
      type: "coupon",
      category: "Grocery",
      store: "HealthyCart Grocery",
      offer: "Double Points on Healthy Items",
      valueText: "2× POINTS",
      expires: "2026-06-01",
      code: "HC-2X-HEALTHY-9002",
      tone: "purple",
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
    },
  ];

  function couponCard(item) {
    const exp = formatDate(item.expires);
    return `
      <button class="mail-card mail-card--coupon tone-${escapeHtml(item.tone)}" type="button" data-mail-id="${escapeHtml(
        item.id,
      )}" role="listitem" aria-label="${escapeHtml(item.store)} coupon">
        <div class="coupon-top">
          <div class="coupon-brand">
            <div class="coupon-logo" aria-hidden="true"></div>
            <div class="coupon-store">${escapeHtml(item.store)}</div>
          </div>
          <div class="coupon-scissors" aria-hidden="true">✂</div>
        </div>

        <div class="coupon-value">${escapeHtml(item.valueText)}</div>
        <div class="coupon-offer">${escapeHtml(item.offer)}</div>

        <div class="coupon-foot">
          <div class="coupon-meta">
            <span class="coupon-chip">${escapeHtml(item.category)}</span>
            <span class="coupon-exp">Expires ${escapeHtml(exp)}</span>
          </div>
          <div class="coupon-code">${escapeHtml(item.code)}</div>
        </div>
      </button>
    `;
  }

  function letterCard(item) {
    const d = formatDate(item.date);
    const preview = Array.isArray(item.body) ? item.body.slice(0, 2).join(" ") : "";
    return `
      <button class="mail-card mail-card--letter" type="button" data-mail-id="${escapeHtml(
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

  function renderList(root) {
    root.innerHTML = MAIL.map((m) => (m.type === "coupon" ? couponCard(m) : letterCard(m))).join("");
  }

  function main() {
    const list = $("#mailbox-list");
    if (!list) return;

    const walletDialog = $('dialog[data-modal-root="coupon-wallet"]');
    const letterDialog = $('dialog[data-modal-root="letter-view"]');

    const walletStore = $("#wallet-store");
    const walletOffer = $("#wallet-offer");
    const walletValue = $("#wallet-value");
    const walletExp = $("#wallet-exp");
    const walletCodeText = $("#wallet-code-text");
    const walletAction = $("[data-wallet-action]");

    const letterFrom = $("#letter-from");
    const letterSubject = $("#letter-subject");
    const letterMeta = $("#letter-meta");
    const letterBody = $("#letter-body");

    renderList(list);

    list.addEventListener("click", (e) => {
      const card = e.target?.closest?.("[data-mail-id]");
      if (!card) return;
      const id = card.getAttribute("data-mail-id");
      const item = MAIL.find((x) => x.id === id);
      if (!item) return;

      if (item.type === "coupon") {
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

