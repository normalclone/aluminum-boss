document.addEventListener("DOMContentLoaded", () => {
	const sections = document.querySelectorAll('.section-colores[data-section-colores-id], .section-colores .section-colores__layout[data-section-colores-id]');
	const initializedSections = new Set();

	sections.forEach((layoutElement) => {
		const sectionElement = layoutElement.closest('.section-colores');
		const targetLayout = layoutElement.matches('.section-colores__layout') ? layoutElement : layoutElement.querySelector('.section-colores__layout');

		if (!sectionElement || !targetLayout) {
			return;
		}

		const sectionId = targetLayout.dataset.sectionColoresId;

		if (!sectionId || initializedSections.has(sectionId)) {
			return;
		}

		initializedSections.add(sectionId);
		new ColoresSection(sectionElement, sectionId);
	});
});

class ColoresSection {
	constructor(sectionElement, sectionId) {
		this.sectionElement = sectionElement;
		this.sectionId = sectionId;
		this.sliderElement = sectionElement.querySelector(`#slider-${sectionId}`);
		this.navigationElement = sectionElement.querySelector(`#slider-nav-${sectionId}`);
		this.progressBar = sectionElement.querySelector(`#progress-bar-${sectionId}`);
		this.pageCount = sectionElement.querySelector(`#page-count-${sectionId}`);
		this.dotsContainer = sectionElement.querySelector(`#slider-dots-${sectionId}`);
		this.desktopBrandItems = Array.from(sectionElement.querySelectorAll(`#brands-nav-${sectionId} [data-brand]`));
		this.mobileBrandItems = Array.from(sectionElement.querySelectorAll(`#brands-nav-dropdown-${sectionId} [data-brand]`));
		this.mobileBrandButton = sectionElement.querySelector(`#button-brands-${sectionId}`);
		this.mobileBrandDropdown = sectionElement.querySelector(`#brands-nav-dropdown-${sectionId}`);
		this.allBrandItems = [...this.desktopBrandItems, ...this.mobileBrandItems];
		this.allSlides = Array.from(this.sliderElement?.querySelectorAll('.core-slider__slide') ?? []);
		this.slider = null;
		this.selectedBrand = 'all';
		this.desktopHasSlider = this.sliderElement?.dataset.desktopHasSlider === '1';
		this.desktopPerView = Number.parseFloat(this.sliderElement?.dataset.desktopPerView || this.sliderElement?.dataset.numItems || 3);
		this.laptopPerView = Number.parseFloat(this.sliderElement?.dataset.numItemsLaptop || 3.5);
		this.tabletPerView = Number.parseFloat(this.sliderElement?.dataset.numItemsTablet || 2.1);
		this.mobilePerView = Number.parseFloat(this.sliderElement?.dataset.numItemsMobile || 2.1);
		this.spacingDesktop = Number.parseFloat(this.sliderElement?.dataset.spacing || 16);
		this.spacingTablet = Number.parseFloat(this.sliderElement?.dataset.spacingTablet || 0);
		this.spacingMobile = Number.parseFloat(this.sliderElement?.dataset.spacingMobile || 0);
		this.lgDesktopBreakpoint = 1344;
		this.smTabletBreakpoint = 1024;
		this.resizeHandler = this.handleResize.bind(this);

		if (!this.sliderElement || typeof KeenSlider === 'undefined') {
			return;
		}

		this.bindBrandFilter();
		this.bindMobileDropdown();
		this.applyBrandFilter('all');
		window.addEventListener('resize', this.resizeHandler);
	}

	isDesktop() {
		return window.innerWidth > this.smTabletBreakpoint;
	}

	shouldEnableSlider() {
		if (this.isDesktop()) {
			return this.desktopHasSlider;
		}

		return this.getVisibleSlides().length > 1;
	}

	getVisibleSlides() {
		return this.allSlides.filter((slide) => !slide.classList.contains('d-none'));
	}

	getItemsPerPage() {
		const width = window.innerWidth;
		const perView = width > this.lgDesktopBreakpoint
			? this.desktopPerView
			: (width > this.smTabletBreakpoint ? this.laptopPerView : this.mobilePerView);

		return Math.max(1, Math.floor(perView));
	}

