class CoreGallery {

  gallery = null;

  constructor(sectionId, view) {
    this.sectionId = sectionId;
    this.slider = null;
    this.sliderElement = document.querySelector(`#slider-${sectionId}`);
    this.sectionElement = document.querySelector(
      `#section-gallery-${sectionId}`
    );
    this.tagMain = this.sectionElement.querySelector(
      ".core-gallery__nav__selected-tag"
    );
    this.savedHeight = null; // Guardará la altura de grid-2x2
    this.currentView = view; // Vista predeterminada
    this.isMobile = window.matchMedia("(max-width: 1024px)").matches;
    this.initSlider(); // Inicializa el slider con la configuración predeterminada
    this.initTabs(); // Inicializa los tabs
    this.initSwitcher(); // Inicializa el switcher de vistas
    this.initResponsiveSelect();
  }

  // Función para obtener la configuración del slider en función de la vista seleccionada
  getSliderConfig(view) {
    let config = {
      selector: ".core-gallery__content__item",
      mode: "free",
      renderMode: "precision",
    };

    // Modificar la configuración dependiendo de la vista seleccionada
    if (view === "grid-2x2") {
      config.slides = {
        perView: 2, // 2 elementos visibles
        spacing: 16, // Espaciado entre elementos
      };
      config.selector = ".core-gallery__content__item";
      config.breakpoints = {
        "(max-width: 576px)": {
          slides: {
            perView: 2,
            spacing: 8,
          },
        },
      };
    } else if (view === "grid-1x1") {
      config.slides = {
        perView: "auto", // 1 elemento visible
        spacing: 16, // Sin espaciado
      };

      if (this.isMobile) {
        config.selector = ".core-gallery__content__item";
      } else {
        config.selector = ".core-gallery__content__item__image";
      }
      config.breakpoints = {
        "(max-width: 768px)": {
          slides: {
            perView: 0.5,
            spacing: 8,
          },
        },
      };
    } else if (view === "grid-2x1") {
      config.slides = {
        perView: 0.5, // 4 elementos visibles
        spacing: 16, // Espaciado entre elementos
      };
      config.selector = ".core-gallery__content__item";
    }

    return config;
  }

  // Inicializa el slider
  initSlider() {
    // Obtener la configuración del slider según la vista actual
    const sliderConfig = this.getSliderConfig(this.currentView);
    // Inicializar el slider de KeenSlider
    this.slider = new KeenSlider(this.sliderElement, sliderConfig);
    this.ligthbox();
    // Capturar la altura de grid-2x2 con un timeout
    if (!this.savedHeight && this.currentView === "grid-2x2") {
      setTimeout(() => {
        this.savedHeight = this.sliderElement.offsetHeight;
      }, 2000); // Ajusta el tiempo según lo necesario
    }else{
      this.updateImageUrls(this.currentView)
    }
  }

  // Inicializa los tabs
  initTabs() {
    const tabs = this.sectionElement.querySelectorAll(
      `.core-gallery__nav__tags-item`
    );
    tabs.forEach((tab) => {
      tab.addEventListener("click", (event) => {
        event.preventDefault();
        this.handleTabClick(tab);
      });
    });
  }

  // Inicializa los switchers
  initSwitcher() {
    const switchers = this.sectionElement.querySelectorAll(`.view-option`);
    switchers.forEach((switcher) => {
      switcher.addEventListener("click", () =>
        this.handleSwitcherClick(switcher)
      );
    });
  }

  // Listado de tags en responsive
  initResponsiveSelect() {
    if (!this.isMobile) return;

    const tagsList = this.sectionElement.querySelector(".core-gallery__nav__tags");
    const arrow = this.tagMain.querySelector(".core-gallery__nav__selected-tag__arrow");

    // Toggle del dropdown
    this.tagMain.addEventListener("click", () => {
      const isOpen = tagsList.classList.contains("core-gallery__nav__tags--open");

      tagsList.classList.toggle("core-gallery__nav__tags--open", !isOpen);
      arrow.classList.toggle("arrow-rotate", !isOpen);
    });

    // Al seleccionar un tab
    tagsList.querySelectorAll(".core-gallery__nav__tags-item").forEach(item => {
      item.addEventListener("click", () => {
        // Cambiar texto
        const label = item.getAttribute("data-label");
        this.tagMain.querySelector(".core-gallery__nav__selected-tag__text").textContent = label;

        // Cerrar dropdown
        tagsList.classList.remove("core-gallery__nav__tags--open");
        arrow.classList.remove("arrow-rotate");
      });
    });

    // Cerrar si hacen click fuera
    document.addEventListener("click", (e) => {
      if (!this.sectionElement.contains(e.target)) {
        tagsList.classList.remove("core-gallery__nav__tags--open");
        arrow.classList.remove("arrow-rotate");
      }
    });
  }

  // Método para mostrar el modal
  showModal() {
    this.modalOverlay.classList.remove("hidden");
  }

