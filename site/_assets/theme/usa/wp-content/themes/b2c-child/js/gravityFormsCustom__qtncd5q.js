const countriesWithoutPostalCode = [
	// "AD",
	"AO",
	"AE",
	"AG",
	"AQ",
	"AI",
	"AL",
	"AW",
	"BS",
	"BZ",
	"BJ",
	"Plurinational State",
	"Ascension and Tristan da Cunha",
	"BF",
	"BI",
	"CM",
	"CF",
	"KM",
	"CD",
	"CM",
	"CK",
	"CI",
	"DJ",
	"DM",
	"TP",
	"GQ",
	"ER",
	"FJ",
	"TF",
	"GM",
	"GH",
	"GD",
	"GF",
	"HM",
	"HK",
	"IL",
	"KI",
	"LY",
	"LR",
	"MO",
	"MW",
	"ML",
	"MR",
	"MU",
	"NR",
	"AN",
	"NU",
	"KP",
	"KR",
	"QA",
	"RW",
	"KN",
	"ST",
	"SC",
	"SL",
	"SB",
	"SR",
	"SY",
	"TP",
	"TG",
	"TK",
	"TO",
	"TV",
	"UG",
	"AE",
	"VU",
	"YE",
	"ZW",
];

// Mapeamos cada nombre administrativo de campo(gf), con su UTM correspondiente
const utmFormFieldMap = {
	'Ad_Name__c': 'utm_content',
	'Campaign_Name__c': 'utm_campaign',
	'utm_medium__c': 'utm_medium',
	'utm_source__c': 'utm_source',
	'Ad_Set_Name__c': 'utm_term',
	'GCLID__c': 'gclid'
};


// 1. Inicialización de eventos: email, country, zipcode
document.addEventListener("DOMContentLoaded", initializeGravityForms);

function initializeGravityForms() {
    let forms = document.querySelectorAll('form[id^=gform_]');

	if (forms.length === 0) {
		return;
	}

    for (const form of forms) {

        initializeForm(form.id);

        $(document).on('gform_post_render', (e, formId) => {
            if (form.id == `gform_${formId}`) {
                console.log(`Renderizando el formulario ${formId}`);

				initializeForm(form.id);

				const newForm = document.querySelector(`#${form.id}`);
				const countrySelect = newForm.querySelector('.country-field select');
				if (!countrySelect)
					return;

				if (countrySelect.value !== '') {
					countrySelect.dispatchEvent(new Event('change'));
				}
            }
        });
    }
}

