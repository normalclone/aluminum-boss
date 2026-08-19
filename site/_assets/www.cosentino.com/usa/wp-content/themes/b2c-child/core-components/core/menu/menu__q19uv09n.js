(() => {

    // Referencia al dom/state activos, usada por la API pública window.CoreMenu
    // (necesaria para que scripts externos como showcase-color.js puedan
    // consultar el login o refrescar el carrito de muestras tras el refactor
    // del megamenú antiguo, que sí exponía window.Megamenu globalmente).
    let _dom = null;
    let _state = null;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ---------------------
    // Inicio
    // ---------------------
    function init() {
        const dom = getDOM();
        if (!dom) return;

        const state = {
            animations: null,
            isModalOpen: false,
            lagSelected: null,
            isUserPanelOpen: false,
            userData: null,
            userDataLoaded: false,
            cartData: [],
            pendingQtyTimers: {},
        };

        // Volcamos cambios de cantidad pendientes (debounce) antes de abandonar la página,
        // ya que los enlaces de muestras navegan en la misma pestaña.
        window.addEventListener('pagehide', () => flushPendingQty(state));

        _dom = dom;
        _state = state;

        state.animations = createAnimations(dom, state);
        initEvents(dom, state);
        initUserPanel(dom, state);
        initGtmTracking(dom);
    }

    // ---------------------
    // API pública
    // ---------------------
    window.CoreMenu = {
        isLogged() {
            return Boolean(_state?.userData);
        },
        async refreshCart() {
            if (!_dom || !_state?.userData) return;
            await syncCartFromServer(_dom, _state);
        },
    };

    // ---------------------
    // DOM
    // ---------------------
    function getDOM() {
        const header = document.getElementById('core-main-menu');
        if (!header) return null;

        const modalContainer = document.getElementById('languagesModal');

        return {
            header,
            langBtns:      header.querySelectorAll('.menu-lang'),
            modalContainer,
            modal:         modalContainer?.querySelector('.modal--content') ?? null,
            closeBtn:      modalContainer?.querySelector('span.close-btn')  ?? null,
            userBtns:       header.querySelectorAll('.menu-user-btn'),
            userLoginBtns:  header.querySelectorAll('.menu-user-login-btn'),
            userLoggedBtns: header.querySelectorAll('.menu-user-logged-btn'),
            userDropdowns:  header.querySelectorAll('.user-dropdown-logged'),
            userBadges:     header.querySelectorAll('.menu-user-badge'),
        };
    }

    // ---------------------
    // Animaciones
    // ---------------------
    function createAnimations(dom, state) {
        const animations = {};

        if (dom.modalContainer && dom.modal) {
            animations.modalTL = gsap.timeline({ paused: true, defaults: { ease: 'circ.inOut', duration: 0.3 } })
                .to(dom.modalContainer, { opacity: 1, pointerEvents: 'auto' })
                .to(dom.modal, { opacity: 1, scale: 1 }, '-=0.2');
        }

        return animations;
    }

    // ---------------------
    // GTM megamenu tracking
    // ---------------------
    // Captura (fase 3er arg = true) para disparar ANTES de cualquier stopPropagation
    // en los handlers de los submenus (firstSubmenuWrapper, secondSubmenu).
    function initGtmTracking(dom) {
        dom.header.addEventListener('click', (e) => {
            const el = e.target.closest('[data-gtm-l1]');
            if (!el) return;

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event:       'megamenu',
                level_one:   el.dataset.gtmL1   || 'not-available',
                level_two:   el.dataset.gtmL2   || 'not-available',
                level_three: el.dataset.gtmL3   || 'not-available',
            });
        }, true); // capture phase
    }

    // ---------------------
    // Eventos
    // ---------------------
    function initEvents(dom, state) {
        if (!dom.langBtns.length || !dom.modalContainer || !dom.modal || !dom.closeBtn) return;

        dom.langBtns.forEach(btn => {
            btn.addEventListener('click', () => onClickLngBtn(dom, state));
        });

        dom.closeBtn.addEventListener('click', () => onClickCerrarBtn(dom, state));

        dom.modalContainer.addEventListener('click', (e) => {
            if (e.target === dom.modalContainer) onClickCerrarBtn(dom, state);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isModalOpen) onClickCerrarBtn(dom, state);
        });
    }

    function initUserPanel(dom, state) {
        if (!dom.userLoggedBtns.length || !dom.userDropdowns.length) return;

        dom.userLoggedBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                state.isUserPanelOpen ? closeUserPanel(dom, state) : openUserPanel(dom, state);
            });
        });

        dom.userDropdowns.forEach(dropdown => {
            const comercialBtn = dropdown.querySelector('.user-dropdown-comercial');
            const muestrasBtn  = dropdown.querySelector('.user-dropdown-muestras');
            const backBtns     = dropdown.querySelectorAll('.comercial-actions-back, .muestras-actions-back');

            comercialBtn?.addEventListener('click', () => openSecondPanel(dropdown, 'comercial', state));
            muestrasBtn?.addEventListener('click',  () => openSecondPanel(dropdown, 'muestras', state));
            backBtns.forEach(btn => btn.addEventListener('click', () => closeSecondPanel(dropdown, state)));
        });

        document.addEventListener('click', (e) => {
            if (!state.isUserPanelOpen) return;
            const clickedInsideAny = [...dom.userDropdowns].some(d => d.contains(e.target));
            const clickedBtn = [...dom.userLoggedBtns].some(b => b === e.target);
            if (!clickedInsideAny && !clickedBtn) closeUserPanel(dom, state);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isUserPanelOpen) closeUserPanel(dom, state);
        });

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => refreshSecondPanelHeight(dom, state), 100);
        });

        loadUserData(dom, state);
    }

    // ---------------------
    // Modal idiomas
    // ---------------------
    async function onClickLngBtn(dom, state) {
        if (!dom.modalContainer || state.isModalOpen || !state.animations.modalTL) return;

        // Abrir modal inmediatamente — los skeletons se muestran hasta que llega la data
        state.animations.modalTL.play();
        state.isModalOpen = true;
        document.body.classList.add('no-scroll');

        if (!window.localeData) {
            try {
                const res  = await fetch(
                    `${coreLangModalData.ajaxurl}?action=core_lang_modal_data`,
                    { credentials: 'same-origin' }
                );
                const json = await res.json();
                if (json.success && typeof window.langModalInit === 'function') {
                    window.langModalInit(json.data.localeData, json.data.continentLabels);
                }
            } catch (e) {
                console.error('[LangModal] fetch failed', e);
            }
        }
    }

    function onClickCerrarBtn(dom, state) {
        if (!dom.modalContainer || !state.isModalOpen || !state.animations.modalTL) return;
        state.animations.modalTL.reverse();
        state.isModalOpen = false;
        document.body.classList.remove('no-scroll');
        dom.modalContainer.dispatchEvent(new CustomEvent('modal:closed'));
    }

    // ---------------------
    // User Panel
    // ---------------------
    function openUserPanel(dom, state) {
        dom.userDropdowns.forEach(d => d.classList.add('is-open'));
        dom.userLoggedBtns.forEach(b => b.classList.add('is-active'));
        state.isUserPanelOpen = true;
    }

    function closeUserPanel(dom, state) {
        flushPendingQty(state);
        dom.userDropdowns.forEach(d => {
            d.classList.remove('is-open');

            // Reset del segundo panel para que al reabrir se vea la primera página
            const wrapper       = d.querySelector('.dropdown-wrapper');
            const firstWrapper  = d.querySelector('.first-wrapper');
            const secondWrapper = d.querySelector('.second-wrapper-content');

            if (wrapper)       gsap.set(wrapper,       { clearProps: 'height' });
            if (firstWrapper)  gsap.set(firstWrapper,  { clearProps: 'transform' });
            if (secondWrapper) gsap.set(secondWrapper, { clearProps: 'all', display: 'none' });
        });
        dom.userLoggedBtns.forEach(b => b.classList.remove('is-active'));
        state.isUserPanelOpen = false;
        state.activePanel = null;
        state.firstWrapperHeight = null; 
    }

    async function loadUserData(dom, state) {
        if (!newMenuData.enableUserDropdown) return;
        const sf = salesForceServices;

        const logoutCookie      = getCookie('doLogoutFromSalesforce');
        const currentUserCookie = getCookie('currentUser');
        if (logoutCookie || !currentUserCookie) {
            document.cookie = 'doLogoutFromSalesforce=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.cosentino.com';
            sessionStorage.removeItem('userAccount');
            return;
        }

        let userAccountResponse;
        try {
            userAccountResponse = await sf.getUserAccount();
        } catch (e) {
            console.warn('[Menu] getUserAccount failed:', e);
            clearSessionCookies();
            return;
        }

        if (!userAccountResponse?.data) {
            clearSessionCookies();
            return;
        }

        state.userData = userAccountResponse.data;
        state.userDataLoaded = true;

        showLoggedState(dom);
        renderComercialPanel(dom, state);
        renderUserLogout(dom, state);

        // Pintado rápido desde cache (sessionStorage). Si no hay cache, se mantiene el
        // skeleton/ghost hasta que responda getCart.
        const cached = loadCart(state.userData.AccountId);
        if (cached) {
            state.cartData = cached;
            syncCartGlobals(state);
            renderMuestras(dom, state);
            refreshCartTotals(dom, state);
        }

        // getCart siempre es la fuente de verdad: reconcilia y actualiza la cache.
        await syncCartFromServer(dom, state);
    }

    // Trae el carrito desde Salesforce, reconcilia el estado/cache y re-renderiza.
    async function syncCartFromServer(dom, state) {
        const accountId = state.userData?.AccountId;
        if (!accountId) return;

        try {
            const productos = await salesForceServices.getCart(accountId);
            state.cartData = productos?.data ?? [];
            saveCart(state);
        } catch (e) {
            console.warn('[Menu] getCart failed:', e);
            // Si ya teníamos algo (cache), lo mantenemos; si no, dejamos vacío.
            if (!Array.isArray(state.cartData)) state.cartData = [];
        }

        syncCartGlobals(state);
        renderMuestras(dom, state);
        refreshCartTotals(dom, state);
    }

    // ---------------------
    // Cache del carrito (sessionStorage) + objeto global
    // ---------------------
    const CART_STORAGE_KEY = 'coreMenuCart';

    function saveCart(state) {
        const accountId = state.userData?.AccountId;
        if (!accountId) return;
        try {
            sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
                accountId,
                items: state.cartData ?? [],
                ts: Date.now(),
            }));
        } catch (e) {
            console.warn('[Menu] No se pudo guardar el carrito en sessionStorage:', e);
        }
        syncCartGlobals(state);
    }

    function loadCart(accountId) {
        try {
            const raw = sessionStorage.getItem(CART_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            // Solo válido si pertenece al usuario actual.
            if (!parsed || parsed.accountId !== accountId || !Array.isArray(parsed.items)) return null;
            return parsed.items;
        } catch (e) {
            return null;
        }
    }

    function clearCart() {
        try { sessionStorage.removeItem(CART_STORAGE_KEY); } catch (e) {}
    }

    // Mantiene window.CoreMenuCart actualizado para acceso/depuración global.
    function syncCartGlobals(state) {
        window.CoreMenuCart = {
            items: state.cartData ?? [],
            getTotal: () => (state.cartData ?? []).reduce((acc, p) => acc + (p.Quantity__c || 0), 0),
        };
    }

    function clearSessionCookies() {
        document.cookie = 'currentUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.cosentino.com';
        document.cookie = 'doLogoutFromSalesforce=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.cosentino.com';
        sessionStorage.removeItem('userAccount');
        clearCart();
    }

    function showLoggedState(dom) {
        dom.userLoginBtns.forEach(btn => { btn.style.display = 'none'; });
        dom.userLoggedBtns.forEach(btn => { btn.classList.remove('d-none'); });
    }

    function renderComercialPanel(dom, state) {
        const { userData } = state;

        dom.userDropdowns.forEach(d => {
            const nameEl  = d.querySelector('[data-field="owner-name"]');
            const emailEl = d.querySelector('[data-field="owner-email"]');
            const phoneEl = d.querySelector('[data-field="owner-phone"]');
            const phoneLi = d.querySelector('.comercial-info-phone');

            if (nameEl)  nameEl.textContent  = userData.Owner_Name__c  || '—';
            if (emailEl) emailEl.textContent = userData.Owner_Email__c || '—';

            if (userData.Account_owner_mobile__c && phoneEl && phoneLi) {
                phoneEl.textContent = userData.Account_owner_mobile__c;
                phoneLi.style.display = '';
            }
        });
    }

    // ---------------------
    // Muestras
    // ---------------------
    function renderMuestras(dom, state) {
        const data = state.cartData ?? [];
        const isEmpty = data.length === 0;

        dom.userDropdowns.forEach(d => {
            const list        = d.querySelector('[data-field="muestras-list"]');
            const empty       = d.querySelector('.muestras-empty');
            const loading     = d.querySelector('.muestras-loading');
            if (!list) return;

            // El carrito ya cargó: ocultamos el skeleton.
            if (loading) loading.style.display = 'none';

            list.innerHTML = '';
            list.style.display = isEmpty ? 'none' : '';

            if (empty) empty.style.display = isEmpty ? '' : 'none';

            const confirmBtn = d.querySelector('.muestra-confirm-btn');
            if (!isEmpty) {
                data.forEach(p => list.appendChild(buildMuestraLi(p, d, dom, state)));
                if (confirmBtn) confirmBtn.style.display = '';
            } else {
                if (confirmBtn) confirmBtn.style.display = 'none';
            }
        });

        // Si el panel de muestras ya está abierto, reajustamos su altura al nuevo contenido.
        refreshSecondPanelHeight(dom, state);
    }

     function buildMuestraLi(product, dropdown, dom, state) {
        const tpl = dropdown.querySelector('.muestra-item-tpl');
        const li  = tpl.content.cloneNode(true).querySelector('li');
        li.dataset.productId = product.Id;

        const brand      = product.Product2__r?.Product__r?.Brand__c ?? '';
        const name       = product.Product2__r?.Name ?? '';
        const finish     = product.Product2__r?.Finish__c ?? '';
        const size       = product.Product2__r?.Sample_size__c ?? '';
        const imageUrl   = (product.imageUrl ?? '').replace('?w=200&h=200&auto=compress,format', '?w=300&h=300&fit=crop&auto=format');
        const sizeFinish = [size, finish].filter(Boolean).join(' / ');

        const img = li.querySelector('img');
        if (img) { img.src = imageUrl; img.alt = `${brand} ${name}`.trim(); }
        li.querySelector('[data-field="muestra-name"]').textContent = brand;
        li.querySelector('[data-field="muestra-ref"]').textContent  = name;
        li.querySelector('[data-field="muestra-size"]').textContent = sizeFinish;
        li.querySelector('[data-field="muestra-quantity"] p').textContent = product.Quantity__c ?? 0;

        li.querySelector('.muestras-quantity-mas-btn')?.addEventListener('click',   () => onIncreaseQty(li, product, dom, state));
        li.querySelector('.muestras-quantity-menos-btn')?.addEventListener('click',  () => onDecreaseQty(li, product, dom, state));
        li.querySelector('.muestra-remove-btn')?.addEventListener('click', (e) => { e.stopPropagation(); onRemoveItem(li, product, dom, state); });

        return li;
    }

    function onIncreaseQty(li, product, dom, state) {
        applyQtyChange(li, product, (Number(product.Quantity__c) || 0) + 1, dom, state);
    }

    function onDecreaseQty(li, product, dom, state) {
        const current = Number(product.Quantity__c) || 0;
        if (current <= 0) return;
        applyQtyChange(li, product, current - 1, dom, state);
    }

    // Actualización optimista: refleja el cambio al instante y sincroniza con SF (debounced).
    function applyQtyChange(li, product, newQty, dom, state) {
        product.Quantity__c = newQty;

        const qtyEl = li.querySelector('[data-field="muestra-quantity"] p');
        if (qtyEl) qtyEl.textContent = newQty;

        refreshCartTotals(dom, state);
        saveCart(state);
        scheduleQtySync(product, state, dom);
    }

    // Debounce por producto: tras ~450ms sin nuevos clics, envía la cantidad final a SF.
    function scheduleQtySync(product, state, dom) {
        clearTimeout(state.pendingQtyTimers[product.Id]);
        state.pendingQtyTimers[product.Id] = setTimeout(() => {
            delete state.pendingQtyTimers[product.Id];
            salesForceServices.updateProductCount(product.Id, product.Quantity__c)
                .catch(e => {
                    console.warn('Error actualizando cantidad:', e);
                    syncCartFromServer(dom, state); // el servidor manda
                });
        }, 450);
    }

    // Vuelca de inmediato cualquier cambio de cantidad pendiente (best-effort).
    function flushPendingQty(state) {
        Object.keys(state.pendingQtyTimers).forEach(id => {
            clearTimeout(state.pendingQtyTimers[id]);
            delete state.pendingQtyTimers[id];
            const product = (state.cartData ?? []).find(p => p.Id === id);
            if (product) salesForceServices.updateProductCount(id, product.Quantity__c);
        });
    }

    function onRemoveItem(li, product, dom, state) {
        // Cancelamos cualquier sync de cantidad pendiente de este producto.
        clearTimeout(state.pendingQtyTimers[product.Id]);
        delete state.pendingQtyTimers[product.Id];

        // Optimista: lo quitamos del estado y re-renderizamos al instante.
        state.cartData = state.cartData.filter(p => p.Id !== product.Id);
        renderMuestras(dom, state);
        refreshCartTotals(dom, state);
        refreshSecondPanelHeight(dom, state);
        saveCart(state);

        // Por debajo: lo eliminamos en SF; si falla, resincronizamos con el servidor.
        salesForceServices.removeProduct(product.Id)
            .catch(e => {
                console.warn('Error eliminando producto:', e);
                syncCartFromServer(dom, state);
            });
    }

    function refreshCartTotals(dom, state) {
        const total = (state.cartData ?? []).reduce((acc, p) => acc + (p.Quantity__c || 0), 0);

        dom.userDropdowns.forEach(d => {
            const countEl = d.querySelector('[data-field="muestras-count"]');
            const badge   = d.querySelector('.user-dropdown-muestras .user-dropdown-badge');
            if (countEl) countEl.textContent = total;
            if (badge)   badge.style.display = total > 0 ? '' : 'none';
        });

        dom.userBadges.forEach(badge => {
            const countEl = badge.querySelector('[data-field="muestras-count-btn"]');
            if (countEl) countEl.textContent = total;
            badge.style.display = total > 0 ? 'flex' : 'none';
        });
    }

    // ---------------------
    // Logout
    // ---------------------
    function renderUserLogout(dom, state) {
        dom.userDropdowns.forEach(d => {
            const logoutBtn = d.querySelector('.user-dropdown-link-logout');
            if (!logoutBtn) return;

            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                flushPendingQty(state);
                sessionStorage.removeItem('userAccount');
                clearCart();
                document.cookie = 'currentUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.cosentino.com';
                window.location = newMenuData.logoutPage;
            });
        });
    }

    // ---------------------
    // Second panel
    // ---------------------
    function openSecondPanel(dropdown, panel, state) {
        const wrapper       = dropdown.querySelector('.dropdown-wrapper');
        const firstWrapper  = dropdown.querySelector('.first-wrapper');
        const secondWrapper = dropdown.querySelector('.second-wrapper-content');
        const comercial     = secondWrapper.querySelector('.user-comercial-container');
        const muestras      = secondWrapper.querySelector('.user-muestras-container');

        if (state.firstWrapperHeight == null) {
            state.firstWrapperHeight = firstWrapper.scrollHeight;
        }

        comercial.style.display = panel === 'comercial' ? 'flex' : 'none';
        muestras.style.display  = panel === 'muestras'  ? 'flex' : 'none';
        const activePanel = panel === 'comercial' ? comercial : muestras;

        gsap.set(secondWrapper, { display: 'flex', xPercent: 100, visibility: 'hidden' });
        const targetHeight = activePanel.scrollHeight;
        gsap.set(secondWrapper, { visibility: 'visible' });

        gsap.set(wrapper, { height: state.firstWrapperHeight });

        gsap.timeline({ defaults: { ease: 'circ.inOut', duration: 0.4 } })
            .to(wrapper,       { height: targetHeight }, 0)
            .to(firstWrapper,  { xPercent: -100 }, 0)
            .to(secondWrapper, { xPercent: 0 }, 0);

        state.activePanel = panel;
    }

    function closeSecondPanel(dropdown, state) {
        const wrapper       = dropdown.querySelector('.dropdown-wrapper');
        const firstWrapper  = dropdown.querySelector('.first-wrapper');
        const secondWrapper = dropdown.querySelector('.second-wrapper-content');

        const targetHeight = state.firstWrapperHeight ?? firstWrapper.scrollHeight;

        gsap.timeline({ defaults: { ease: 'circ.inOut', duration: 0.4 } })
            .to(wrapper,       { height: targetHeight }, 0)
            .to(secondWrapper, { xPercent: 100 }, 0)
            .to(firstWrapper,  { xPercent: 0 }, 0)
            .eventCallback('onComplete', () => {
                gsap.set(secondWrapper, { display: 'none' });
                gsap.set(wrapper, { clearProps: 'height' });
            });

        state.activePanel = null;
    }

    function refreshSecondPanelHeight(dom, state) {
        if (!state.activePanel) return;
        const selector = state.activePanel === 'comercial'
            ? '.user-comercial-container'
            : '.user-muestras-container';

        dom.userDropdowns.forEach(dropdown => {
            const wrapper         = dropdown.querySelector('.dropdown-wrapper');
            const activeContainer = dropdown.querySelector(selector);
            if (!wrapper || !activeContainer) return;
            gsap.to(wrapper, { height: activeContainer.scrollHeight, duration: 0.3, ease: 'circ.inOut' });
        });
    }

    // ---------------------
    // Helpers
    // ---------------------
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str ?? '';
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str ?? '').replace(/"/g, '&quot;');
    }

    function blockItem(item) {
        if (item.querySelector(':scope > .overlay')) return;
        const overlay = document.createElement('div');
        overlay.classList.add('overlay');
        item.appendChild(overlay);
    }

    function unblockItem(item) {
        item.querySelector(':scope > .overlay')?.remove();
    }


    function getCookie(name) {
        return document.cookie.split(';')
            .map(c => c.trim())
            .find(c => c.startsWith(`${name}=`))
            ?.split('=')[1] ?? null;
    }

})();