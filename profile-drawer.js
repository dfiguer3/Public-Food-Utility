/* global CSS */
(function () {
  "use strict";

  const q = (selector, root = document) => root.querySelector(selector);
  let threeLoadPromise = null;

  function loadThree() {
    if (threeLoadPromise) return threeLoadPromise;
    threeLoadPromise = Promise.all([
      import("https://unpkg.com/three@0.160.0/build/three.module.js"),
      import("https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js"),
    ]).then(([THREE, loaders]) => ({ THREE, GLTFLoader: loaders.GLTFLoader }));
    return threeLoadPromise;
  }

  function normalizeToTarget(THREE, root, targetSize = 2.2) {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const largest = Math.max(size.x, size.y, size.z) || 1;
    const scale = targetSize / largest;
    root.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(root);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    root.position.sub(scaledCenter);
    root.position.y -= scaledBox.min.y;
  }

  function init3DPlate(phone) {
    const plateHost = q(".profile-plate", phone);
    if (!plateHost) return;
    if (plateHost.dataset.plate3dInit === "1") return;
    plateHost.dataset.plate3dInit = "1";

    const canvas = document.createElement("canvas");
    canvas.className = "profile-plate-3d";
    plateHost.insertBefore(canvas, plateHost.firstChild);

    const staticBits = plateHost.querySelectorAll(".profile-plate__rim, .profile-plate__well, .profile-plate__shine");

    loadThree()
      .then(({ THREE, GLTFLoader }) => {
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.shadowMap.enabled = true;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 2, 5);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(5, 10, 7);
        sun.castShadow = true;
        scene.add(sun);

        const loader = new GLTFLoader();
        let plateModel = null;

        function resize() {
          const w = plateHost.clientWidth || 320;
          const h = plateHost.clientHeight || 320;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }

        const ro = new ResizeObserver(() => resize());
        ro.observe(plateHost);
        resize();

        // Note: URL has a space; use encodeURI.
        const src = encodeURI("./assets/models/plate_no words.glb");
        loader.load(
          src,
          (gltf) => {
            plateModel = gltf.scene;
            plateModel.traverse((c) => {
              if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
              }
            });
            normalizeToTarget(THREE, plateModel, 2.5);
            plateModel.rotation.x = -Math.PI / 2;
            scene.add(plateModel);

            // Hide the old CSS plate layers once 3D loads.
            staticBits.forEach((el) => (el.style.display = "none"));
          },
          undefined,
          () => {
            // If the GLB fails to load, keep the CSS plate visible.
            plateHost.dataset.plate3dInit = "0";
          },
        );

        function animate() {
          requestAnimationFrame(animate);
          if (plateModel) {
            plateModel.rotation.z = Math.sin(Date.now() * 0.001) * 0.02;
          }
          renderer.render(scene, camera);
        }
        animate();
      })
      .catch(() => {
        plateHost.dataset.plate3dInit = "0";
      });
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function getFocusable(root) {
    const sel =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(root.querySelectorAll(sel)).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
    );
  }

  function initDrawer(phone) {
    const drawer = q("[data-profile-drawer]", phone);
    const backdrop = q("[data-profile-backdrop]", phone);
    if (!drawer || !backdrop) return;

    const peek = Number(drawer.getAttribute("data-peek") || "56");
    const openRatio = Number(drawer.getAttribute("data-open-ratio") || "0.75");
    const handle = q("[data-profile-handle]", drawer) || drawer;
    const peekBtn = q("[data-profile-peek-btn]", drawer);
    const openers = [
      peekBtn,
      q("[data-profile-open]", phone),
      q(".home-avatar", phone), // home header avatar
    ].filter(Boolean);

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
      drawer.classList.toggle("is-open", open);
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
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
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
      e.preventDefault();
      const dy = e.clientY - startClientY;
      apply(startY + dy);
      lastClientY = e.clientY;
      lastTime = performance.now();
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      handle.releasePointerCapture?.(e.pointerId);

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
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", () => {
      compute();
      apply(isOpen ? 0 : closedY);
    });

    backdrop.addEventListener("click", () => snap(false));
    for (const el of openers) {
      el.addEventListener("click", (e) => {
        // Avatar is an <a>; prevent navigation and open the drawer instead.
        e.preventDefault?.();
        snap(!isOpen);
      });
    }
  }

  function main() {
    document.querySelectorAll(".phone").forEach((phone) => {
      initDrawer(phone);
      init3DPlate(phone);

      // “Game” button: go to splash without signing out.
      phone.querySelectorAll("[data-action='play-splash']").forEach((btn) => {
        if (btn.dataset.pufBound === "1") return;
        btn.dataset.pufBound = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault?.();
          window.location.href = "index.html?play=1";
        });
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