function initializeForm(formId) {

	const form = document.querySelector(`#${formId}`);

	// Añadimos un campo para controlar la validez del código postal
	const div = document.createElement('div');
	div.innerHTML = '<input class="zipselected-field" type="hidden" name="postalcode_selected" />';
	const hiddenField = div.firstElementChild;
	form.append(hiddenField);

	// Seleccionamos el campo select
	const selectTag = form.querySelector(".ctop-register-form-country select");

	// Comprobamos que sea true el selector
	if(selectTag) {

		// Almacenamos en una constante el html lang
		const htmlLang = document.documentElement.lang.toLowerCase();

		switch (htmlLang) {
			// Reino unido
			case 'en-gb':
			selectTag.value = 'GB';
			selectTag.selected = 'selected';
				break;
			// España
			case 'es':
			selectTag.value = 'ES';
			selectTag.selected = 'selected';
				break;
			// Francia
			case 'fr-fr':
			selectTag.value = 'FR';
			selectTag.selected = 'selected';
				break;
			// Canada
			case 'en-ca':
			selectTag.value = 'CA';
			selectTag.selected = 'selected';
				break;
			// Canada
			case 'fr-ca':
			selectTag.value = 'CA';
			selectTag.selected = 'selected';
				break;
			// Estados unidos
			case 'en-us':
			selectTag.value = 'US';
			selectTag.selected = 'selected';
				break;
			// Singapore
			case 'en-sg':
			selectTag.value = 'SG';
			selectTag.selected = 'selected';
				break;
			// Belgica
			case 'nl-be':
			selectTag.value = 'BE';
			selectTag.selected = 'selected';
				break;
			// Belgica
			case 'fr-be':
			selectTag.value = 'BE';
			selectTag.selected = 'selected';
				break;
			// Suecia
			case 'sv-se':
			selectTag.value = 'SE';
			selectTag.selected = 'selected';
				break;
			// Italia
			case 'it-it':
			selectTag.value = 'IT';
			selectTag.selected = 'selected';
				break;
			// Alemania
			case 'de-de':
			selectTag.value = 'DE';
			selectTag.selected = 'selected';
				break;
			// Nederland
			case 'nl-nl':
			selectTag.value = 'NL';
			selectTag.selected = 'selected';
				break;
			// Polonia
			case 'pl-pl':
			selectTag.value = 'PL';
			selectTag.selected = 'selected';
				break;
			// Israel
			case 'he-il':
			selectTag.value = 'IL';
			selectTag.selected = 'selected';
				break;
			// Portugal
			case 'pt-pt':
			selectTag.value = 'PT';
			selectTag.selected = 'selected';
				break;
			// Austria
			case 'de-at':
			selectTag.value = 'AT';
			selectTag.selected = 'selected';
				break;
			// Australia
			case 'en-au':
			selectTag.value = 'AU';
			selectTag.selected = 'selected';
				break;
			// Brazil
			case 'pt-br':
			selectTag.value = 'BR';
			selectTag.selected = 'selected';
				break;

			default:
				selectTag.value = '';
				break;
		}
	}

    // Se establecen los valores de UTMs
    gformAddUtmParams(form);

    // Buscamos si hay un campo de email
    // Los campos de email están contenidos en una clase .ginput_container_email por lo que se obtienen de ahí
    const inputEmail = form.querySelector('.ginput_container_email input');
    if (inputEmail) {
        inputEmail.removeEventListener('change', emailValidator);
        inputEmail.addEventListener('change', emailValidator);
    }

	// Buscamos si hay un campo de teléfono
	// Los campos de teléfono están contenidos en una clase .ginput_container_phone por lo que se obtienen de ahí
	const inputPhone = form.querySelector('.ginput_container_phone input');
	if (inputPhone) {
		inputPhone.removeEventListener('change', phoneValidator);
		inputPhone.addEventListener('change', phoneValidator);
	}

    // Ahora se inicializa el selector de país
    const countrySelector = form.querySelector('.country-field select');
	if (countrySelector) {
		// Marcamos por defecto el país, en caso de no haber ya uno seleccionado
		if (countrySelector.value === '') {
			// Obtenemos el pais del usuario a partir de la configuración de su navegador
			const countryCode = navigator.language.slice(0, 2);
			console.log(countryCode);
			countrySelector.value = countryCode.toLowerCase();
		}

        countrySelector.removeEventListener('change', selectCountry);
        countrySelector.addEventListener('change', selectCountry);
    }
}

