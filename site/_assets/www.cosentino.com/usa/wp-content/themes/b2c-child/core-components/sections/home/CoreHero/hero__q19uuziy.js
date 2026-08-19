document.addEventListener("DOMContentLoaded", function () {
  const sectionHero = document.querySelector(".section-hero");
  const heroSelector = document.querySelectorAll(
    ".section-hero [data-section]"
  );
  const currentBackground = document.querySelector(".current-background");
  const nextBackground = document.querySelector(".next-background");
  const adminBar = document.querySelector("#wpadminbar");
  const menu = document.querySelector("#masthead.sticky-top");

  let currentIndex = 0;
  let intervalId;
  let userClicked = false;

  // Función para ajustar la altura de la sección hero
  function ajustarAlturaHero() {
    const menuHeight = menu ? menu.offsetHeight : 0;
    const adminBarHeight = adminBar ? adminBar.offsetHeight : 0;
    const totalAltura = menuHeight + adminBarHeight;

    // Restamos el total de la altura del adminBar y menú a 100vh
    sectionHero.style.height = `calc(100vh - ${totalAltura}px)`;
  }

  // Llamar a la función al cargar la página
  ajustarAlturaHero();

  // También ajustar la altura si cambia el tamaño de la ventana
  window.addEventListener("resize", ajustarAlturaHero);

  // Establece la imagen inicial en el background actual
  currentBackground.style.backgroundImage = `url(${
    document.querySelector('[data-content="0"]').dataset.img
  })`;

  // Función para iniciar el cambio automático
  function startAutoChange() {
    const event = new Event("change-slider");
    intervalId = setInterval(() => {
      if (!userClicked) {
        currentIndex = (currentIndex + 1) % heroSelector.length;
        heroSelector[currentIndex].dispatchEvent(event); // Simulamos el clic
      }
    }, 5000); // Cambio automático cada 5 segundos
  }

  // Función para detener el cambio automático
  function resetAutoChange() {
    clearInterval(intervalId); // Detenemos el cambio automático
      userClicked = false; // Reiniciamos el flag después de un tiempo
      startAutoChange(); // Reiniciamos el cambio automático
  }

  heroSelector.forEach((element, index) => {
    element.addEventListener("mouseenter", function () {
      userClicked = true;
      const event = new Event("change-slider");
      this.dispatchEvent(event);
    });

    element.addEventListener("mouseout", function () {
      userClicked = false;
    });

    element.addEventListener("change-slider", function () {
      // Seteamos el Index actual del click
      currentIndex = this.dataset.section % heroSelector.length;

      // Marcar como seleccionado
      document
        .querySelectorAll("[data-section]")
        .forEach((el) => el.classList.remove("active"));
      document
        .querySelectorAll("[data-content]")
        .forEach((el) => el.classList.remove("active"));

      const newImageUrl = document.querySelector(
        `[data-content="${this.dataset.section}"]`
      ).dataset.img;

      // Establece la nueva imagen en la capa siguiente
      nextBackground.style.backgroundImage = `url(${newImageUrl})`;

      // Animar la salida de la imagen actual y la entrada de la nueva
      gsap
        .timeline()
        .set(nextBackground, { opacity: 1 })
        .to(currentBackground, {
          opacity: 0,
          duration: 1,
          ease: "power2.inOut",
          onComplete: function () {
            currentBackground.style.backgroundImage = `url(${newImageUrl})`;
            currentBackground.style.opacity = 1;
            nextBackground.style.zIndex = 1;
            currentBackground.style.zIndex = 2;
          },
        })
        .fromTo(
          nextBackground,
          { opacity: 1 },
          {
            opacity: 1,
            duration: 0.5,
            ease: "power2.inOut",
          }
        );

      this.classList.add("active");
      document
        .querySelector(`[data-content="${this.dataset.section}"]`)
        .classList.add("active");

      // Reiniciar el ciclo de cambio automático al hacer clic
      resetAutoChange();
    });
  });

  // Iniciar el ciclo automático al cargar la página
  startAutoChange();
});