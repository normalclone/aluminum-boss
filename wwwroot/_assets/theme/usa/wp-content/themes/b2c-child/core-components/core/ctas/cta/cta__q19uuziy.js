if (document.querySelector(".core-cta__form, .core-cta-reducido__form")) {
  const processedForms = new WeakSet();

  const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;

        const confirmation = node.matches(".gform_confirmation_message")
          ? node
          : node.querySelector(".gform_confirmation_message");

        if (confirmation) {
          const ctaContainer = confirmation.closest(".core-cta__form, .core-cta-reducido__form");
          if (!ctaContainer || processedForms.has(ctaContainer)) return;

          const button = ctaContainer.querySelector(".btn-cta-form-view");
          if (button) button.style.display = "none";

          processedForms.add(ctaContainer);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

document.addEventListener("DOMContentLoaded", function () {

  function getSelectedProfile(form) {
    const radio = form.querySelector('input[type="radio"][name="input_29"]:checked');
    if (!radio) return 'unknown';
    return radio.value.toLowerCase();
  }

  function attachCTADataLayerEvents() {
    // Selecciona ambos tipos de formularios
    const forms = document.querySelectorAll(".core-cta__form, .core-cta-reducido__form");

    forms.forEach(form => {
      // Evita listeners duplicados
      if (form.dataset.dlBound === "true") return;
      form.dataset.dlBound = "true";

      const btn = form.querySelector(".btn-cta-form-view");
      if (!btn) return;

      btn.addEventListener("click", function () {
        const profile = getSelectedProfile(form);
        const isBase = form.classList.contains("core-cta__form");

        let payload = {
        };

        if (isBase) {
          // FORMULARIO BASE
          payload.event = "prospect";
          payload.flow_name = "download-catalog";
          payload.step = "submit";
          payload.profile = profile;
        } else {
          // FORMULARIO REDUCIDO
          payload.event = "click";
          payload.type = "newsletter_thin";
          payload.click_type = "submit";
          payload.click_action = "newsletter-subscribe_" + profile;
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(payload);
      });
    });
  }

  // Ejecutamos la función
  attachCTADataLayerEvents();

});

document.addEventListener('DOMContentLoaded', function () {
  const confirmationMap = new Map();

  document.querySelectorAll('.newsletter_subscription_form').forEach((container) => {
    const message = container.dataset.confirmacion;
    const form = container.querySelector('form[id^="gform_"]');
    if (!form) return;
    const formId = form.id.replace('gform_', '');
    confirmationMap.set(formId, message);
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;

        const confirmation =
          node.matches?.('.gform_confirmation_message')
            ? node
            : node.querySelector?.('.gform_confirmation_message');

        if (confirmation) {
          const match = confirmation.id.match(/gform_confirmation_message_(\d+)/);
          if (!match) return;

          const formId = match[1];
          const custom = confirmationMap.get(formId);
          if (!custom) return;

          confirmation.innerHTML = '<div class="newsletter-confirm">' + custom + '</div>';
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // NUEVA LÓGICA para setear los campos ocultos dinámicos
  function setGFormHiddenFieldByClass(fieldClass, value) {
    const field = document.querySelector(`.gfield.${fieldClass} input`);
    if (field) field.value = value;
  }

  if (typeof window.gformDynamicValues !== "undefined") {
    setGFormHiddenFieldByClass("PDF_File__c", window.gformDynamicValues.pdf);
    setGFormHiddenFieldByClass("Image_file__c", window.gformDynamicValues.img);
  }

});

// bathroom_days_cta: guarda destino en sessionStorage antes de navegar
document.addEventListener('DOMContentLoaded', function () {
  var container = document.querySelector('.bathroom_days_cta');
  if (!container) return;

  var btn = container.querySelector('a.btn');
  if (!btn) return;

  btn.addEventListener('click', function () {
    sessionStorage.setItem('ctaScrollTo', 'section-CTA');
    sessionStorage.setItem('ctaOpenModal', 'modal-cta');
  });
});

  