(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

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

  function parseTags(node) {
    const raw = node?.getAttribute?.("data-tags") || "";
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function applyFilters(cards, applied) {
    if (!applied.size) {
      for (const c of cards) c.hidden = false;
      return;
    }
    for (const c of cards) {
      const tags = parseTags(c);
      c.hidden = !tags.some((t) => applied.has(t));
    }
  }

  function main() {
    const filterBtn = $("#support-filter-btn");
    const filterDialog = $('dialog[data-modal-root="support-filter"]');
    const filterApply = $("#support-filter-apply");
    const filterReset = $("#support-filter-reset");
    const filterPills = Array.from(document.querySelectorAll('dialog[data-modal-root="support-filter"] [data-filter]'));

    const cards = Array.from(document.querySelectorAll(".support-card"));
    const appliedFilters = new Set();
    let pendingFilters = new Set();

    function syncPillsFromPending() {
      for (const pill of filterPills) {
        const key = pill.getAttribute("data-filter");
        pill.classList.toggle("is-selected", pendingFilters.has(key));
      }
    }

    function refreshAppliedUI() {
      applyFilters(cards, appliedFilters);
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
        pendingFilters = new Set(appliedFilters);
        syncPillsFromPending();
      });
    }

    refreshAppliedUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