// Validación de teléfono usando libphonenumber-js
function phoneValidator(e) {
	let valuePhone = e.target.value;
	let form = e.target.closest('form');
	const phoneField = e.target;
	// Usar el contenedor .gfield (padre de .ginput_container_phone) si existe, si no, usar .ginput_container_phone
	let fieldContainer = phoneField.closest('.gfield');
	if (!fieldContainer) {
		fieldContainer = phoneField.closest('.ginput_container_phone');
	}

	// Elimina mensaje de error previo
	if (fieldContainer && fieldContainer.classList.contains('gfield_error')) {
		fieldContainer.classList.remove('gfield_error');
		let validatorMessage = fieldContainer.querySelector('.gfield_validation_message');
		if (validatorMessage) fieldContainer.removeChild(validatorMessage);
	}

	let isValid = true;
	if (valuePhone.trim() === '') {
		isValid = false;
	} else {
		try {
			const parsePhoneNumberFn = window.libphonenumber && window.libphonenumber.parsePhoneNumber;
			// Si existe el campo país, es obligatorio elegirlo
			const countrySelect = form.querySelector('.country-field select');
			let phoneNumber;
			// Siempre validamos con el país seleccionado
			if (!countrySelect || !countrySelect.value) {
				isValid = false;
			} else {
				phoneNumber = parsePhoneNumberFn ? parsePhoneNumberFn(valuePhone, countrySelect.value.toUpperCase()) : null;
				isValid = phoneNumber && phoneNumber.isValid && phoneNumber.isValid();
			}
		} catch (error) {
			isValid = false;
		}
	}

	if (!isValid) {
		if (fieldContainer && !fieldContainer.classList.contains('gfield_error')) {
			fieldContainer.classList.add('gfield_error');
		}
		// Mensaje de error visual para teléfono
		let errorMessage = gravityData.phoneMessage;
		if (!fieldContainer.querySelector('.gfield_validation_message')) {
			let errorBox = document.createElement('div');
			errorBox.className = 'gfield_description validation_message gfield_validation_message';
			errorBox.textContent = errorMessage;
			fieldContainer.appendChild(errorBox);
		}
	}
}

function selectCountry(e) {
    let form = e.target.closest('form');
    let country = e.target.value;
    let zipcodeContainer = form.querySelector('.zipcode-field');
	if (zipcodeContainer == null) return;
    let zipcodeInput = zipcodeContainer.querySelector('input');

    // Se comprueba si el país seleccionado tiene códigos postales. Si no los tiene, se oculta el campo para el código postal
    if (countriesWithoutPostalCode.includes(country.toUpperCase())) {
        zipcodeContainer.classList.add('d-none');
        zipcodeInput.value = '00000';
    } else {
        zipcodeContainer.classList.remove('d-none');
        zipcodeInput.value = '';
    }

    configureZipcodeInput(zipcodeInput, country);

	// Validar teléfono al cambiar país
	const inputPhone = form.querySelector('.ginput_container_phone input');
	if (inputPhone && inputPhone.value.trim() !== '') {
		// Simula un evento para reutilizar phoneValidator
		phoneValidator({ target: inputPhone });
	}
}

function configureZipcodeInput(input, country) {
    console.log(input, country);

    const hiddenField = input.closest('form').querySelector('input[name=postalcode_selected]');

    if (
        typeof woosmap === "object" &&
        typeof woosmap.localities === "object"
    ) {
        if (input.classList.contains('localities-input')) {
            input.autocompleteObject.setOptions({
				types: 'postal_code',
				components: {
					country: country
				},
				data: 'advanced'
			});
            const localitiesContainer = document.querySelectorAll('.localities-container');
			if (localitiesContainer.length > 0) {
				for (const locCont of localitiesContainer) {
					locCont.innerHTML = '';
				}
            }
        } else {
            input.autocompleteObject = new woosmap.localities.Autocomplete(
                input.id,
                {
                    types: 'postal_code',
                    components: {
                        country: country
                    },
                    data: 'advanced'
                }
            );

            // Asignamos manejador del evento de selección del código postal
            input.autocompleteObject.addListener("selected_suggestion", function (e) {
                let fieldContainer = input.closest('.zipcode-field');
                fieldContainer.classList.remove('gfield_error');
                let validatorMessage = fieldContainer.querySelector('.gfield_validation_message');
                if (validatorMessage) {
                    fieldContainer.removeChild(validatorMessage);
                }

                let postalCode = input.autocompleteObject.getSelectedSuggestionDetails();
                //input.value = postalCode.name;

                hiddenField.value = postalCode.name;
            });

			input.addEventListener("keydown", function (e) {
				const hiddenField = e.target.closest('form').querySelector('input[name=postalcode_selected]');
                hiddenField.value='';
            });

            input.addEventListener('change', (e) => {
                validatePostalCode(e.target.closest('form'));
            })
        }
    }
}