	getSliderOptions() {
		return {
			rubberband: false,
			vertical: false,
			selector: '.core-slider__slide:not(.d-none)',
			mode: 'snap',
			renderMode: 'precision',
			loop: false,
			slides: {
				perView: this.desktopPerView,
				spacing: this.spacingDesktop,
			},
			breakpoints: {
				'(max-width: 1344px)': {
					slides: {
						perView: this.laptopPerView,
						spacing: this.spacingDesktop,
					},
				},
				'(max-width: 1024px)': {
					slides: {
						perView: this.tabletPerView,
						spacing: this.spacingTablet,
					},
				},
				'(max-width: 1024px)': {
					slides: {
						perView: 3.5,
						spacing: this.spacingMobile,
					},
				},
				'(max-width: 430px)': {
					slides: {
						perView: this.mobilePerView,
						spacing: this.spacingMobile,
					},
				},
			},
		};
	}

	bindBrandFilter() {
		this.allBrandItems.forEach((item) => {
			item.addEventListener('click', () => {
				const brand = item.dataset.brand || 'all';
				this.applyBrandFilter(brand);

				if (item.closest('.section-colores__brands-dropdown-menu')) {
					this.closeMobileDropdown();
				}
			});
		});
	}

	bindMobileDropdown() {
		if (!this.mobileBrandButton || !this.mobileBrandDropdown) {
			return;
		}

		this.mobileBrandButton.addEventListener('click', () => {
			if (this.mobileBrandDropdown.classList.contains('d-none')) {
				this.mobileBrandDropdown.classList.remove('d-none');
				this.mobileBrandDropdown.classList.add('dropdown-open');
				this.mobileBrandDropdown.classList.remove('dropdown-close');
			} else {
				this.closeMobileDropdown();
			}
		});
	}

	closeMobileDropdown() {
		if (!this.mobileBrandDropdown || this.mobileBrandDropdown.classList.contains('d-none')) {
			return;
		}

		this.mobileBrandDropdown.classList.remove('dropdown-open');
		this.mobileBrandDropdown.classList.add('dropdown-close');

		setTimeout(() => {
			this.mobileBrandDropdown.classList.add('d-none');
		}, 300);
	}

	applyBrandFilter(brand) {
		this.selectedBrand = brand;

		this.allSlides.forEach((slide) => {
			const matchesBrand = brand === 'all' || slide.dataset.brand === brand;
			slide.classList.toggle('d-none', !matchesBrand);
		});

		this.allBrandItems.forEach((item) => {
			item.classList.toggle('active', item.dataset.brand === brand);
		});

		const selectedLabel = this.allBrandItems.find((item) => item.dataset.brand === brand)?.textContent?.trim() || '';

		if (this.mobileBrandButton && selectedLabel) {
			this.mobileBrandButton.textContent = selectedLabel;
		}

		this.refreshSliderState();
	}

	refreshSliderState() {
		if (this.slider) {
			this.slider.destroy();
			this.slider = null;
		}

		if (this.shouldEnableSlider()) {
			this.enableSlider();
		} else {
			this.disableSlider();
		}
	}

	enableSlider() {
		this.slider = new KeenSlider(this.sliderElement, this.getSliderOptions(), [
			(slider) => {
				this.bindNavigation(slider);
				slider.on('created', () => {
					this.createDots(slider);
					this.updateControls(slider);
				});
				slider.on('slideChanged', () => {
					this.updateControls(slider);
				});
				slider.on('optionsChanged', () => {
					this.createDots(slider);
					this.updateControls(slider);
				});
			},
		]);

		this.sliderElement.classList.remove('section-colores__static-grid');
		this.toggleControls(true);
	}

	disableSlider() {
		this.sliderElement.classList.add('section-colores__static-grid');
		this.toggleControls(false);
		this.clearDots();
		this.updateStaticCounter();
	}

	toggleControls(visible) {
		if (this.navigationElement) {
			this.navigationElement.classList.toggle('d-none', !visible);
			const headerRow = this.navigationElement.closest('.section-colores__header-row');
			if (headerRow) {
				headerRow.classList.toggle('d-none', !visible);
			}
		}

		if (this.dotsContainer) {
			this.dotsContainer.classList.toggle('d-none', visible || this.getVisibleSlides().length <= 1);
		}
	}

	bindNavigation(slider) {
		if (!this.navigationElement) {
			return;
		}

		const leftArrow = this.navigationElement.querySelector('.arrow-link__left');
		const rightArrow = this.navigationElement.querySelector('.arrow-link__right');

		if (leftArrow) {
			leftArrow.onclick = () => this.moveToAdjacentPage(slider, -1);
		}

		if (rightArrow) {
			rightArrow.onclick = () => this.moveToAdjacentPage(slider, 1);
		}
	}

