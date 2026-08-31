/* ── tilt-card.js ──
   Vanilla-JS port of unlumen UI's Tilt + ClippedCircle primitives
   (https://ui.unlumen.com/components/tilt-card), driving .tilt-card
   elements. Reproduces:
   - Tilt.tsx:   spring-eased rotateX/rotateY, rotationFactor = 11
   - ClippedCircle.tsx: cursor-following circle, scale 0 → 1 on hover,
                        duration .5s, ease [0.19, 1, 0.22, 1]
*/
(function () {
  const ROTATION_FACTOR = 11; // matches <Tilt rotationFactor={11} /> default in TiltCard
  const SPRING_STIFFNESS = 0.12; // approximates useSpring's default damping feel

  function initTiltCard(card) {
    if (card.dataset.tiltInit) return;
    card.dataset.tiltInit = "true";

    // Build ClippedCircle overlay if not already present
    let circleWrap = card.querySelector(".clipped-circle-wrap");
    if (!circleWrap) {
      circleWrap = document.createElement("div");
      circleWrap.className = "clipped-circle-wrap";
      const circle = document.createElement("div");
      circle.className = "clipped-circle";
      circleWrap.appendChild(circle);
      card.appendChild(circleWrap);
    }
    const circle = circleWrap.querySelector(".clipped-circle");

    let targetX = 0,
      targetY = 0, // normalized -0.5..0.5, mirrors useMotionValue(x/y) in Tilt.tsx
      curX = 0,
      curY = 0;
    let rafId = null;

    function render() {
      if (card.dataset.noTilt === "true" || card.classList.contains("no-tilt")) {
        card.style.transform = "none";
        return;
      }

      curX += (targetX - curX) * SPRING_STIFFNESS;
      curY += (targetY - curY) * SPRING_STIFFNESS;

      // Same mapping as tilt.tsx useTransform calls:
      // rotateX: y [-0.5,0.5] -> [-rotationFactor, rotationFactor]
      // rotateY: x [-0.5,0.5] -> [rotationFactor, -rotationFactor]
      const rotateX = curY * 2 * ROTATION_FACTOR;
      const rotateY = curX * -2 * ROTATION_FACTOR;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(
        2,
      )}deg) rotateY(${rotateY.toFixed(2)}deg)`;

      const settled =
        Math.abs(targetX - curX) < 0.0005 && Math.abs(targetY - curY) < 0.0005;
      if (!settled) {
        rafId = requestAnimationFrame(render);
      } else {
        rafId = null;
      }
    }

    function requestRender() {
      if (!rafId) rafId = requestAnimationFrame(render);
    }

    function handleMove(e) {
      const rect = card.getBoundingClientRect();
      targetX = (e.clientX - rect.left) / rect.width - 0.5;
      targetY = (e.clientY - rect.top) / rect.height - 0.5;
      requestRender();

      // ClippedCircle position, in % of card, same as clipped-circle.tsx
      const cx = ((e.clientX - rect.left) / rect.width) * 100;
      const cy = ((e.clientY - rect.top) / rect.height) * 100;
      circle.style.left = cx + "%";
      circle.style.top = cy + "%";
    }

    function handleEnter(e) {
      handleMove(e);
      circle.style.transform = "translate(-50%, -50%) scale(1)";
    }

    function handleLeave() {
      targetX = 0;
      targetY = 0;
      requestRender();
      circle.style.transform = "translate(-50%, -50%) scale(0)";
    }

    card.addEventListener("mouseenter", handleEnter);
    card.addEventListener("mousemove", handleMove);
    card.addEventListener("mouseleave", handleLeave);
  }

  function init() {
    document.querySelectorAll(".tilt-card").forEach(initTiltCard);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.initTiltCards = init;
})();