function emailValidator(e) {
    let valueEmail = e.target.value;
    let form = e.target.closest('form');

    if (valueEmail.trim() !== '' && form) {
        validateEmail(form, valueEmail);
    }
}

/**
 * * Funcion para rellenar los Campos UTMs a partir de la Cookie initialTrafficSource
 *
 * @param {Objec} form Objeto formulario
 */
function gformAddUtmParams(form) {
	for(let utmMap of Object.entries(utmFormFieldMap)){
		// Si encontramos el campo en el Formulario que hemos Mapeado en utmFormFieldMap
		if (form.querySelector("." + utmMap[0])){
			// Obtenemos el contenedor y el imput
			let inputContainer = form.querySelector("." + utmMap[0]);
			let input = inputContainer.querySelector("input");
			// Si el valor esta vacio porque no se ha rellenado por url
			// Entonces le asignamos el valor del parametro de la cookie
			input.value = input.value ? input.value : getUtmParam(utmMap[1]);

			// Para debug
			// console.log("Esta " + utmMap[0] + " en form id: " + form.id );
			// console.log(input);
			// console.log(input.value);
		}
	}
}

/**
 * * Funcion para obtener los parametros de cookie initialTrafficSource
 * * utmcid   - (utm_id)		- lookup table id
 * * utmcsr   - (utm_source)	- campaign source
 * * utmccn   - (utm_campaign) 	- campaign name
 * * utmcmd   - (utm_medium)	- campaign medium
 * * utmctr   - (utm_term)	 	- keywords
 * * utmcct   - (utm_content)	- ad content description
 * * utmgclid - (gclid)			- google ad click id
 *
 * * En la cookie vienen en este orden : utmcid=one|utmcsr=two|utmgclid=three|utmccn=four|utmcmd=five|utmctr=six|utmcct=seven
 *
 * @param {String} utmParam Parametro que de la cookie que se quiere obtener
 */
function getUtmParam(utmParam) {
	// Obtenemos la cookie initialTrafficSource
	let utmCookieJson = {};
	let utmPairs = null;
	let	utmSelected = '';
	let utmCookie = getCookie('initialTrafficSource');

	if (utmCookie) {
		utmPairs = utmCookie.split("|");
		// Iteramos en cada par par formar el Objeto
		for (let utmPair of utmPairs ) {
			const part = utmPair.split("=");
			utmCookieJson[part[0]] = part[1];
		}
	}

	// Devolvemos el parametro indicado, ya sea por el nombre del parametro en la cookie, o el de url
	switch (utmParam) {
		case 'utmcid':
		case 'utm_id':
			utmSelected = utmCookieJson.utmcid ? utmCookieJson.utmcid : '';
			break;

		case 'utmcsr':
		case 'utm_source':
			utmSelected = utmCookieJson.utmcsr ? utmCookieJson.utmcsr : '';
			break;

		case 'utmccn':
		case 'utm_campaign':
			utmSelected = utmCookieJson.utmccn ? utmCookieJson.utmccn : '';
			break;

		case 'utmcmd':
		case 'utm_medium':
			utmSelected = utmCookieJson.utmcmd ? utmCookieJson.utmcmd : '';
			break;

		case 'utmctr':
		case 'utm_term':
			utmSelected = utmCookieJson.utmctr ? utmCookieJson.utmctr : '';
			break;

		case 'utmcct':
		case 'utm_content':
			utmSelected = utmCookieJson.utmcct ? utmCookieJson.utmcct : '';
			break;

		case 'utmgclid':
		case 'gclid':
			utmSelected = utmCookieJson.utmgclid ? utmCookieJson.utmgclid : '';
			break;

		default:
			console.log('No has especificado un parametro UTM correcto');
			break;
	}

	return utmSelected;
}