  // Método para ocultar el modal
  hideModal() {
    this.modalOverlay.classList.add("hidden");
  }

  // Ligthbox al hacer clic en la imagen
  ligthbox() {
    if (this.gallery) {
      this.gallery.destroy();
    }

    const options = {
      plugins: [lgZoom, lgThumbnail],
      selector: '.core-gallery__content__item__image',
      showCloseIcon: true,
      loop: false,
      mobileSettings: {
        showCloseIcon: true
      }
    }

    this.gallery = lightGallery(this.sectionElement, options);
  }
  // Lógica al hacer clic en un tab
  handleTabClick(tab) {
    const value = tab.getAttribute("data-value");
    const id = tab.getAttribute("data-id");
    const label = tab.getAttribute("data-label");
    // Actualiza la clase activa
    document
      .querySelectorAll(".core-gallery__nav__tags-item")
      .forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    if (this.isMobile) {
      this.tagMain.querySelector(
        ".core-gallery__nav__selected-tag__text"
      ).innerHTML = label;
    };

    // Realiza la llamada Ajax para actualizar el contenido
    this.loadTabContent(value);
  }

  // Lógica al hacer clic en un switcher
  handleSwitcherClick(option) {
    const value = option.getAttribute("data-view");

    // Actualiza la clase activa
    this.sectionElement
      .querySelectorAll(`.view-option`)
      .forEach((item) => item.classList.remove("active"));
    option.classList.add("active");

    // Cambiar la vista actual
    this.currentView = value;

    // Actualizar las clases de los ítems en el slider
    const items = this.sliderElement.querySelectorAll(
      ".core-gallery__content__item"
    );
    items.forEach((item) => {
      item.classList.remove("grid-2x2", "grid-2x1", "grid-1x1");
      item.classList.add(value);
    });

    // Actualizar las URLs de las imágenes en función de la vista seleccionada
    this.updateImageUrls(value);

    // Destruir el slider actual
    if (this.slider) {
      this.slider.destroy();
    }

    // Fix para safari
    const contentContainer = document.querySelector(
      `#slider-${this.sectionId}`
    );
    const slides = contentContainer.querySelectorAll(
      ".core-gallery__content__item"
    );
    contentContainer.innerHTML = "";
    contentContainer.append(...slides);

    // Reinicializar el slider con la nueva configuración
    this.initSlider();
  }

  updateImageUrls(view) {
    const images = this.sliderElement.querySelectorAll("img");
    images.forEach((img) => {
      let src = img.getAttribute("src");

      if (view === "grid-2x2") {
        // Reemplazar w y h por 950
        src = src.replace(/w=\d+&h=\d+/, "w=500&h=500");
        src = src.replace(/w=auto&h=\d+/, "w=500&h=500");
        img.style.height = "inherit";
      } else if (view === "grid-1x1") {
        // Reemplazar w y h por auto
        src = src.replace(/w=\d+&h=\d+/, "w=auto&h=950");
        let newHeight = this.savedHeight ? this.savedHeight + "px" : '45.5vw';
        img.style.height = newHeight;
      } else if (view === "grid-2x1") {
        // Reemplazar w y h por otra configuración (ejemplo: 1200x1200)
        src = src.replace(/w=\d+&h=\d+/, "w=950&h=950");
        src = src.replace(/w=auto&h=\d+/, "w=950&h=950");
        img.style.height = "inherit";
      }

      // Actualizar el atributo src de la imagen
      img.setAttribute("src", src);
    });
  }

  // Realiza la llamada Ajax para actualizar el contenido de la galería
  loadTabContent(value) {
    const ajaxUrl = document
      .querySelector(
        `#section-gallery-${this.sectionId} .core-gallery__nav__tags`
      )
      .getAttribute("data-ajax-url");

    const spinnerOverlay = this.sectionElement.querySelector(".core-gallery__spinner-overlay");
    if (spinnerOverlay) spinnerOverlay.style.display = "flex";

    fetch(
      `${ajaxUrl}&id=${this.sectionId}&tab=${value}&class=${this.currentView}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const contentContainer = document.querySelector(
            `#slider-${this.sectionId}`
          );

          const responseHtml = document.createElement("div");
          responseHtml.innerHTML = data.data.gallery;
          const slides = responseHtml.querySelectorAll(
            ".core-gallery__content__item"
          );

          contentContainer.innerHTML = "";
          contentContainer.append(...slides);

          // Actualizar las URLs de las imágenes en función de la vista seleccionada
          this.updateImageUrls(this.currentView);

          // Destruir el slider actual
          if (this.slider) {
            this.slider.destroy();
          }

          // Reinicializar el slider con la nueva configuración
          this.initSlider();
        } else {
          console.error("Error: ", data.data.message);
        }
        if (spinnerOverlay) spinnerOverlay.style.display = "none";
      })
      .catch((error) => {
        console.error("Error fetching tab content:", error);
        if (spinnerOverlay) spinnerOverlay.style.display = "none";
      });
  }
}
