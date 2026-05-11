(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const TRANSITION_MS = prefersReducedMotion ? 10 : 500;
  const WHEEL_COOLDOWN = 800;
  const WHEEL_THRESHOLD = 40;
  const SWIPE_THRESHOLD = 50;

  const slides = Array.from(document.querySelectorAll(".carousel__slide"));
  const dots = Array.from(document.querySelectorAll(".bottombar__dot"));
  const infoPanel = document.querySelector(".stage__info");
  const titleEl = document.querySelector(".stage__title");
  const descEl = document.querySelector(".stage__desc");
  const linkEl = document.querySelector(".stage__link");
  const counterCurrentEl = document.querySelector(".stage__counter-current");
  const hint = document.querySelector(".bottombar__hint");
  const aboutDialog = document.getElementById("about-dialog");
  const aboutBtn = document.querySelector(".bottombar__about");

  function isAboutOpen() {
    return Boolean(aboutDialog && aboutDialog.open);
  }

  const total = slides.length;
  let activeIndex = 0;
  let wheelLocked = false;
  let wheelAccum = 0;
  let lastWheelDir = 0;
  let touchStartY = 0;
  let hintDismissed = false;

  function padIndex(i) {
    return String(i + 1).padStart(2, "0");
  }

  function positionSlides() {
    slides.forEach((slide, i) => {
      const offset = i - activeIndex;
      const absOffset = Math.abs(offset);

      slide.removeAttribute("aria-current");

      if (absOffset > 2) {
        slide.style.transform = `translateX(${offset > 0 ? 120 : -120}%) translateZ(-500px) scale(0.5)`;
        slide.style.opacity = "0";
        slide.style.filter = "blur(12px)";
        slide.style.pointerEvents = "none";
        slide.style.zIndex = "0";
        return;
      }

      let tx, tz, s, o, blur, z;

      if (offset === 0) {
        tx = 0; tz = 0; s = 1; o = 1; blur = 0; z = 3;
        slide.setAttribute("aria-current", "true");
      } else if (absOffset === 1) {
        tx = offset * 55; tz = -200; s = 0.78; o = 0.35; blur = 4; z = 2;
      } else {
        tx = offset * 95; tz = -400; s = 0.62; o = 0.12; blur = 8; z = 1;
      }

      slide.style.transform = `translateX(${tx}%) translateZ(${tz}px) scale(${s})`;
      slide.style.opacity = String(o);
      slide.style.filter = `blur(${blur}px)`;
      slide.style.zIndex = String(z);

      // The active slide spans the full viewport (inset: 0) at the highest
      // z-index, so it would intercept clicks in areas where adjacent cards
      // are visually visible. Setting pointer-events: none on the active slide
      // element and restoring it on the card inside lets adjacent slides
      // receive clicks while keeping the card's hover effect functional.
      const card = slide.querySelector(".carousel__card");
      const link = slide.querySelector(".carousel__slide-link");
      if (offset === 0) {
        slide.style.pointerEvents = "none";
        if (link) link.style.pointerEvents = "none";
        if (card) card.style.pointerEvents = "auto";
      } else {
        slide.style.pointerEvents = "auto";
        if (link) link.style.pointerEvents = "none";
        if (card) card.style.pointerEvents = "none";
      }
    });
  }

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === activeIndex);
    });
  }

  function applyStageLinkHref(href) {
    linkEl.href = href;
    if (/^https?:\/\//i.test(href)) {
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
    } else {
      linkEl.removeAttribute("target");
      linkEl.removeAttribute("rel");
    }
  }

  function applyLinkLabel(label, href) {
    const isComingSoon = Boolean(label) && href === "#";
    if (isComingSoon) {
      linkEl.textContent = label;
      linkEl.classList.add("stage__link--coming-soon");
    } else {
      linkEl.innerHTML = `${label || "View Project"} <span aria-hidden="true">&rarr;</span>`;
      linkEl.classList.remove("stage__link--coming-soon");
    }
  }

  function updateInfoPanel() {
    const slide = slides[activeIndex];
    const newTitle = slide.dataset.title;
    const newDesc = slide.dataset.desc;
    const newHref = slide.dataset.href;
    const newLinkLabel = slide.dataset.linkLabel || null;
    const newCounter = padIndex(activeIndex);

    if (prefersReducedMotion) {
      titleEl.textContent = newTitle;
      descEl.textContent = newDesc;
      applyStageLinkHref(newHref);
      applyLinkLabel(newLinkLabel, newHref);
      counterCurrentEl.textContent = newCounter;
      return;
    }

    infoPanel.classList.add("is-transitioning");

    setTimeout(() => {
      titleEl.textContent = newTitle;
      descEl.textContent = newDesc;
      applyStageLinkHref(newHref);
      applyLinkLabel(newLinkLabel, newHref);
      counterCurrentEl.textContent = newCounter;
      infoPanel.classList.remove("is-transitioning");
    }, TRANSITION_MS * 0.45);
  }

  function dismissHint() {
    if (hintDismissed || !hint) return;
    hintDismissed = true;
    hint.classList.add("is-hidden");
  }

  function goTo(index) {
    const clamped = Math.max(0, Math.min(total - 1, index));
    if (clamped === activeIndex) return;
    activeIndex = clamped;
    positionSlides();
    updateDots();
    updateInfoPanel();
    dismissHint();
  }

  function next() { goTo(activeIndex + 1); }
  function prev() { goTo(activeIndex - 1); }

  /* --- Wheel --- */
  document.addEventListener("wheel", (e) => {
    if (isAboutOpen()) return;
    e.preventDefault();
    if (wheelLocked) return;

    const dir = e.deltaY > 0 ? 1 : -1;
    if (dir !== lastWheelDir) { wheelAccum = 0; }
    lastWheelDir = dir;
    wheelAccum += Math.abs(e.deltaY);

    if (wheelAccum >= WHEEL_THRESHOLD) {
      wheelAccum = 0;
      wheelLocked = true;
      if (dir > 0) next(); else prev();
      setTimeout(() => { wheelLocked = false; }, WHEEL_COOLDOWN);
    }
  }, { passive: false });

  /* --- Keyboard --- */
  document.addEventListener("keydown", (e) => {
    if (isAboutOpen()) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  });

  /* --- Touch --- */
  let touchActive = false;

  document.addEventListener("touchstart", (e) => {
    if (isAboutOpen()) return;
    touchStartY = e.touches[0].clientY;
    touchActive = true;
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    if (!touchActive || isAboutOpen()) return;
    const dy = touchStartY - e.touches[0].clientY;
    if (Math.abs(dy) > SWIPE_THRESHOLD) {
      touchActive = false;
      if (dy > 0) next(); else prev();
    }
  }, { passive: true });

  document.addEventListener("touchend", () => {
    touchActive = false;
  }, { passive: true });

  /* --- Nav dots --- */
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const target = parseInt(dot.dataset.goto, 10);
      goTo(target);
    });
  });

  /* --- Slide click: inactive = focus slide; active = let the wrapping <a> navigate --- */
  slides.forEach((slide) => {
    slide.addEventListener("click", (e) => {
      const idx = parseInt(slide.dataset.index, 10);
      if (idx !== activeIndex) {
        // Inactive slide: belt-and-braces — pointer-events:none on the link
        // already prevents the anchor from receiving the click, but if the
        // event bubbled here from a focus/keyboard activation, intercept it.
        e.preventDefault();
        goTo(idx);
      }
    });
  });

  /* --- About dialog --- */
  if (aboutDialog && aboutBtn) {
    aboutBtn.addEventListener("click", () => {
      if (typeof aboutDialog.showModal === "function") {
        aboutDialog.showModal();
      } else {
        aboutDialog.setAttribute("open", "");
      }
    });

    aboutDialog.addEventListener("click", (e) => {
      if (e.target === aboutDialog || e.target.closest("[data-close]")) {
        aboutDialog.close();
      }
    });
  }

  /* --- Init --- */
  positionSlides();
})();