	getStepInfo(slider) {
		const totalSlides = this.getVisibleSlides().length;
		const itemsPerPage = this.getItemsPerPage();
		const totalPages = Math.max(Math.ceil(totalSlides / itemsPerPage), 1);

		if (!slider?.track?.details) {
			return { current: 1, total: totalPages, pageStarts: [0] };
		}

		const maxIdx = Math.max(Math.floor(slider.track.details.maxIdx ?? 0), 0);
		const pageStarts = Array.from({ length: totalPages }, (_, index) => {
			return Math.min(index * itemsPerPage, maxIdx);
		}).filter((start, index, array) => index === 0 || start !== array[index - 1]);

		const currentIndex = Math.max(Math.round(slider.track.details.rel ?? 0), 0);
		let currentPageIndex = 0;

		pageStarts.forEach((start, index) => {
			if (currentIndex >= start) {
				currentPageIndex = index;
			}
		});

		return {
			current: currentPageIndex + 1,
			total: pageStarts.length || 1,
			pageStarts,
		};
	}

	moveToAdjacentPage(slider, direction) {
		const { current, total, pageStarts } = this.getStepInfo(slider);
		const targetPageIndex = Math.min(Math.max((current - 1) + direction, 0), total - 1);
		const targetIndex = pageStarts[targetPageIndex] ?? 0;

		slider.moveToIdx(targetIndex);
	}

	updateControls(slider) {
		this.updateArrows(slider);
		this.updateProgress(slider);
		this.updatePageCount(slider);
		this.updateDots(slider);
	}

	updateArrows(slider) {
		if (!this.navigationElement) {
			return;
		}

		const leftArrow = this.navigationElement.querySelector('.arrow-link__left');
		const rightArrow = this.navigationElement.querySelector('.arrow-link__right');
		const { current, total } = this.getStepInfo(slider);

		if (leftArrow) {
			leftArrow.style.opacity = current === 1 ? 0.3 : 1;
		}

		if (rightArrow) {
			rightArrow.style.opacity = current >= total ? 0.3 : 1;
		}
	}

	updateProgress(slider) {
		if (!this.progressBar) {
			return;
		}

		const { current, total } = this.getStepInfo(slider);
		const progress = total > 0 ? (current / total) * 100 : 0;

		this.progressBar.style.width = `${progress}%`;
	}

	updatePageCount(slider) {
		if (!this.pageCount) {
			return;
		}

		const { current, total } = this.getStepInfo(slider);
		this.pageCount.textContent = `${String(current).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
	}

	createDots(slider) {
		if (!this.dotsContainer || this.isDesktop()) {
			this.clearDots();
			return;
		}

		const { total, pageStarts } = this.getStepInfo(slider);
		this.dotsContainer.innerHTML = '';

		if (total <= 1) {
			return;
		}

		const dots = document.createElement('div');
		dots.classList.add('core-slider__dots');

		pageStarts.forEach((start, index) => {
			const dot = document.createElement('div');
			dot.classList.add('core-slider__dots__dot');
			dot.addEventListener('click', () => slider.moveToIdx(start));
			dots.appendChild(dot);
		});

		this.dotsContainer.appendChild(dots);
	}

	updateDots(slider) {
		if (!this.dotsContainer || this.isDesktop()) {
			return;
		}

		const dots = this.dotsContainer.querySelector('.core-slider__dots');
		if (!dots) {
			return;
		}

		const { current } = this.getStepInfo(slider);

		Array.from(dots.children).forEach((dot, index) => {
			dot.classList.toggle('active', index === current - 1);
		});
	}

	clearDots() {
		if (this.dotsContainer) {
			this.dotsContainer.innerHTML = '';
		}
	}

	updateStaticCounter() {
		if (!this.pageCount) {
			return;
		}

		const visibleSlides = this.getVisibleSlides().length;
		const total = visibleSlides > 0 ? 1 : 0;
		this.pageCount.textContent = `${String(total).padStart(2, '0')}/${String(total).padStart(2, '0')}`;

		if (this.progressBar) {
			this.progressBar.style.width = total > 0 ? '100%' : '0%';
		}
	}

	handleResize() {
		this.refreshSliderState();
	}
}