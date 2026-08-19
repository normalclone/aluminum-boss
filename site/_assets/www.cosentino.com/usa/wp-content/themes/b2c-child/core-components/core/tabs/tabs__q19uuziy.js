document.addEventListener("DOMContentLoaded", function () {
  const tabsContainer = document.querySelector(".core-tabs");
  const tags = document.querySelector(".core-tabs__nav__tags");
  const items = tabsContainer.querySelectorAll(".core-tabs__nav__tags-item");
  const ajaxUrl = tags.getAttribute("data-ajax-url");
  const contentContainer = tabsContainer.querySelector(".core-tabs__content");

  function loadTabContent(value, id) {
    const ajaxUrl = document
      .querySelector(`#section-tabs-${id} .core-tabs__nav__tags`)
      .getAttribute("data-ajax-url");

    fetch(`${ajaxUrl}&id=${id}&tab=${value}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const contentContainer = document.querySelector(
            `#slider-${id}`
          );

          // Crear el HTML del slider usando la función en slider.js
          /* const sliderHtml = sliderHorizontal.createSliderHtml(
            data.data.items,
            id
          ); */

          const responseHtml = document.createElement('div');
          responseHtml.innerHTML = data.data.slider;
          const slides = responseHtml.querySelectorAll('.core-slider__slide');

          contentContainer.innerHTML = '';
          contentContainer.append(...slides);

          // Inicializar el slider después de haber insertado el HTML
          // sliderHorizontal.init(id);
        } else {
          console.error("Error: ", data.data.message);
        }
      })
      .catch((error) => console.error("Error fetching tab content:", error));
  }

  // Cargar la primera pestaña al inicio
  /*loadTabContent(
    items[0].getAttribute("data-value"),
    items[0].getAttribute("data-id")
  );*/

  items.forEach((tab) => {
    tab.addEventListener("click", function () {
      // Remover clase 'active' de todas las pestañas
      items.forEach((t) => t.classList.remove("active"));
      // Añadir clase 'active' a la pestaña actual
      tab.classList.add("active");

      // Cargar el contenido de la pestaña seleccionada
      loadTabContent(
        this.getAttribute("data-value"),
        this.getAttribute("data-id")
      );
    });
  });
});
