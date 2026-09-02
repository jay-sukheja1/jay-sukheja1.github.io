/* ─────────────────────────────────────────────────────────────────────────
   skills-grid.js
   Interactive logic for the Skills Page Accordion Showcase:
   - Accordion panel toggle & expansion logic (.accordion-panel)
   - Desktop: hover (mouseenter) or click activates panel
   - Mobile / Touch: click/tap toggles panel (disables hover triggers)
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  function initAccordion() {
    const container = document.querySelector(".skills-accordion-container");
    if (!container) return;

    const panels = container.querySelectorAll(".accordion-panel");
    if (!panels.length) return;

    // Helper: Detect if device supports true hover and has mouse pointer
    function canHover() {
      return (
        window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
        window.innerWidth > 768
      );
    }

    panels.forEach((panel) => {
      const header = panel.querySelector(".accordion-header") || panel;

      // Handle Click/Tap on Header or Panel
      header.addEventListener("click", (e) => {
        // Prevent click if user clicked a link or interactive control inside
        if (
          e.target.closest("a, button") &&
          !e.target.closest(".panel-arrow")
        ) {
          return;
        }

        const isCurrentlyActive = panel.classList.contains("active");

        if (canHover()) {
          // Desktop: activate clicked panel
          panels.forEach((p) => p.classList.remove("active"));
          panel.classList.add("active");
        } else {
          // Mobile: toggle state cleanly
          if (isCurrentlyActive) {
            panel.classList.remove("active");
          } else {
            panels.forEach((p) => p.classList.remove("active"));
            panel.classList.add("active");
          }
        }
      });

      // Handle Hover (Desktop Only)
      panel.addEventListener("mouseenter", () => {
        if (canHover()) {
          panels.forEach((p) => p.classList.remove("active"));
          panel.classList.add("active");
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccordion);
  } else {
    initAccordion();
  }
})();
