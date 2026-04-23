const $ = (selector, root = document) => root.querySelector(selector);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getFocusable(root) {
  const sel =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll(sel)).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

function initDrawer(phone) {
  const drawer = $("[data-profile-drawer]", phone);
  const backdrop = $("[data-profile-backdrop]", phone);
  if (!drawer || !backdrop) return;

  const peek = Number(drawer.getAttribute("data-peek") || "56");
  const openRatio = Number(drawer.getAttribute("data-open-ratio") || "0.75");
  const handle = $("[data-profile-handle]", drawer) || drawer;
  const peekBtn = $("[data-profile-peek-btn]", drawer);

  let openHeight = 0;
  let closedY = 0;
  let y = 0;
  let isOpen = false;
  let isDragging = false;
  let startClientY = 0;
  let startY = 0;
  let startTime = 0;
  let lastClientY = 0;
  let lastTime = 0;
  let openerEl = null;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  function compute() {
    const h = phone.clientHeight || 852;
    openHeight = Math.round(h * openRatio);
    drawer.style.height = `${openHeight}px`;
    closedY = -(openHeight - peek);
  }

  function apply(nextY) {
    y = clamp(nextY, closedY, 0);
    drawer.style.setProperty("--profile-drawer-y", `${y}px`);
    const showing = y > closedY + 1;
    backdrop.classList.toggle("is-open", showing);
    drawer.setAttribute("aria-hidden", showing ? "false" : "true");
  }

  function snap(open) {
    isOpen = open;
    drawer.classList.remove("is-dragging");
    apply(open ? 0 : closedY);
    if (open) {
      openerEl = document.activeElement;
      const focusables = getFocusable(drawer);
      (focusables[0] || peekBtn || drawer).focus?.();
    } else {
      const target = peekBtn || openerEl;
      target?.focus?.();
      openerEl = null;
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        snap(false);
      }
      return;
    }

    if (!isOpen || e.key !== "Tab") return;
    const focusables = getFocusable(drawer);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    compute();
    isDragging = true;
    drawer.classList.add("is-dragging");
    startClientY = e.clientY;
    startY = y;
    startTime = performance.now();
    lastClientY = e.clientY;
    lastTime = startTime;
    handle.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const dy = e.clientY - startClientY;
    apply(startY + dy);
    lastClientY = e.clientY;
    lastTime = performance.now();
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    const now = performance.now();
    const dt = Math.max(1, now - lastTime);
    const v = (e.clientY - lastClientY) / dt; // px per ms

    const halfway = closedY / 2;
    const shouldOpen = v > 0.35 || (v > -0.15 && y > halfway);

    if (prefersReduced) {
      drawer.classList.remove("is-dragging");
    }
    snap(shouldOpen);
  }

  // Initial state
  compute();
  apply(closedY);

  // Events
  handle.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", () => {
    compute();
    apply(isOpen ? 0 : closedY);
  });

  backdrop.addEventListener("click", () => snap(false));
  peekBtn?.addEventListener("click", () => snap(!isOpen));
}

function main() {
  document.querySelectorAll(".phone").forEach(initDrawer);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
else main();

