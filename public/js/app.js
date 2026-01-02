// Reserved for tiny enhancements later (animations, form UX, etc.)
(function () {
  if (location.hash === "#ask") {
    const el = document.getElementById("ask");
    if (el && el.tagName === "DETAILS") el.open = true;
  }
})();
