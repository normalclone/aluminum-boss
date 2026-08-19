class InstantTranslator {

    textBlocks = [];
    currentLanguage = instantTranslatorData.current_language;
    textLanguage = null;

    constructor() {
        console.log('InstantTranslator inicializado');

        /* this.textBlocks = document.querySelectorAll('[translate="yes"]');

        if (this.textBlocks.length > 0) {
            this.getLanguageFromSample(this.textBlocks[0].textContent);
        } */
    }

    async getLanguageFromSample(sample) {        
        const body = new FormData();
        body.append('action', 'can_be_translated');
        body.append('nonce', instantTranslatorData.nonce);
        body.append('sample', sample);

        const response = await fetch(instantTranslatorData.ajax_url, {
            method: 'POST',
            body: body
        });

        if (!response.ok) {
            throw new Error('Error en la petición AJAX');
        }

        const responseData = await response.json();

        return responseData.success ? responseData.data.data.language : null;

        if (responseData.success) {
            console.log('Datos recibidos:', responseData.data);
            this.textLanguage = responseData.data.data.language;

            if (this.textLanguage !== this.currentLanguage) {
                // Hay que mostrar el botón para traducción automática.                
                const translateButtonContainers = document.querySelectorAll('.translate-btn');
                translateButtonContainers.forEach((translateButtonContainer) => {
                    const button = document.createElement('a');
                    button.text = 'Translate';
                    button.href = '#';
                    button.addEventListener('click', async (e) => {
                        e.preventDefault();
                        await this.translateTextBlocks()
                    });
                    translateButtonContainer.append(button);
                });
            }
        } else {
            console.error('Error en la respuesta del servidor');
        }
    }

    async translateText(text) {
        const body = new FormData();
        body.append('action', 'get_translation');
        body.append('nonce', instantTranslatorData.nonce);
        body.append('text', text);
        body.append('language', this.currentLanguage);

        const response = await fetch(instantTranslatorData.ajax_url, {
            method: 'POST',
            body: body,
            signal: AbortSignal.timeout(240000)
        });

        if (!response.ok) {
            throw new Error('Error en la petición AJAX');
        }

        const responseData = await response.json();

        return responseData.success ? responseData.data.data.text : text;

        if (responseData.success) {
            console.log('Datos recibidos:', responseData);
            // Reemplazamos los textos recibidos
            this.textBlocks.forEach((textBlock, index) => {
                textBlock.outerHTML = responseData.data.data.text[index].text;
            });
            const translateButtons = document.querySelectorAll('.translate-btn');
            translateButtons.forEach(translateButton => translateButton.remove());
        } else {
            console.error('Error en la respuesta del servidor para traducciones');
        }
    }

    /* async translateTextBlocks() {
        console.log('Traduciendo los textos');
        const texts = [];
        this.textBlocks.forEach((textBlock) => texts.push(textBlock.outerHTML));
        
        const body = new FormData();
        body.append('action', 'get_translation');
        body.append('nonce', instantTranslatorData.nonce);
        body.append('text', JSON.stringify(texts));
        body.append('language', this.currentLanguage);

        const response = await fetch(instantTranslatorData.ajax_url, {
            method: 'POST',
            body: body
        });

        if (!response.ok) {
            throw new Error('Error en la petición AJAX');
        }

        const responseData = await response.json();

        if (responseData.success) {
            console.log('Datos recibidos:', responseData);
            // Reemplazamos los textos recibidos
            this.textBlocks.forEach((textBlock, index) => {
                textBlock.outerHTML = responseData.data.data.text[index].text;
            });
            const translateButtons = document.querySelectorAll('.translate-btn');
            translateButtons.forEach(translateButton => translateButton.remove());
        } else {
            console.error('Error en la respuesta del servidor para traducciones');
        }
    } */
}

document.addEventListener("DOMContentLoaded", function () {
    // const instantTranslator = new InstantTranslator();
});