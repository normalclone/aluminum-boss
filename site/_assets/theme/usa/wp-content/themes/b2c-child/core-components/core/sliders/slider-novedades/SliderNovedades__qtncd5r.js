class SliderNovedades {

  // Propiedades
  id;
  sliderSelector;
  navigationSelector;
  slider;
  sliderOptions;
  sliderObserver;
  numItems;
  numItemsMobile;
  pageCountSelector;
  progressBarSelector;
  hasLightshow;
  lighshow;

  /**
   * 
   * @param {{id, sliderSelector, navigationSelector, pageCountSelector, progressBarSelector, numItems, numItemsTablet, numItemsMobile, hasLightshow, spacing, spacingTablet, spacingMobile}} options Objeto de configuración del slider
   */
  constructor(options = {
    id,
    sliderSelector,
    navigationSelector: null,
    pageCountSelector: null,
    progressBarSelector: null,
    numItems: 3,
    numItemsTablet: 1.1,
    numItemsMobile: 1.1,
    hasLightshow: false,
    spacing: 16,
    spacingTablet: 16,
    spacingMobile: 8
  }) {

    this.id = options.id;
    this.sliderSelector = options.sliderSelector;
    this.navigationSelector = options.navigationSelector;
    this.pageCountSelector = options.pageCountSelector;
    this.progressBarSelector = options.progressBarSelector;
    this.numItems = options.numItems;
    this.numItemsTablet = options.numItemsTablet;
    this.numItemsMobile = options.numItemsMobile;
    this.hasLightshow = options.hasLightshow ?? false;
    this.spacing = options.spacing ?? 16;
    this.spacingTablet = options.spacingTablet ?? 16;
    this.spacingMobile = options.spacingMobile ?? 8;

    this.lightshow;

    this.sliderOptions = {
      rubberband: false,
      vertical: false,
      selector: ".core-slider-novedades__slide",
      mode: "snap",
      renderMode: "precision",
      loop: false,
      slides: {
        perView: this.numItems,
        spacing: this.spacing,
      },
      breakpoints: {
        "(max-width: 1024px)": {
          loop: false,
          slides: {
            perView: this.numItemsTablet,
            spacing: this.spacingTablet,
          },
        },
        "(max-width: 600px)": {
          loop: false,
          slides: {
            perView: this.numItemsMobile,
            spacing: this.spacingMobile,
          },
        },
      },
    }

    this.initializeSlider();

    if (this.hasLightshow) {
      this.initializeLightshow();
    }

    this.sliderObserver = new MutationObserver((mutationsList, observer) => {
      this.refreshSlider(mutationsList, observer);
    });
    const sliderElement = document.querySelector(this.sliderSelector);
    this.sliderObserver.observe(sliderElement, {
      childList: true, subtree: true, characterData: false
    });
  }

  initializeSlider() {
    try {
      const sliderElement = document.querySelector(this.sliderSelector);
      if (!sliderElement) {
        console.error("Elemento del slider no encontrado:", this.sliderSelector);
        return;
      }
      
      this.slider = new KeenSlider(sliderElement, this.sliderOptions, [(slider) => {

        this.configureNavigation(slider);
        this.updateUI(slider);

        slider.on('created', () => {
          this.updateUI(slider);
        });

        slider.on('slideChanged', () => {
          this.updateUI(slider);
        });

        slider.on('optionsChanged', () => {
          this.updateUI(slider);
        });
      }]);

      requestAnimationFrame(() => {
        this.updateUI(this.slider);
      });

      setTimeout(() => {
        this.updateUI(this.slider);
      }, 120);
    } catch (error) {
      console.error("Error inicializando slider:", error);
    }
  }

  initializeLightshow() {
    const options = {
      plugins: [lgZoom, lgThumbnail],
      selector: `.core-slider__slide`,
      showCloseIcon: true,
      loop: false,
      mobileSettings: {
        showCloseIcon: true
      }
    };
    if (this.hasLightshow) {
      const sliderElement = document.querySelector(this.sliderSelector);
      this.lighshow = lightGallery(sliderElement, options);
    }
  }

  refreshSlider(mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        this.slider.update(this.sliderOptions, 0);
        if (this.hasLightshow) {
          this.initializeLightshow();
        }
      }
    }
  }

  configureNavigation(slider) {
    if (this.navigationSelector === null) {
      return;
    }

    const navigationContainer = document.querySelector(this.navigationSelector);
    if (!navigationContainer) {
      return;
    }

    const navigationLeft = navigationContainer.querySelector('.arrow-link__left') || navigationContainer.querySelector('#prev-btn');
    const navigationRight = navigationContainer.querySelector('.arrow-link__right') || navigationContainer.querySelector('#next-btn');

    if (navigationLeft) {
      navigationLeft.addEventListener('click', () => {
        this.moveToAdjacentPage(slider, -1);
      });
    }

    if (navigationRight) {
      navigationRight.addEventListener('click', () => {
        this.moveToAdjacentPage(slider, 1);
      })
    }
  }

  getItemsPerPage(slider) {
    const perView = Number.parseFloat(slider?.options?.slides?.perView ?? 1);

    if (!Number.isFinite(perView) || perView <= 0) {
      return 1;
    }

    return Math.max(1, Math.round(perView));
  }

  getStepInfo(slider) {
    if (!slider?.track?.details) {
      return { current: 1, total: 1, pageStarts: [0] };
    }

    const details = slider.track.details;
    const itemsPerPage = this.getItemsPerPage(slider);
    const totalSlides = slider.slides?.length ?? details.slides?.length ?? 0;
    const maxIdx = Math.max(Math.floor(details.maxIdx ?? 0), 0);
    const estimatedTotalPages = Math.max(Math.ceil(totalSlides / itemsPerPage), 1);
    const pageStarts = Array.from({ length: estimatedTotalPages }, (_, index) => {
      return Math.min(index * itemsPerPage, maxIdx);
    }).filter((start, index, starts) => index === 0 || start !== starts[index - 1]);
    const currentIndex = Math.max(Math.round(details.rel ?? 0), 0);

    let currentPageIndex = 0;

    pageStarts.forEach((start, index) => {
      if (currentIndex >= start) {
        currentPageIndex = index;
      }
    });

    const total = pageStarts.length || 1;
    const current = Math.min(currentPageIndex + 1, total);

    return { current, total, pageStarts };
  }

  moveToAdjacentPage(slider, direction) {
    const { current, total, pageStarts } = this.getStepInfo(slider);
    const targetPageIndex = Math.min(Math.max((current - 1) + direction, 0), total - 1);
    const targetIndex = pageStarts[targetPageIndex] ?? 0;

    slider.moveToIdx(targetIndex);
  }

  getControlElements() {
    const navigationContainer = this.navigationSelector
      ? document.querySelector(this.navigationSelector)
      : null;

    const pageCount = this.pageCountSelector
      ? document.querySelector(this.pageCountSelector)
      : null;

    const pageCountContainer = pageCount?.parentElement || null;

    return {
      navigationContainer,
      pageCount,
      pageCountContainer,
    };
  }

  toggleControlsVisibility(slider) {
    const { total } = this.getStepInfo(slider);
    const { navigationContainer, pageCountContainer } = this.getControlElements();
    const shouldShow = total > 1;

    if (navigationContainer) {
      navigationContainer.style.display = shouldShow ? '' : 'none';
    }

    if (pageCountContainer) {
      pageCountContainer.style.display = shouldShow ? '' : 'none';
    }
  }

  updateArrows(slider) {
    if (this.navigationSelector === null) {
      return;
    }

    const navigationContainer = document.querySelector(this.navigationSelector);
    if (!navigationContainer) {
      return;
    }

    const navigationLeft = navigationContainer.querySelector('.arrow-link__left') || navigationContainer.querySelector('#prev-btn');
    const navigationRight = navigationContainer.querySelector('.arrow-link__right') || navigationContainer.querySelector('#next-btn');

    if (!navigationLeft || !navigationRight) {
      return;
    }

    const { current, total } = this.getStepInfo(slider);

    if (current === 1) {
      navigationLeft.style.opacity = 0.3;
      navigationLeft.classList.add("disabled");
    } else {
      navigationLeft.style.opacity = 1;
      navigationLeft.classList.remove("disabled");
    }

    if (current >= total) {
      navigationRight.style.opacity = 0.3;
      navigationRight.classList.add("disabled");
    } else {
      navigationRight.style.opacity = 1;
      navigationRight.classList.remove("disabled");
    }
  }

  updateProgress(slider) {
    const progressBar = this.progressBarSelector
      ? document.querySelector(this.progressBarSelector)
      : null;

    if (!progressBar || !slider?.track?.details) {
      return;
    }

    const { current, total } = this.getStepInfo(slider);
    const progress = (current / total) * 100;

    progressBar.style.width = `${progress}%`;
  }

  updatePageCount(slider) {
    const pageCount = this.pageCountSelector
      ? document.querySelector(this.pageCountSelector)
      : null;

    if (!pageCount || !slider?.track?.details) {
      return;
    }

    const { current, total } = this.getStepInfo(slider);

    pageCount.textContent = `${String(current).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
  }

  updateUI(slider) {
    this.toggleControlsVisibility(slider);
    this.updateArrows(slider);
    this.updateProgress(slider);
    this.updatePageCount(slider);
  }
}