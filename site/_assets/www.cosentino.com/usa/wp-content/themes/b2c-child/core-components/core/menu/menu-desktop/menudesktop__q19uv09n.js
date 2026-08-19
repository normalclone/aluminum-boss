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

        mm.add("(min-width: 1080px)", () => {

            gsap.registerPlugin(ScrollTrigger);

            const dom = getDOM();
            if (!dom) return;

            const state = {
                animations: null,
                isOnTop: true,
                isSubmenuOpen: false,
                activeItem: null,
                isSecondOpen: false,
                scrollLocked: false,
                activeSecond: null,
                secondSubmenuListener: null
            };

            // creamos contexto para el scope la ejecucion de la logica
            const ctx = gsap.context(() => {
                state.animations = createAnimations(dom, state);
                initEvents(dom, state); // listeners dentro del contexto
            }, dom.header); // scope al header


            // reseteamos si cambia el viewport
            return () => {
                resetMenu(dom, state);
                
                ctx.revert();
            }
        });
    }


    // ---------------------
    // DOM
    // ---------------------
    function getDOM() {
        const header = document.getElementById('core-menu-desktop');
        if (!header) return null;

        // navbar
        const navContainer = header.querySelector('.main-menu-container');
        const menuItems = header.querySelectorAll('.menu-item');
        const theme = navContainer?.dataset.theme || 'regular';

        
        // submenus container general
        const submenu = header.querySelector('#menu-submenu');

        // primer submenu
        const firstSubmenuWrapper = submenu?.querySelector('.first-wrapper');
        const firstSubmenu = submenu?.querySelector('.first-submenu');

        // segundo submenu
        const secondSubmenuWrapper = submenu?.querySelector('.second-wrapper');
        const secondSubmenu = submenu?.querySelector('.second-submenu');

        if (
            !navContainer || 
            !submenu || 
            !firstSubmenuWrapper || 
            !firstSubmenu  || 
            !secondSubmenuWrapper || 
            !secondSubmenu ||
            !theme
        ) {
            return null;
        }

        return {
            header,
            navContainer,
            menuItems,
            submenu,
            firstSubmenu,
            firstSubmenuWrapper,
            secondSubmenuWrapper,
            secondSubmenu,
            theme
        };
    }

    // ---------------------
    // Animaciones
    // ---------------------
    function createAnimations(dom, state) {
        state.scrollLocked = false;

        const navTween = gsap.to(dom.navContainer, {
            padding: '12px 32px',
            paused: true,
            duration: 0.3,
        });

        const navScrollTrigger = ScrollTrigger.create({
            trigger: document.body,
            start: '100px top',
            end: 'max',
            onUpdate: ({ direction }) => {
                if (state.scrollLocked) return;

                dom.navContainer.classList.toggle('is-at-top', direction == -1);
                dom.navContainer.classList.toggle('is-scrolled', direction == 1);

                if (direction === 1) {
                    navTween.play();
                    state.isOnTop = false;
                } else {
                    navTween.reverse();
                    state.isOnTop = true;
                }
            }
        });

        const firstSubmenuTween = gsap.to(dom.firstSubmenuWrapper, {
            transform: 'translateY(0%)',
            duration: 0.5,
            ease: 'circ.inOut',
            paused: true,
            onStart: () => {
                dom.firstSubmenuWrapper.style.visibility = 'visible';
                state.scrollLocked = true;
                navTween.play();
            },
            onReverseComplete: () => {
                dom.firstSubmenuWrapper.style.visibility = 'hidden';
                dom.header.classList.remove('is-open');
                state.scrollLocked = false;
                if (state.isOnTop) navTween.reverse();

            },
        });

        const secondSubmenuTween = gsap.to(dom.secondSubmenuWrapper, {
            transform: 'translateY(0%)',
            duration: 0.4,
            ease: 'circ.inOut',
            paused: true,
            onReverseComplete: () => {
                dom.secondSubmenuWrapper.style.display = 'none';
                dom.secondSubmenu.innerHTML = '';
            }
        });

        const chevronTween = (chevron, open) => {
            if (!chevron) return

            return gsap.to(chevron, {
            rotate: open ? 180 : 0,
            duration: 0.4,
            ease: 'circ.out',
        })};

        const muteTween = (item, open) => {
            if (!item) return

            open ?
            item.classList.add('mute') :
            item.classList.remove('mute') ;

            return gsap.to(item, {
            filter: open ? "grayscale(100%) brightness(0.4)" : "grayscale(0%) brightness(1)",
            duration: 0.4,
            ease: 'circ.out',
        })};

        const muteSiblings = (itemActive, open)=>{

            $(itemActive)
                .closest('.menu-card')
                .siblings('.menu-card')
                .find('.card-wrapper .img-wrapper')
                .each(function () {
                    const img = $(this).find('img')[0];
                    const svg = $(this).find('svg')[0];

                    if (img) {
                        $(img).removeClass('active');
                        muteTween(img, open);
                    }
                    if (svg) {
                        muteTween(svg, open);
                    }

                });

            $(itemActive)
                .find('.img-wrapper img')
                .toggleClass('active', open);
        };

        return {
            navTween,
            navScrollTrigger,
            firstSubmenuTween, 
            secondSubmenuTween, 
            chevronTween,
            muteSiblings
        };
    }


    // ---------------------
    // Eventos
    // ---------------------
    function initEvents(dom, state) {
        document.body.classList.remove('no-scroll'); 
        
        dom.menuItems.forEach(item => {
            item.addEventListener('click', (e) => onMainItemClick(dom, state, item));
        });

        dom.submenu.addEventListener('click', (e) => {
            const clickedInsideFirst = dom.firstSubmenuWrapper.contains(e.target);
            const clickedInsideSecond = dom.secondSubmenuWrapper.contains(e.target);

            if (!clickedInsideFirst && !clickedInsideSecond) {
                closeFirstSubmenu(dom, state);
            }
        });

        dom.firstSubmenuWrapper.addEventListener('click', (e) => {
            const targetItem = e.target.closest('[data-submenu]');
            if (!targetItem) return;

            e.stopPropagation();
            onFirstSubmenuItemClick(dom, state, targetItem);
        });

    }

    // ---------------------
    // primer nivel
    // ---------------------
    function onMainItemClick(dom, state, item) {
        
        const key = item.dataset.menu;
        if (!key || !MENU_FIRST_SUBMENUS[key]) return;

        // Si es el mismo item
        if (state.isSubmenuOpen && state.activeItem === item) {
            if (state.isSecondOpen) {
                // Ambos niveles abiertos, cerrar ambos
                closeSecondSubmenu(dom, state);
            }
            closeFirstSubmenu(dom, state);
            return;
        }

        // cerrar segundo nivel si estaba abierto
        if (state.isSubmenuOpen && state.activeItem !== item) {
            closeSecondSubmenu(dom, state);
            closeFirstSubmenu(dom, state);
            
            state.openDelay = gsap.delayedCall(0.5, () => {
                openFirstSubmenu(dom, state, item, key);
            });

            return;
        }
        
        openFirstSubmenu(dom, state, item, key);
        
    }

    function openFirstSubmenu(dom, state, item, key) {

        if (state.activeItem && state.activeItem !== item) {
            state.animations.chevronTween(state.activeItem.querySelector('svg'), false);
        }

        document.body.classList.add('no-scroll');
        dom.firstSubmenu.innerHTML = MENU_FIRST_SUBMENUS[key];
        dom.header.classList.add('is-open');
        state.animations.firstSubmenuTween.play();
        state.animations.chevronTween(item.querySelector('svg'), true);

        state.isSubmenuOpen = true;
        state.activeItem = item;

        // segundo nivel queda cerrado por defecto
        state.isSecondOpen = false;
        state.activeSecond = null;
    }

    function closeFirstSubmenu(dom, state) {
        if (!state.isSubmenuOpen) return;

        if (state.isSecondOpen) closeSecondSubmenu(dom, state);

        document.body.classList.remove('no-scroll');
        state.animations.firstSubmenuTween.reverse();

        if (state.activeItem) {
            state.animations.chevronTween(state.activeItem.querySelector('svg'), false);
        }

        state.isSubmenuOpen = false;
        state.activeItem = null;
    }

    // ---------------------
    // Segundo nivel
    // ---------------------
    function onFirstSubmenuItemClick(dom, state, item) {
        const key = item.dataset.submenu;
        if (!key || !MENU_SECOND_SUBMENUS[key]) return;

        let activeKey = state.activeSecond?.dataset.submenu;

        if (state.isSecondOpen && activeKey === key) {
        
            state.animations.chevronTween(state.activeSecond.querySelector('.footer-card svg'), false);
            state.animations.muteSiblings(state.activeSecond, false);

            closeSecondSubmenu(dom, state);
            return;
        }
        
        if(state.isSecondOpen && activeKey !== key) {
            closeSecondSubmenu(dom, state);

            state.animations.secondSubmenuTween.eventCallback('onReverseComplete', () => {
                // Limpiar callback inmediatamente al ejecutarse
                state.animations.secondSubmenuTween.eventCallback('onReverseComplete', null);
                dom.secondSubmenuWrapper.style.display = 'none';
                dom.secondSubmenu.innerHTML = '';
                openSecondSubmenu(dom, state, key, item);
            });
            return;
        }
        openSecondSubmenu(dom, state, key, item);
    }

    function openSecondSubmenu(dom, state, key, item) {
        dom.secondSubmenu.innerHTML = MENU_SECOND_SUBMENUS[key];
        dom.secondSubmenuWrapper.style.display = 'flex';
        state.animations.secondSubmenuTween.play();

        
        if (state.activeSecond && state.activeSecond !== item) {
            state.animations.chevronTween(state.activeSecond?.querySelector('.footer-card svg'), false);
            state.animations.muteSiblings(state.activeSecond, false);
        }

        state.isSecondOpen = true;
        state.activeSecond = item;
        state.animations.chevronTween(item.querySelector('.footer-card svg'), true);
        state.animations.muteSiblings(item, true);

        // creamos el listener cuando abre el ultimo submenu
        state.secondSubmenuListener = clickOnSecondSubmenuItem(dom, state);

    }

    function closeSecondSubmenu(dom, state) {
        if (!state.isSecondOpen) return;

        state.animations.chevronTween(state.activeSecond.querySelector('.footer-card svg'), false);
        state.animations.muteSiblings(state.activeSecond, false);
        state.animations.secondSubmenuTween.reverse();

        // Limpiar callback dinámico acumulado
        state.animations.secondSubmenuTween.eventCallback('onReverseComplete', null);

        state.isSecondOpen = false;
        state.activeSecond = null;
        
        // destruimos el listener cuando cierra el ultimo submenu
        state.secondSubmenuListener?.destroy();
        state.secondSubmenuListener = null;
    }

    // listener par escuchar clicks en los enlaces para cerrar el submenu mientras carga la siguiente pagina
    function clickOnSecondSubmenuItem(dom, state) {
        if (!state.activeSecond) return;

        const handleClick = (e) => {
            const link = e.target.closest('.second-submenu a');
            if (!link) return;
            e.stopPropagation();
            closeFirstSubmenu(dom, state);
        };

        const handleHoverEnter = (e) => {
            const sbLink = e.target.closest('.sb-link[data-hover-img]');
            if (!sbLink) return;

            const preview = sbLink.closest('.inner-container')?.querySelector('.hover-preview');
            if (!preview) return;

            preview.querySelector('.preview-img').setAttribute('src', sbLink.dataset.hoverImg);
            preview.querySelector('.preview-img').setAttribute('alt', sbLink.dataset.hoverAlt || '');
            preview.classList.add('is-visible');
        };

        const handleHoverLeave = (e) => {
            const sbLink = e.target.closest('.sb-link[data-hover-img]');
            if (!sbLink) return;

            sbLink.closest('.inner-container')?.querySelector('.hover-preview')?.classList.remove('is-visible');
        };

        dom.secondSubmenu.addEventListener('click', handleClick);
        dom.secondSubmenu.addEventListener('mouseenter', handleHoverEnter, true);
        dom.secondSubmenu.addEventListener('mouseleave', handleHoverLeave, true);

        return {
            destroy() {
                dom.secondSubmenu.removeEventListener('click', handleClick);
                dom.secondSubmenu.removeEventListener('mouseenter', handleHoverEnter, true);
                dom.secondSubmenu.removeEventListener('mouseleave', handleHoverLeave, true);
            }
        };
}

    // funcion reset animaciones y estados
    function resetMenu(dom, state) {
        state.openDelay?.kill();
        state.openDelay = null;

        // Limpiar callbacks dinámicos acumulados
        state.animations?.firstSubmenuTween?.eventCallback('onReverseComplete', null);
        state.animations?.secondSubmenuTween?.eventCallback('onReverseComplete', null);

        state.animations?.secondSubmenuTween?.kill();
        state.animations?.firstSubmenuTween?.kill();
        state.animations?.navTween?.kill();
        state.animations?.navScrollTrigger?.kill();

        ScrollTrigger.getAll().forEach(st => st.kill());

        gsap.set(dom.navContainer, { clearProps: "all" });

        // Limpiar segundo submenu explícitamente
        dom.secondSubmenuWrapper.removeAttribute('style');
        dom.secondSubmenuWrapper.style.transform = 'translateY(-320%)';
        dom.secondSubmenuWrapper.style.display = 'none';
        dom.secondSubmenu.innerHTML = '';

        dom.firstSubmenuWrapper.removeAttribute('style');
        dom.firstSubmenuWrapper.style.transform = 'translateY(-150%)';
        dom.firstSubmenuWrapper.style.visibility = 'hidden';
        dom.firstSubmenu.innerHTML = '';

        dom.navContainer.classList.remove('is-scrolled', 'is-open');
        dom.navContainer.classList.add('is-at-top');
        dom.header.classList.remove('is-open');
        document.body.classList.remove('no-scroll');

        dom.menuItems.forEach(item => {
            const chevron = item.querySelector('svg');
            if (chevron) gsap.set(chevron, { clearProps: "all" });
        });

        state.isSubmenuOpen = false;
        state.isOnTop = true;
        state.isSecondOpen = false;
        state.activeItem = null;
        state.activeSecond = null;

        state.secondSubmenuListener?.destroy();
        state.secondSubmenuListener = null;
    }


})();