/**
 * Comprueba si la dirección de correo electrónico es válida y, si lo es, no hace nada.
 * Si no es válida, borra el campo de correo electrónico.
 * @param form - Formulario que se valida
 * @param email - the email address to validate
 */
async function validateEmail(form, email) {
    let emailField = form.querySelector('.ginput_container_email input');

    // Country dispone de códigos postales => lanzamos llamada a API para validar country+zip

    try {
        let r = await getRemoteEmailData(email);
        if(r.success) {

        } else {
            emailField.value = '';
        }

		checkEmailMessage(form.id);

    }catch(e) {

    }
}

/**
 * Obtenemos info sobre email introducido
 *
 * @param {*} email
 * @returns
 */
function getRemoteEmailData(email) {

    let params = {
		action:'email_validation',
		email:email,
		security: gravityData.securize,
	};

    return jQuery.ajax({
        'url':  gravityData.ajax_url,
        'type':'post',
        'data': params,
    });
}


/**
 * Gestionamos mensaje de error de campo email
 * @param {*} formId - ID del formulario que se valida
 */
function checkEmailMessage(formId) {

    let form = document.querySelector(`#${formId}`);
    let fieldContainer = form.querySelector('.ginput_container_email');
	let $container = $(fieldContainer);

	let $input = $container.find('input');

	// Eliminamos mensaje de error y luego comprobamos si se añade de nuevo
	if (fieldContainer.classList.contains('gfield_error')) {
		fieldContainer.classList.remove('gfield_error');
		let  validatorMessage = fieldContainer.querySelector('.gfield_validation_message');
		fieldContainer.removeChild(validatorMessage);
	}

	// Si campo vacio => ERROR
	if($input.val() == '') {

		let errorMessage = '';
		if (typeof cosContactx3Data !== 'undefined') {
			errorMessage = cosContactx3Data.emailMessage;
		}
		if (typeof gravityData !== 'undefined')  {
			errorMessage = gravityData.emailMessage;
		}

		if (!$container.hasClass('gfield_error')) {
			$container.addClass('gfield_error');
			let errorBox = 	'<div class="gfield_description validation_message gfield_validation_message">' + errorMessage + '</div>';
			$container.append(errorBox);
		}

	}

}

/**
 * Comprueba si el código postal es válido para el país seleccionado
 * @param form - ID del formulario que se valida
 */
async function validatePostalCode(form) {

	let $form = $(form);

	let countrySelected = $form.find('.country-field SELECT')[0].value.toUpperCase();
	let postalCode = $form.find('.zipcode-field INPUT');

	const postalSelectedField = document.querySelector("input[name=postalcode_selected]");

    // Country dispone de códigos postales => lanzamos llamada a API para validar country+zip
    try {
        let r = await getRemotePostalCodeData(countrySelected,postalCode);
        if(r.success) {
            if(r.num_items > 0) {
                postalSelectedField.value = postalCode;
            }else{
                postalSelectedField.value = '';
            }
        }else{
            postalSelectedField.value = postalCode;
        }
		checkPostalCodeMessage(form);
    }catch(e) {
        // console.log(e);
        postalSelectedField.value = '';
		checkPostalCodeMessage(form);
    }
}

/**
 * Comprueba la validez del código postal usando como base el campo oculto postalcode_selected
 * @param form - ID del formulario que se valida
 */
