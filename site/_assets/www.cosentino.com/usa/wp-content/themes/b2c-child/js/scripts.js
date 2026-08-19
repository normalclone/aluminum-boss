//Searchbar and Ajax
$(document).ready(function() {
    function onSearch(e) {
        var $form = $("form");
        var $input = $("input[type=search]");
        var query = $input.val();
        var ajaxurl = $form.attr("data-ajaxurl");
        var results = $("#Results");
        if (query.length < 3) return false;
        if (window.outerWidth > 768) {
            $.ajax({
                type: "post",
                url: ajaxurl,
                data: {
                    action: "load_search_results",
                    query: query,
                },
                beforeSend: function() {
                    results.addClass("loading");
                    $("input[type=search]").addClass("loading");
                    //  $('body').attr('data-search-results-on', 1);
                },
                success: function(response) {
                    results.removeClass("loading");
                    $("input[type=search]").removeClass("loading");
                    if (response) {
                        results.html(response);
                    } else {
                        results.html("zero results");
                    }
                    $("body").attr("data-search-results-on", 1);

                    if (SearchInput.value.length === 0)
                        $("body").attr("data-search-results-on", 0);
                },
            });
        }
    }

    var $input = $("input[type=search]");
    if ($input.length > 0) {
        SearchInput.addEventListener("keyup", onSearch);
    }


    window.addEventListener("resize", () => {
        if (window.outerWidth < 768) $("body").attr("data-search-results-on", 0);
    });

    //Optimize Slider Apperance when resize window
    var timeout = false;
    const delay = 250;

    const toggleArrows = () => {
        const sliders = document.querySelectorAll(".cos-slider");
        sliders.forEach((slider) => {
            let hasSlider = slider.querySelector(".slick-slider");
            slider.querySelector(".cos-nav-arrows").style.display = (!hasSlider) ? "none" : "block";
        });
    }; 

    window.addEventListener("resize", () => {
        clearTimeout(timeout);
        timeout = setTimeout(toggleArrows, delay);
    });

    // Corregimos exceso de ancho de fila de formulario de Flagship Projects
    if($("#form-fp").length){
        $("html").css("overflow-x", "hidden");
    }

});

/**
 * Función que maneja el callback de la inicialización de la API de Google. Emite un evento para que otros componentes sepan que se ha inicializado
 */
function initMap() {
    let event = new Event("googlemapsloaded");
    document.dispatchEvent(event);
}