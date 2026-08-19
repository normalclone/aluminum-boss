$(document).ready(function () {
    const footerMenuTitles = document.querySelectorAll('#site-footer .footer-menu-title');
    footerMenuTitles.forEach(function (element, index) {
        element.addEventListener('click', toggleCollapsedIcon);
    });
    
    var width = $(window).width();
    if(width <= 991){
        $('.c-cta-verde .vc_row.wpb_row.vc_row-fluid.px-5.vc_custom_1596691549581').removeClass('px-5').addClass('px-4');
    }
    if((width > 767) && (width < 992)){
        $('.c-cta-verde .vc_row.wpb_row.vc_row-fluid.px-4.vc_custom_1596691549581 button').height('auto');
   }
 
    
});

// Comentamos código que altera comportamiento de menú móvil.

/* $(document).ready(function(){
    $(document).ready(function () {
        $("li").click(function () {
            var id = $(this).attr("id");
    
            $('#' + id + ' a').siblings().find(".active").removeClass("active");
                //                       ^ you forgot this
            $('#' + id + ' a').addClass("active");
            localStorage.setItem("selectedolditem", id);
        });
    
        var selectedolditem = localStorage.getItem('selectedolditem');
    
        if (selectedolditem != null) {
            $('#' + selectedolditem + ' a').siblings().find(".active").removeClass("active");
            //                                        ^ you forgot this
            $('#' + selectedolditem + ' a').addClass("active");
        }
    });
}); */

$(window).on('resize', function(){
    var win = $(this);
    const ctaPadding = document.getElementsByClassName('.c-cta-verde .vc_row.wpb_row.vc_row-fluid.px-5.vc_custom_1596691549581');
    if (win.width() <= 992){
        $('.c-cta-verde .vc_row.wpb_row.vc_row-fluid.px-5.vc_custom_1596691549581').removeClass('px-5').addClass('px-4');
    } else {
        if ( $( ".c-cta-verde .vc_row.wpb_row.vc_row-fluid.px-4.vc_custom_1596691549581" ).length ) {
            $('.c-cta-verde .vc_row.wpb_row.vc_row-fluid.px-4.vc_custom_1596691549581').removeClass('px-4').addClass('px-5');
        }
    }
    
});

function toggleCollapsedIcon(e) {
    const element = e.currentTarget;
    const icon = element.querySelector('.icon');

    if (element.getAttribute('aria-expanded') === 'false') {
        icon.innerHTML = '-';
    } else {
        icon.innerHTML = '+';
    }
}

