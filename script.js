const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function openModal(id) {
  const dialog = $(`dialog[data-modal-root="${CSS.escape(id)}"]`);
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeModal(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function bindModals() {
  document.addEventListener("click", (e) => {
    const openBtn = e.target?.closest?.("[data-modal]");
    if (openBtn) {
      const id = openBtn.getAttribute("data-modal");
      if (id) openModal(id);
      return;
    }

    const dialog = e.target?.closest?.("dialog[data-modal-root]");
    if (!dialog) return;

    // Click outside sheet closes (works because <form method="dialog"> is full-size)
    if (e.target?.classList?.contains("modal-backdrop")) {
      closeModal(dialog);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openDialog = $$("dialog[open]").at(-1);
    if (openDialog) closeModal(openDialog);
  });
}

function bindFavorites() {
  document.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-action='toggle-fav']");
    if (!btn) return;
    e.preventDefault();
    btn.classList.toggle("is-on");
  });
}

function main() {
  bindModals();
  bindFavorites();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
else main();
