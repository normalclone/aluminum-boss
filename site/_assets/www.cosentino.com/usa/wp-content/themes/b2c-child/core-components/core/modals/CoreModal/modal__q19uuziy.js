class CoreModal {
  constructor(sectionId) {
    this.sectionId = sectionId;
    this.modalElement = document.querySelector(`#core-modal-${sectionId}`);
    this.imageElement = this.modalElement.querySelector(
      ".core-modal__content__image"
    );
    this.closeButton = this.modalElement.querySelector(".core-modal__close");
    this.scale = 1;
    this.lastScale = 1;

    this.init();
  }

  init() {
    this.closeButton.addEventListener("click", () => this.closeLightbox());
    this.modalElement.addEventListener("click", (e) => {
      if (e.target === this.modalElement || e.target === this.closeButton) {
        this.closeLightbox();
      }
    });

    document.addEventListener("openLightbox", (event) => {
      this.openLightbox(event.detail);
    });

    // Pinch-to-zoom logic
    this.imageElement.addEventListener("wheel", (e) => this.handleWheelZoom(e));
    this.imageElement.addEventListener("gesturestart", (e) =>
      this.handleGestureStart(e)
    );
    this.imageElement.addEventListener("gesturechange", (e) =>
      this.handleGestureChange(e)
    );
    this.imageElement.addEventListener("gestureend", (e) =>
      this.handleGestureEnd(e)
    );

    // Touch event listeners for mobile
    this.initTouchEvents();
  }

  openLightbox(imageSrc) {
    this.imageElement.src = imageSrc;
    this.modalElement.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  closeLightbox() {
    this.modalElement.classList.remove("active");
    this.imageElement.src = "";
    document.body.classList.remove("no-scroll");
    this.resetZoom();
  }

  handleWheelZoom(event) {
    event.preventDefault();
    const zoomFactor = 0.1;
    if (event.deltaY < 0) {
      this.scale += zoomFactor;
    } else {
      this.scale = Math.max(1, this.scale - zoomFactor);
    }
    this.applyZoom();
  }

  handleGestureStart(event) {
    event.preventDefault();
    this.lastScale = this.scale;
  }

  handleGestureChange(event) {
    event.preventDefault();
    this.scale = this.lastScale * event.scale;
    this.applyZoom();
  }

  handleGestureEnd(event) {
    event.preventDefault();
    this.lastScale = this.scale;
  }

  applyZoom() {
    this.imageElement.style.transform = `scale(${this.scale})`;
  }

  resetZoom() {
    this.scale = 1;
    this.applyZoom();
  }

  initTouchEvents() {
    let initialDistance = null;
    let currentScale = 1;

    const calculateDistance = (touches) => {
      const [touch1, touch2] = touches;
      const dx = touch2.pageX - touch1.pageX;
      const dy = touch2.pageY - touch1.pageY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    this.imageElement.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        initialDistance = calculateDistance(e.touches);
        currentScale = this.scale;
      }
    });

    this.imageElement.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        const newDistance = calculateDistance(e.touches);
        const scaleFactor = newDistance / initialDistance;
        this.scale = currentScale * scaleFactor;
        this.applyZoom();
      }
    });
  }
}