function checkPostalCodeMessage(form) {

	let $form = $(form);
    let fieldContainer = form.querySelector('.zipcode-field');
	let $postalSelectedField = document.querySelector("input[name=postalcode_selected]");
	let $postalField = $form.find('.zipcode-field INPUT');

	// Eliminamos mensaje de error y luego comprobamos si se añade de nuevo
	if (fieldContainer.classList.contains('gfield_error')) {
		fieldContainer.classList.remove('gfield_error');
		var validatorMessage = fieldContainer.querySelector('.gfield_validation_message');
		fieldContainer.removeChild(validatorMessage);
	}

	if ($postalSelectedField.value!='') {
		// console.log('Código postal válido');
	} else {
		// Obtenemos mensaje de error<
		let errorMessage = '';
		if (typeof cosContactx3Data !== 'undefined') {
			errorMessage = cosContactx3Data.zipcodeMessage;
		}
		if (typeof gravityData !== 'undefined')  {
			errorMessage = gravityData.zipcodeMessage;
		}

		if (!fieldContainer.classList.contains('gfield_error')) {
			fieldContainer.classList.add('gfield_error');
			var fieldErrorContainer ='<div class="gfield_description validation_message gfield_validation_message">' + errorMessage + '</div>';
			fieldContainer.insertAdjacentHTML("beforeend", fieldErrorContainer);
		}

		// console.log(fieldContainer);

		// if (fieldContainer.classList.contains('gfield_error') && ($postalSelectedField.value!='')) {
		// 	fieldContainer.classList.remove('gfield_error');
		// }

		// Si error => dejamos input código postal vacio para obligar a introducirlo y forzar error en gravity
		$postalField[0].value = '';
	}
}

// CP limpio
document.addEventListener('pointerdown', function (e) {
    const submitBtn = e.target.closest(
        'form[id^="gform_"] button[type="submit"], form[id^="gform_"] input[type="submit"]'
    );
    if (!submitBtn) return;

    const form = submitBtn.closest('form');
    if (!form) return;

    const zipInput = form.querySelector('.localities-input') || form.querySelector('.zipcode-field input[type="text"]');
    const zipSelected = form.querySelector('input[name="postalcode_selected"]');

    if (!zipInput || !zipSelected) return;

    const cp = (zipSelected.value || '').trim();
    if (!cp) return;

    const visualValue = zipInput.value;

    zipInput.value = cp;

    setTimeout(() => {
        if (document.body.contains(zipInput)) {
            zipInput.value = visualValue;
        }
    }, 250);
}, true);

// gtm-label para formularios B2B
document.addEventListener('DOMContentLoaded', function () {
    const formClasses = [
        'professional_contact_form',
        'register_ctop_form',
        'register_we_marmolistas_form',
        'register_we_tiendas_form',
        'register_we_instaladores_form',
        'register_we_arquitectos_form'
    ];
    
    const selector = formClasses
        .map(cls => `.${cls} input, .${cls} textarea, .${cls} select`)
        .join(', ');

    document.querySelectorAll(selector).forEach(field => {
        field.setAttribute('gtm-label', 'b2b-form-field');
    });
});

// Push al dataLayer para formularios B2B
(function () {
    const formClasses = [
        'professional_contact_form',
        'register_ctop_form',
        'register_we_marmolistas_form',
        'register_we_tiendas_form',
        'register_we_instaladores_form',
        'register_we_arquitectos_form'
    ];

    const jobTitleValues = {};

    // Capturar cambios en el select Job_Title__c de cualquier formulario listado
    document.addEventListener('change', function (e) {
        const select = e.target.closest('.Job_Title__c select');
        if (!select) return;

        const form = e.target.closest(formClasses.map(cls => `.${cls}`).join(','));
        if (!form) return;

        const formClass = formClasses.find(cls => form.classList.contains(cls));
        if (!formClass) return;

        jobTitleValues[formClass] = select.value || 'not available';
    });

    // Escuchar la confirmación de Gravity Forms
    jQuery(document).on('gform_confirmation_loaded', function (event, formId) {
        const confirmation = document.getElementById('gform_confirmation_wrapper_' + formId);
        if (!confirmation) return;

        const matchedClass = formClasses.find(cls => confirmation.classList.contains(cls));
        if (!matchedClass) return;

        const formType = matchedClass === 'professional_contact_form' ? 'embed' : 'sign-up-to-we';

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: 'lead_b2b',
            step: 'submit',
            form_type: formType,
            form_option: jobTitleValues[matchedClass] || 'not available'
        });
    });
})();