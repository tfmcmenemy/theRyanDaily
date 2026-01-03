// Reserved for tiny enhancements later (animations, form UX, etc.)
(function () {
  if (location.hash === "#ask") {
    const el = document.getElementById("ask");
    if (el && el.tagName === "DETAILS") el.open = true;
  }
})();

(function () {
  function smoothScrollToDetailsBottom(detailsEl) {
    // Let layout settle for a frame or two
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rect = detailsEl.getBoundingClientRect();
        const target = window.scrollY + rect.bottom + 12; // a little extra padding

        // Don't overscroll beyond the document
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const y = Math.min(target, max);

        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });
  }

  // Attach behavior to any collapsible details
  document.querySelectorAll("details.collapse").forEach((d) => {
    d.addEventListener("toggle", () => {
      if (d.open) {
        smoothScrollToDetailsBottom(d);
      }
    });
  });

  // If user arrives via #ask, open and scroll
  if (location.hash === "#ask") {
    const ask = document.getElementById("ask");
    if (ask && ask.tagName === "DETAILS") {
      ask.open = true;
      smoothScrollToDetailsBottom(ask);
    }
  }
})();
