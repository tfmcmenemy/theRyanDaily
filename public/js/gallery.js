document.addEventListener("DOMContentLoaded", () => {
  const images = Array.from(document.querySelectorAll("[data-lightbox]"));
  const lightbox = document.getElementById("lightbox");
  if (!images.length || !lightbox) return;

  const imgEl = lightbox.querySelector(".lightbox-img");
  const titleEl = lightbox.querySelector(".lightbox-title");
  const captionEl = lightbox.querySelector(".lightbox-caption");

  const captionBarEl = lightbox.querySelector(".lightbox-captionbar");
  const counterEl = lightbox.querySelector(".lightbox-counter");

  let currentIndex = 0;
  let previousOverflow = "";
  let touchStartX = 0;

  const data = images.map((img) => ({
    src: img.getAttribute("src"),
    alt: img.getAttribute("alt") || "Image",
    title: img.dataset.title || "",
    caption: img.dataset.caption || "",
  }));

  function render() {
    const item = data[currentIndex];
    imgEl.src = item.src;
    imgEl.alt = item.alt;

    if (titleEl) titleEl.textContent = item.title;
    if (captionEl) captionEl.textContent = item.caption;

    if (counterEl) {
      counterEl.textContent = `${currentIndex + 1} / ${data.length}`;
    }

    const hasText =
      (item.title && item.title.trim()) ||
      (item.caption && item.caption.trim());

    if (captionBarEl) {
      captionBarEl.style.display = hasText ? "block" : "none";
    }
  }

  function openLightbox(index) {
    currentIndex = index;
    render();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousOverflow || "";
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % data.length;
    render();
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + data.length) % data.length;
    render();
  }

  // Open on click
  images.forEach((img, index) => {
    img.style.cursor = "pointer";
    img.addEventListener("click", () => openLightbox(index));
  });

  // Click actions (overlay, close, arrows)
  lightbox.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    const action = btn?.getAttribute("data-action");
    if (!action) return;

    if (action === "close") closeLightbox();
    if (action === "prev") showPrev();
    if (action === "next") showNext();
  });

  // Keyboard
  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  });

  // Swipe (on the image)
  imgEl.addEventListener("touchstart", (event) => {
    if (!lightbox.classList.contains("is-open")) return;
    touchStartX = event.changedTouches[0].clientX;
  });

  imgEl.addEventListener("touchend", (event) => {
    if (!lightbox.classList.contains("is-open")) return;
    const touchEndX = event.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;

    if (Math.abs(deltaX) < 50) return;
    if (deltaX < 0) showNext();
    else showPrev();
  });
});
