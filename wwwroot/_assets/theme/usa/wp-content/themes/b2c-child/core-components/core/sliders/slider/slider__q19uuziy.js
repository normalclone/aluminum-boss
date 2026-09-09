class SliderHorizontal {

  // Propiedades
  id;
  sliderSelector;
  navigationSelector;
  dotsSelector;
  slider;
  sliderOptions;
  sliderObserver;
  numItems;
  numItemsMobile;
  hasLightshow;
  lighshow;
  hasModal;
  modal;
  modalSlider;
  modalThumbnailsSlider;

  /**
   * 
   * @param {{id, sliderSelector, navigationSelector, dotsSelector, numItems, numItemsTablet, numItemsMobile, hasLightshow, hasModal, spacing, spacingTablet, spacingMobile, loop}} options Objeto de configuración del slider
   */
  constructor(options = {
    id,
    sliderSelector,
    navigationSelector: null,
    dotsSelector: null,
    numItems: 3,
    numItemsTablet: 1.1,
    numItemsMobile: 1.1,
    hasLightshow: false,
    hasModal: false,
    spacing: 16,
    spacingTablet: 16,
    spacingMobile: 8,
    loop: false,
    ajaxUrl: null
  }) {

    this.id = options.id;
    this.sliderSelector = options.sliderSelector;
    this.navigationSelector = options.navigationSelector;
    this.dotsSelector = options.dotsSelector;
    this.numItems = options.numItems;
    this.numItemsTablet = options.numItemsTablet;
    this.numItemsMobile = options.numItemsMobile;
    this.hasLightshow = options.hasLightshow ?? false;
    this.hasModal = options.hasModal ?? false;
    this.spacing = options.spacing ?? 16;
    this.spacingTablet = options.spacingTablet ?? 16;
    this.spacingMobile = options.spacingMobile ?? 8;
    this.loop = options.loop ?? false;

    this.lightshow;
    this.modal = null;
    this.ajaxUrl = options.ajaxUrl;

    this.sliderOptions = {
      rubberband: false,
      vertical: false,
      selector: ".core-slider__slide",
      mode: "snap",
      renderMode: "precision",
      loop: this.loop,
      slides: {
        perView: this.numItems,
        spacing: this.spacing,
      },
      breakpoints: {
        "(max-width: 1024px)": {
          slides: {
            perView: this.numItemsTablet,
            spacing: this.spacingTablet,
          },
        },
        "(max-width: 600px)": {
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

    if (this.hasModal) {
      this.initializeModal();
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
    this.slider = new KeenSlider(this.sliderSelector, this.sliderOptions, [(slider) => {
      this.configureNavigation(slider);
      // this.createDots(slider);

      slider.on('created', () => {
        this.updateArrows(slider);
        this.createDots(slider);
      });

      slider.on('slideChanged', () => {
        this.updateArrows(slider);
        this.updateDots(slider);
      });

      slider.on('optionsChanged', () => {
        this.updateArrows(slider);
        this.createDots(slider);
        this.updateDots(slider);
      });
    }]);
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

  initializeModal() {
    const modalElement = document.querySelector(`#modal-${this.id}`);
    if (!modalElement) return;

    this.modal = {
      element: modalElement,
      overlay: modalElement.querySelector('.core-slider-modal__overlay'),
      closeButton: modalElement.querySelector('.core-slider-modal__close'),
      title: modalElement.querySelector('.core-slider-modal__title'),
      image: modalElement.querySelector('.core-slider-modal__image'),
      additionalInfo: modalElement.querySelector('.core-slider-modal__additional-info')
    };

    // Configurar eventos del modal
    this.modal.closeButton.addEventListener('click', () => this.closeModal());
    this.modal.overlay.addEventListener('click', () => this.closeModal());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    // Configurar eventos de los slides
    const slides = document.querySelectorAll(`${this.sliderSelector} .core-slider__slide`);
    slides.forEach((slide, index) => {
      slide.addEventListener('click', (e) => {
        // Si el slide tiene URL, no abrimos el modal
        if (slide.tagName.toLowerCase() === 'a' && slide.href) {
          return;
        }
        e.preventDefault();
        this.openModal(index);
      });

    });
  }

  openModal(slideIndex) {
    if (!this.modal) return;

    const slide = this.slider.slides[slideIndex];
    const slideElement = slide;
    const slideId = slideElement.dataset.id;

    // Mostrar loader
    const loader = document.querySelector('.section-loader');
    if (loader) {
      loader.classList.remove('d-none');
    }

    // Hacer la llamada fetch para obtener la información del modal
    const url = new URL(this.ajaxUrl);
    url.searchParams.append('id', slideId);
    url.searchParams.append('nonce', sliderModalNonce);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la respuesta del servidor');
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          const modalInfo = data.data;

          // Renderizar título
          this.modal.title.textContent = modalInfo.title || '';

          // Renderizar slider de imágenes
          const sliderContainer = this.modal.element.querySelector(
            `#modal-slider-${this.id}`
          );
          const thumbnailsContainer = this.modal.element.querySelector(
            `#modal-thumbnails-${this.id}`
          );

          this.navigationSelector = `#slider-nav-${this.id}`;
          this.dotsSelector = `#modal-slider-dots-${this.id}`;

          if (Array.isArray(modalInfo.images) && modalInfo.images.length > 0) {
            let sliderHtml = '';
            let thumbnailsHtml = '';

            modalInfo.images.forEach((image, index) => {
              sliderHtml += `
                <div class="core-slider__slide keen-slider__slide">
                  <img src="${image}" alt="${modalInfo.title}" class="core-slider__slide__image">
                </div>
              `;
              thumbnailsHtml += `
                <div class="core-slider__slide keen-slider__slide thumbnail-slide">
                  <img src="${image}" alt="${modalInfo.title}" class="core-slider__slide__thumbnail">
                </div>
              `;
            });

            sliderContainer.innerHTML = sliderHtml;
            thumbnailsContainer.innerHTML = thumbnailsHtml;

            // Función para manejar las miniaturas
            const ThumbnailPlugin = (main) => {
              return (slider) => {
                function removeActive() {
                  slider.slides.forEach((slide) => {
                    slide.classList.remove("active");
                  });
                }

                function addActive(idx) {
                  slider.slides[idx].classList.add("active");
                }

                function addClickEvents() {
                  slider.slides.forEach((slide, idx) => {
                    slide.addEventListener("click", () => {
                      main.moveToIdx(idx);
                    });
                  });
                }

                slider.on("created", () => {
                  addActive(slider.track.details.rel);
                  addClickEvents();
                  main.on("animationStarted", (main) => {
                    removeActive();
                    const next = main.animator.targetIdx || 0;
                    addActive(main.track.absToRel(next));
                    slider.moveToIdx(Math.min(slider.track.details.maxIdx, next));
                  });
                });
              };
            };

            // Inicializar el slider principal
            const modalSlider = new KeenSlider(
              sliderContainer,
              {
                loop: false,
                rubberband: false,
                vertical: false,
                selector: ".core-slider__slide",
                mode: "snap",
                renderMode: "precision",
                slides: {
                  perView: 1,
                  spacing: 0,
                },
              },
              [
                (slider) => {
                  // Configurar navegación específica para el slider del modal
                  const modalNavigationSelector = `#modal-slider-nav-${this.id}`;
                  const navigationContainer = document.querySelector(modalNavigationSelector);
                  const modalDotsSelector = `#modal-slider-dots-${this.id}`;
                  const dotsContainer = document.querySelector(modalDotsSelector);


                  if (navigationContainer) {
                    const navigationLeft = navigationContainer.querySelector('.arrow-link__left');
                    const navigationRight = navigationContainer.querySelector('.arrow-link__right');

                    if (navigationLeft) {
                      navigationLeft.addEventListener('click', () => {
                        slider.prev();
                      });
                    }

                    if (navigationRight) {
                      navigationRight.addEventListener('click', () => {
                        slider.next();
                      });
                    }

                    // Actualizar estado de las flechas
                    const updateModalArrows = () => {
                      if (slider.track.details.abs === slider.track.details.minIdx) {
                        navigationLeft.style.opacity = 0.3;
                      } else {
                        navigationLeft.style.opacity = 1;
                      }

                      if (slider.track.details.abs === slider.track.details.maxIdx) {
                        navigationRight.style.opacity = 0.3;
                      } else {
                        navigationRight.style.opacity = 1;
                      }
                    };

                    // Función para crear y actualizar los dots
                    const createDots = (slider) => {
                      if (!dotsContainer) return;

                      dotsContainer.innerHTML = '';

                      const dots = document.createElement('div');
                      dots.classList.add('core-slider__dots');

                      let numberDots = Math.ceil(slider.slides.length / slider.options.slides.perView);
                      for (let i = 0; i < numberDots; i++) {
                        const dot = document.createElement('div');
                        dot.classList.add('core-slider__dots__dot');
                        dot.addEventListener('click', () => slider.moveToIdx(i));
                        dots.appendChild(dot);
                      }

                      dotsContainer.appendChild(dots);
                      updateDots(slider);
                    };

                    // Función para actualizar el estado de los dots
                    const updateDots = (slider) => {
                      if (!dotsContainer) return;

                      const dots = dotsContainer.querySelector('.core-slider__dots');
                      if (!dots) return;

                      const slide = slider.track.details.rel;

                      Array.from(dots.children).forEach(function (dot, idx) {
                        idx === slide
                          ? dot.classList.add("active")
                          : dot.classList.remove("active")
                      });
                    };

                    slider.on("created", () => {
                      updateModalArrows();
                      createDots(slider);
                    });

                    slider.on("slideChanged", () => {
                      updateModalArrows();
                      updateDots(slider);
                    });

                    slider.on("optionsChanged", () => {
                      updateModalArrows();
                      createDots(slider);
                    });
                  }
                },
              ]
            );

            // Inicializar el slider de miniaturas
            const thumbnailsSlider = new KeenSlider(
              thumbnailsContainer,
              {
                initial: 0,
                slides: {
                  perView: 4,
                  spacing: 10,
                },
              },
              [ThumbnailPlugin(modalSlider)]
            );

            // Forzar actualización inicial
            setTimeout(() => {
              modalSlider.update();
              thumbnailsSlider.update();
            }, 100);

            // Guardar referencia a los sliders para limpiarlos al cerrar
            this.modalSlider = modalSlider;
            //this.modalThumbnailsSlider = thumbnailsSlider;
          }

          // Renderizar explicaciones y lista
          let additionalHtml = '';
          if (Array.isArray(modalInfo.explanations)) {
            additionalHtml += '<div class="core-slider-modal__explanations">';
            modalInfo.explanations.forEach(exp => {
              additionalHtml += `<div class="core-slider-modal__explanation"><h4>${exp.title}</h4><p>${exp.text}</p></div>`;
            });
            additionalHtml += '</div>';
          }
          if (Array.isArray(modalInfo.list)) {
            additionalHtml += '<ul class="core-slider-modal__list">';
            modalInfo.list.forEach(item => {
              additionalHtml += `<li><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> ${item}</li>`;
            });
            additionalHtml += '</ul>';
          }
          this.modal.additionalInfo.innerHTML = additionalHtml;

          // Mostrar modal
          this.modal.element.hidden = false;

          // Solo anular el scroll en desktop
          if (window.innerWidth >= 768) {
            document.body.style.overflow = 'hidden';
          }

          // Ocultar loader
          if (loader) {
            loader.classList.add('d-none');
          }
        } else {
          console.error('Error al obtener la información del modal:', data.data);
          // Ocultar loader en caso de error
          if (loader) {
            loader.classList.add('d-none');
          }
        }
      })
      .catch(error => {
        console.error('Error en la llamada fetch:', error);
        // Ocultar loader en caso de error
        if (loader) {
          loader.classList.add('d-none');
        }
      });
  }

  closeModal() {
    if (!this.modal) return;

    // Destruir los sliders si existen
    if (this.modalSlider) {
      this.modalSlider.destroy();
      this.modalSlider = null;
    }
    if (this.modalThumbnailsSlider) {
      this.modalThumbnailsSlider.destroy();
      this.modalThumbnailsSlider = null;
    }

    this.modal.element.hidden = true;
    document.body.style.overflow = "";
    // Solo restaurar el scroll en desktop
    /*if (window.innerWidth >= 768) {
      document.body.style.overflow = '';
    }*/
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

    const navigationLeft = navigationContainer.querySelector('.arrow-link__left');
    const navigationRight = navigationContainer.querySelector('.arrow-link__right');

    if (navigationLeft) {
      navigationLeft.addEventListener('click', (evt) => {
        slider.prev();
      });
    }

    if (navigationRight) {
      navigationRight.addEventListener('click', () => {
        slider.next();
      })
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

    const navigationLeft = navigationContainer.querySelector('.arrow-link__left');
    const navigationRight = navigationContainer.querySelector('.arrow-link__right');


    if (slider.track.details.abs === slider.track.details.minIdx) {
      navigationLeft.style.opacity = 0.3;
    } else {
      navigationLeft.style.opacity = 1;
    }

    if (slider.track.details.abs === slider.track.details.maxIdx) {
      navigationRight.style.opacity = 0.3;
    } else {
      navigationRight.style.opacity = 1;
    }
  }

  createDots(slider) {
    const sliderDotsContainer = document.querySelector(this.dotsSelector);
    if (!sliderDotsContainer) {
      return;
    }

    sliderDotsContainer.innerHTML = '';

    const dots = document.createElement('div');
    dots.classList.add('core-slider__dots');


    let numberDots = Math.ceil(slider.slides.length / slider.options.slides.perView);
    for (let i = 0; i < numberDots; i++) {
      const dot = document.createElement('div');
      dot.classList.add('core-slider__dots__dot');
      dot.addEventListener('click', () => slider.moveToIdx(i));
      dots.appendChild(dot);
    }
    /*    slider.track.details.slides.forEach((item, index) => {
          const dot = document.createElement('div');
          dot.classList.add('core-slider__dots__dot');
          dot.addEventListener('click', () => slider.moveToIdx(index));
          dots.appendChild(dot);
        });*/

    sliderDotsContainer.appendChild(dots);
  }

  updateDots(slider) {
    const sliderDotsContainer = document.querySelector(this.dotsSelector);
    if (!sliderDotsContainer) {
      return;
    }

    const dots = sliderDotsContainer.querySelector('.core-slider__dots');

    const slide = slider.track.details.rel;

    Array.from(dots.children).forEach(function (dot, idx) {
      idx === slide
        ? dot.classList.add("active")
        : dot.classList.remove("active")
    })
  }
}