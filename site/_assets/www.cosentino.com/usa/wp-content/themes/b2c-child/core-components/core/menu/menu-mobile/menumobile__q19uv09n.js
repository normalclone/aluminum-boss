(() => {

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ---------------------
    // Inicio
    // ---------------------
    function init(){
        const mm = gsap.matchMedia();

        mm.add("(max-width: 1079px)", () => {

            gsap.registerPlugin(ScrollTrigger);

            const dom = getDOM();
            if (!dom) return;

            const state = {
                isOnTop: true,
                scrollLocked: false,
                isMenuOpen: false,
                activeItem: null,
                isSubmenuOpen: false,
                firstItemsListener: null,
                secondSubmenuListener: null,
                accordionTween: null,
                activeCard: null,
                acordeonListener: null,
            };


             // creamos contexto para el scope la ejecucion de la logica
            const ctx = gsap.context(() => {
                
                state.animations = createAnimations(dom, state);
                initEvents(dom, state); 
            }, dom.header); // acotamos scope al header

            // reseteamos si cambia el viewport
            return () =>{
                resetMenu(dom, state);
                ctx.revert();
            }
        });
    }


    // ---------------------
    // DOM
    // ---------------------
    function getDOM() {
        const header = document.getElementById('core-menu-mobile');
        if (!header) return null;

        // navbar
        const burgetBtn = document.getElementById('burger-btn');
        const mobileNavbar = header?.querySelector('.mobile-navbar');
        const btnPresupuesto = document.querySelector('#aside-menu-btn-test');

        // Main Menu
        const mobileMenu = header.querySelector('.mobile-menu');
        const mobileOverlay = header.querySelector('.menu-overlay');
        const menuItems = header.querySelectorAll('.menu-item');
        const menuContainer = header.querySelector('.menu-container');
        
        // First Submenu
        const firstSubmenu = header.querySelector('.first-submenu');
        const firstSubmenuItems = header.querySelector('.first-submenu-items');
        const btnBackFirst = firstSubmenu?.querySelector('.btn-back');

        if (
            !burgetBtn || 
            !mobileNavbar ||
            !mobileOverlay || 
            !mobileMenu ||
            !menuItems ||
            !firstSubmenu ||
            !firstSubmenuItems ||
            !btnBackFirst ||
            !menuContainer
        ) {
            return null;
        }

        return {
            header,
            burgetBtn,
            mobileNavbar,
            mobileMenu,
            mobileOverlay,
            menuItems,
            firstSubmenu,
            firstSubmenuItems,
            btnBackFirst,
            menuContainer,
            btnPresupuesto
        };
    }

    // ---------------------
    // Animaciones
    // ---------------------
    function createAnimations(dom, state) {

        let btnTween = null;

        const navTween = gsap.to(dom.mobileNavbar, {
            padding: '12px 16px',
            duration: 0.3,
            paused: true
        });

        ScrollTrigger.create({
            trigger: document.body,
            start: '100px top',
            end: 'max',
            onUpdate: ({ direction }) => {
                if (state.scrollLocked) return;

                dom.mobileNavbar.classList.toggle('is-scrolled', direction == 1);

                if (direction === 1) {
                    navTween.play();
                    btnTween?.play();
                    state.isOnTop = false;
                } else {
                    navTween.reverse();
                    btnTween?.reverse();
                    state.isOnTop = true;
                }
            }
        });

        gsap.set(dom.mobileMenu, {
            xPercent: -100,
            opacity: 1,
        });
        gsap.set(dom.mobileOverlay, {
            xPercent: -100,
            opacity: 1,
        });
        gsap.set(dom.firstSubmenu, {
            xPercent: -100,
            opacity: 1,
        });

        const menuTL = gsap.timeline({ paused: true, defaults: { ease: 'circ.inOut', duration: 0.5,} });

        menuTL
            .to(dom.mobileOverlay, {
                xPercent: 0,
                duration: 0.3,
                onStart: () => {
                    dom.scrollLocked = true;
                    navTween.play();
                },
                onReverseComplete: () => {
                    dom.scrollLocked = false;
                    dom.burgetBtn.classList.remove('is-open');
                    dom.mobileNavbar.classList.remove('is-open');
                    state.scrollLocked = false;
                    if (state.isOnTop) navTween.reverse();
                if (state.isOnTop) btnTween?.reverse();
                },
            })
            .to(dom.mobileMenu, {
                xPercent: 0,
                duration: 0.5,
            },"<");

        const firstSubmenuTL = gsap.timeline({ paused: true, defaults: { ease: 'circ.inOut', duration: 0.5,} });

        firstSubmenuTL
            .to(dom.mobileMenu, {
                xPercent: 100,
            })
            .to(dom.firstSubmenu, {
                xPercent: 0,
            },"<");

        const chevronTween = (chevron, open) => {
            if (!chevron) return

            return gsap.to(chevron, {
            rotate: open ? -180 : 0,
            duration: 0.4,
            ease: 'circ.out',
        })};

        if (dom.btnPresupuesto) {
            btnTween = gsap.to(dom.btnPresupuesto, {
                top: 48,
                duration: 0.8,
                ease: 'circ.inOut',
                paused: true
            });
        }

        return {
            navTween,
            menuTL,
            chevronTween,
            firstSubmenuTL,
            btnTween
        };
    }

    // ---------------------
    // Eventos
    // ---------------------
    function initEvents(dom, state) {
        dom.burgetBtn.addEventListener('click', () => {
            onClickOpenMenu(dom, state);
        });
        dom.menuItems.forEach(item => {
            item.addEventListener('click', (e) => onMainItemClick(dom, state, item));
        });
        dom.btnBackFirst.addEventListener('click', () => onClickBtnBack(dom, state));
    }

    function initSecondMenuEvent(dom, state) {
        const handler = (e) => {
            if (!state.isSubmenuOpen) return; 

            const card = e.target.closest('.card-wrapper');
            if (!card) return;
            
            onClickSubmenuItem(dom, state, card)
        };
        dom.firstSubmenuItems.addEventListener('click', handler);
        return handler;
    };

    // ---------------------
    // primer nivel
    // ---------------------
    function onClickOpenMenu(dom, state) {

        if (state.isMenuOpen && state.scrollLocked) {
            closeMenu(dom, state); 
            return
        }
        openMenu(dom, state); 
        // cerrar segundo nivel si estaba abierto
        
    }

    function openMenu(dom, state) {

        dom.burgetBtn.classList.add('is-open'); 
        dom.mobileNavbar.classList.add('is-open'); 
        document.body.classList.add('no-scroll');
        gsap.set(dom.header.querySelector('.menu-container'), { pointerEvents: 'auto' });

        setTimeout(()=>{
            state.animations.menuTL.play();
        }, 100);

        state.scrollLocked = true;
        state.isMenuOpen = true;
    }

    function closeMenu(dom, state) {

        if (state.isSubmenuOpen) {
            closeFirstSubmenu(dom, state);
        }

        state.animations.menuTL.reverse();
        gsap.set(dom.menuContainer, { clearProps: 'pointerEvents' });


        document.body.classList.remove('no-scroll');
        state.scrollLocked = false;
        state.isMenuOpen = false;
    }

    function onMainItemClick(dom, state, item) {

        const key = item.dataset.menu;
        if (!key || !MOBILE_MENU_FIRST_SUBMENUS[key]) return;


        openFirstSubmenu(dom, state, item, key);
        
    }

    function openFirstSubmenu(dom, state, item, key) {

        dom.firstSubmenuItems.innerHTML = MOBILE_MENU_FIRST_SUBMENUS[key];
        state.animations.firstSubmenuTL.play();

        state.isSubmenuOpen = true;
        state.activeItem = item;
        state.firstItemsListener = initSecondMenuEvent(dom, state);

        // segundo nivel queda cerrado por defecto
        state.isSecondOpen = false;
    }

    function closeFirstSubmenu(dom, state) {
        if (!state.isSubmenuOpen) return;

        state.animations.firstSubmenuTL.reverse();

        if (state.firstItemsListener) {
            dom.firstSubmenuItems.removeEventListener(
                'click',
                state.firstItemsListener
            );
            state.firstItemsListener = null;
        }

        state.isSubmenuOpen = false;
        state.activeItem = null;

        if (state.accordionTween) {
            state.accordionTween.kill();
            state.accordionTween = null;
            state.activeCard = null;
        }
    }

    function onClickBtnBack(dom, state) {
        closeFirstSubmenu(dom, state);
    }

    // ---------------------
    // Segundo nivel
    // ---------------------

    function onClickSubmenuItem(dom, state, card) {

    const key = card.dataset.submenu;
    if (!key || !MOBILE_MENU_SECOND_SUBMENUS[key]) return;

    const cardParent = card.closest('.menu-card');
    if (!cardParent) return;

    const accordion = cardParent.querySelector('.second-submenu');
    if (!accordion) return;

    // si se clica un acordeon y hay uno activo lo cerramos, si era el mismo salimos, sino lo abrimos.
    if (state.accordionTween) {

        const isSameCard = state.activeCard === card;

        closeCardAccordion(state);

        if (isSameCard) return;
    }

    // 👉 Abrir nuevo acordeón
    openCardAccordion(dom, state, accordion, card, key);
}


function openCardAccordion(dom, state, accordion, card, key) {

    accordion.innerHTML = MOBILE_MENU_SECOND_SUBMENUS[key];

    // Set inicial solo una vez
    gsap.set(accordion, {
        height: 0,
        overflow: "hidden",
        opacity: 1,
    });

    const tween = gsap.to(accordion, {
        height: "auto",
        duration: 0.45,
        ease: "power3.out",
        paused: true
    });

    tween.play();
    state.animations.chevronTween(card.querySelector('.icon svg'), true);
    card.classList.add('is-open');

    state.activeAccordion = accordion;
    state.accordionTween = tween;
    state.activeCard = card;

    state.acordeonListener = clickOnAcordeonItem(dom, state);
}

function closeCardAccordion(state) {

    state.accordionTween.reverse();
    state.animations.chevronTween(state.activeCard.querySelector('.icon svg'), false) 
    state.activeCard.classList.remove('is-open');
    state.accordionTween = null;
    state.activeCard = null;

    // destruimos el listener cuando cierra el acordeon
    state.acordeonListener?.destroy();
    state.acordeonListener = null;
}

    function clickOnAcordeonItem(dom, state) {
    
        if (!state.activeAccordion) return;

        const handler = (e) => {

            const link = e.target.closest('.second-submenu a');
            if (!link) return;
            
            e.stopPropagation();
            closeCardAccordion(state);
            closeMenu(dom, state); 
        };

        state.activeAccordion.addEventListener('click', handler);

        return {
            destroy() {
                state.activeAccordion.removeEventListener('click', handler);
            }
        };
    }

    // funcion reset animaciones y estados
    function resetMenu(dom, state) {

        if (state.animations?.menuTL) {
            state.animations.menuTL.pause(0);
        }

        if (state.animations?.firstSubmenuTL) {
            state.animations.firstSubmenuTL.pause(0);
        }

        if (state.animations?.btnTween) {
            state.animations.btnTween.pause(0);
        }

        dom.burgetBtn.classList.remove('is-open');
        dom.mobileNavbar.classList.remove('is-open');
        document.body.classList.remove('no-scroll');
        gsap.set(dom.menuContainer, { pointerEvents: 'none', clearProps: 'pointerEvents' });

        state.isMenuOpen = false;
        state.isSubmenuOpen = false;
        state.activeCard = null;
        state.accordionTween = null;
    }

    

})();
