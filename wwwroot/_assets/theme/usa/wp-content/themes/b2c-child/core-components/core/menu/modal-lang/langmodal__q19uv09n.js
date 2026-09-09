(() => {

    // Default language isocode per isocountry (for countries with multiple languages)
    const COUNTRY_DEFAULT_LANG = {
        'be': 'nl-be',   // Belgium     — Dutch   ~60%
        'ca': 'en-ca',   // Canada      — English ~75%
        'ch': 'de-ch',   // Switzerland — German  ~63%
    };

    // Override de la etiqueta de idioma mostrada (no cambia la URL/destino)
    const LANG_LABEL_OVERRIDE = {
        'he-il': 'English',   // Israel — mostrar "English" en vez de "Hebrew"
    };

    let _dom   = null;
    let _state = null;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        _dom = getDOM();
        if (!_dom) return;

        _state = {
            selectedContinent: null,
            selectedCountry: null,
        };

        initSelect2(_dom);
        initEvents(_dom, _state);
        document.getElementById('lang_form')?.classList.add('is-loading');
    }

    // Llamado por menu.js tras recibir la respuesta AJAX con los datos de países
    window.langModalInit = function(localeData, continentLabels) {
        if (!_dom) return;
        window.localeData = localeData;
        document.getElementById('lang_form')?.classList.remove('is-loading');
        buildContinentOptions(_dom, continentLabels);
        preselectFromCookie(_dom);
    };

    // ---------------------
    // DOM
    // ---------------------
    function getDOM() {
        const modal = document.getElementById('languagesModal');
        if (!modal) return null;

        const continent         = $('#continent');
        const country           = $('#modal-country');
        const language          = $('#language');
        const ContinueBtn       = $('#modal-action-btn');
        const rememberCheckbox  = $('#checkbox');

        if (!continent.length || !country.length || !language.length ||
            !rememberCheckbox.length || !ContinueBtn.length ) return null;

        return { modal, continent, country, language, ContinueBtn, rememberCheckbox };
    }

    // ---------------------
    // Plugins
    // ---------------------
    function initSelect2(dom) {

        dom.continent.select2({ 
            placeholder: coreLangModalData.placeholder_continent,
            width: '100%',
            dropdownParent: dom.continent.parent() 
        });
        dom.country.select2({ 
            placeholder: coreLangModalData.placeholder_country,
            width: '100%',
            dropdownParent: dom.country.parent() 
        });
        dom.language.select2({ 
            placeholder: coreLangModalData.placeholder_language,
            width: '100%',
            dropdownParent: dom.language.parent() 
        });

    }

    // ---------------------
    // Eventos
    // ---------------------
    function initEvents(dom, state) {
        dom.continent.on('change', () => onContinentChange(dom, state));
        dom.country.on('change',   () => onCountryChange(dom, state));
        dom.ContinueBtn.on('click', () => onClickContinue(dom, state));

        // Escuchar el evento de cierre disparado por menu.js
        document.getElementById('languagesModal').addEventListener('modal:closed', () => {
            resetModal(state);
        });
    }

    // ---------------------
    // Handlers
    // ---------------------
    function onContinentChange(dom, state) {
        const continent = dom.continent.val();
        state.selectedContinent = continent;
        state.selectedCountry = null;

        resetSelect(dom.country);
        resetSelect(dom.language);

        if (!continent || !window.localeData) return;

        // Internacional — bloquear selects con valores fijos
        if (continent === '0_International') {
            dom.country
                .append(new Option('International', 'int'))
                .val('int')
                .prop('disabled', true)
                .trigger('change');

            dom.language
                .append(new Option('EN', window.localeData['0_International']?.['int']?.items?.[0]?.url ?? '/'))
                .val(window.localeData['0_International']?.['int']?.items?.[0]?.url ?? '/')
                .prop('disabled', true)
                .trigger('change');

            state.selectedCountry = 'int';
            return;
        }

        if (!window.localeData[continent]) return;
        populateCountries(dom, continent);
    }

    function onCountryChange(dom, state) {
        const countryCode = dom.country.val();
        state.selectedCountry = countryCode;

        resetSelect(dom.language);

        if (!window.localeData) return;

        const data = window.localeData[state.selectedContinent]?.[countryCode];
        if (!countryCode || !data) return;

        populateLanguages(dom, state.selectedContinent, countryCode);
    }

    function onClickContinue(dom, state) {
        let languageUrl = dom.language.val();

        if (!languageUrl) return;

        // GTM tracking
        const isRemembered  = dom.rememberCheckbox.is(':checked');
        const isInternational = state.selectedContinent === '0_International';
        const clickAction   = isInternational
            ? 'internacional_english'
            : (window.localeData?.[state.selectedContinent]?.[state.selectedCountry]?.name ?? '') + '_' + dom.language.find('option:selected').text();

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event:        'click',
            type:         'remember-selection_' + (isRemembered ? 'yes' : 'no'),
            click_type:   'button',
            click_action: clickAction,
        });

        if (dom.rememberCheckbox.is(':checked')) {
            setCookie('nav_locale', languageUrl, 30);
        }

        // Si va a international, añadir parámetro para evitar redirección
        if (state.selectedContinent === '0_International') {
            const separator = languageUrl.includes('?') ? '&' : '?';
            languageUrl = languageUrl + separator + 'int=1';
        }

        window.location.href = languageUrl;
    }

    // ---------------------
    // Preselección desde cookie
    // ---------------------
    function preselectFromCookie(dom) {
        const savedUrl = getCookie('nav_locale');
        if (!savedUrl) return;

        for (const continent of Object.keys(window.localeData)) {
            const countries = window.localeData[continent];

            for (const countryCode of Object.keys(countries)) {
                const match = countries[countryCode].items?.find(l => l.url === savedUrl);

                if (match) {
                    dom.continent.val(continent).trigger('change');
                    setTimeout(() => {
                        dom.country.val(countryCode).trigger('change');
                        setTimeout(() => dom.language.val(savedUrl).trigger('change'), 200);
                    }, 200);
                    return; // encontrado, salimos
                }
            }
        }
    }

    // ---------------------
    // Populate
    // ---------------------
    function buildContinentOptions(dom, labels) {
        dom.continent.empty().append('<option value=""></option>');
        Object.entries(labels).forEach(([value, label]) => {
            dom.continent.append(new Option(label, value));
        });
        dom.continent.select2('destroy').select2({
            placeholder: coreLangModalData.placeholder_continent,
            width: '100%',
            dropdownParent: dom.continent.parent(),
        });
    }

    function populateCountries(dom, continent) {
        const countries = window.localeData[continent];
        Object.keys(countries).forEach(code => {
            dom.country.append(new Option(countries[code].name, code));
        });
        dom.country.prop('disabled', false).trigger('change');
    }

    function populateLanguages(dom, continent, countryCode) {
        const languages = window.localeData[continent][countryCode].items;

        if (!languages?.length) return;

        languages.forEach(lang => {
            const label = LANG_LABEL_OVERRIDE[lang.isocode?.toLowerCase()] ?? lang.language;
            dom.language.append(new Option(label, lang.url));
        });

        const onlyOne = languages.length === 1;

        let defaultUrl = languages[0].url;
        if (!onlyOne && COUNTRY_DEFAULT_LANG[countryCode]) {
            const match = languages.find(l => l.isocode.toLowerCase() === COUNTRY_DEFAULT_LANG[countryCode]);
            if (match) defaultUrl = match.url;
        }

        dom.language
            .val(defaultUrl)
            .prop('disabled', onlyOne)
            .trigger('change');
    }

    // ---------------------
    // Helpers
    // ---------------------
    function resetSelect(select) {
        select.empty()
            .append('<option value=""></option>')
            .prop('disabled', true)
            .trigger('change');
    }

    function setCookie(name, value, days) {
        const decodedValue = decodeURIComponent(value); 
        const expires = days
            ? `; expires=${new Date(Date.now() + days * 864e5).toUTCString()}`
            : '';
        document.cookie = `${name}=${decodedValue}${expires}; path=/`;
    }

    function getCookie(name) {
        return document.cookie.split(';')
            .map(c => c.trim())
            .find(c => c.startsWith(`${name}=`))
            ?.split('=')[1] ?? null;
    }

    function resetModal(state) {
        state.selectedContinent = null;
        state.selectedCountry = null;

        $('#continent').val(null).trigger('change');
        $('#modal-country').empty().append('<option value=""></option>').prop('disabled', true).trigger('change');
        $('#language').empty().append('<option value=""></option>').prop('disabled', true).trigger('change');
    }

})();