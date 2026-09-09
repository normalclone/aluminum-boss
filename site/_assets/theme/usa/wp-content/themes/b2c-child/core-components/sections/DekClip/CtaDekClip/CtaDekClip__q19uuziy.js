jQuery(document).ready(function($) {
    const $modal = $('#videoModal');
    const $iframe = $('#videoIframe');
    const videoUrl = $iframe.length ? $iframe.data('video') : null;

    // Solo si hay video
    if (videoUrl && videoUrl.trim() !== '') {
        $('.core-cta-customizable.overflow-dekclip-cta a').on('click', function(e) {
            e.preventDefault();
            $iframe.attr('src', videoUrl + '?autoplay=1');
            $modal.fadeIn();
        });
    }

    // Botón cerrar
    $('#closeModal').on('click', function() {
        $iframe.attr('src', ''); // Detener reproducción
        $modal.fadeOut();
    });

    // Cerrar al hacer clic fuera del contenido
    $modal.on('click', function(e) {
        // Si se hace clic en el fondo (no dentro del iframe/contenido)
        if ($(e.target).is('#videoModal')) {
            $iframe.attr('src', ''); // Detener reproducción
            $modal.fadeOut();
        }
    });
});
