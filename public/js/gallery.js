document.addEventListener("DOMContentLoaded", () => {
  const images = Array.from(document.querySelectorAll("[data-lightbox]"));
  const lightbox = document.getElementById("lightbox");
  if (!images.length || !lightbox) return;

  const imgEl = lightbox.querySelector(".lightbox-img");
  const titleEl = lightbox.querySelector(".lightbox-title");
  const captionEl = lightbox.querySelector(".lightbox-caption");
  const metaEl = lightbox.querySelector(".lightbox-meta");
  const closeButtons = lightbox.querySelectorAll('[data-action="close"]');
  const prevButton = lightbox.querySelector('[data-action="prev"]');
  const nextButton = lightbox.querySelector('[data-action="next"]');

  const data = images.map((img) => ({
    src: img.getAttribute("src"),
    alt: img.getAttribute("alt") || "Gallery image",
    title: img.dataset.title || "",
    caption: img.dataset.caption || "",
  }));

  let currentIndex = 0;
  let previousOverflow = "";
  let touchStartX = 0;

  function render() {
    const item = data[currentIndex];
    imgEl.src = item.src;
    imgEl.alt = item.alt;
    titleEl.textContent = item.title;
    captionEl.textContent = item.caption;
    metaEl.style.display = item.title || item.caption ? "block" : "none";
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

  images.forEach((img, index) => {
    img.addEventListener("click", () => openLightbox(index));
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", closeLightbox);
  });

  prevButton.addEventListener("click", showPrev);
  nextButton.addEventListener("click", showNext);

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

  lightbox.addEventListener("touchstart", (event) => {
    if (!lightbox.classList.contains("is-open")) return;
    touchStartX = event.changedTouches[0].clientX;
  });

  lightbox.addEventListener("touchend", (event) => {
    if (!lightbox.classList.contains("is-open")) return;
    const touchEndX = event.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    if (Math.abs(deltaX) < 50) return;
    if (deltaX < 0) showNext();
    else showPrev();
  });
});
