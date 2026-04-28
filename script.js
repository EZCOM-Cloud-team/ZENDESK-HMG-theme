(function () {
	"use strict";

	ready(function () {
		// Restore focus after page reload
		var returnFocusTo = sessionStorage.getItem("returnFocusTo");
		if (returnFocusTo) {
			sessionStorage.removeItem("returnFocusTo");
			var returnFocusToEl = document.querySelector(returnFocusTo);
			returnFocusToEl && returnFocusToEl.focus && returnFocusToEl.focus();
		}

		// Render inline micro-templates
		each('[data-element="template"]', function (el) {
			if (el.hasAttribute("data-template")) {
				Util.renderTemplate(el, el.getAttribute("data-template"));
			}
		});

		/**
		 * Converts HTML links within a given element into objects.
		 * @param el
		 * @returns {[]}
		 */
		var convertLinksToObjects = function (el) {
			return Array.prototype.map.call(el.querySelectorAll("a"), function (a) {
				return { title: a.innerText, html_url: a.href };
			});
		};

		// Render Zendesk helper micro-templates
		// @see https://developer.zendesk.com/documentation/help_center/help-center-templates/helpers/
		var supportedHelpers = [
			"breadcrumbs",
			"recent-articles",
			"related-articles",
			"recent-activity",
			"share"
		];
		supportedHelpers.forEach(function (helper) {
			each('[data-element="' + helper + '"]', function (el) {
				if (el.hasAttribute("data-template")) {
					var data = {};

					// Breadcrumb helper data
					if (helper === "breadcrumbs") {
						data = { breadcrumbs: convertLinksToObjects(el) };
					}

					// Recent and related articles helper data
					else if (helper === "recent-articles" || helper === "related-articles") {
						data = { articles: convertLinksToObjects(el) };
					}

					// Recent activity helper data
					else if (helper === "recent-activity") {
						data = { items: convertLinksToObjects(el) };
					}

					// Social share links helper data
					else if (helper === "share") {
						var links = Array.prototype.map.call(
							el.querySelectorAll("a"),
							function (a) {
								var svg = a.querySelector("svg");
								return {
									title: a.getAttribute("aria-label"),
									description: svg ? svg.getAttribute("aria-label") : "",
									html_url: a.href
								};
							}
						);
						data = { links: links };
					}

					// Render the micro-template
					Util.renderTemplate(el, el.getAttribute("data-template"), data);
				}
			});
		});

		// Open social sharing links in a new window
		each(".share a", function (a) {
			a.addEventListener("click", function (e) {
				e.preventDefault();
				window.open(this.href, "", "height = 500, width = 500");
			});
		});

		// Add focus classname to search field
		each('.form-field [type="search"]', function (el) {
			el.addEventListener("focus", function () {
				this.parentNode.classList.add(Util.classNames.FOCUS);
			});
			el.addEventListener("focusout", function () {
				this.parentNode.classList.remove(Util.classNames.FOCUS);
			});
		});

		// Replace images with inline SVG
		Array.prototype.forEach.call(
			document.querySelectorAll("[data-inline-svg]"),
			Util.replaceWithSVG
		);

		// Smooth scroll
		function maybeScroll() {
			var smoothScroll = Util.getURLParameter("smooth-scroll", window.location);
			if (smoothScroll === "true" && window.location.hash) {
				var offset = Util.getURLParameter("offset", window.location);
				var target = document.getElementById(
					window.location.hash.substring(1).split("?")[0]
				);
				Util.scrollIntoView(target, offset);
			}
		}

		window.addEventListener("hashchange", maybeScroll, false);
		maybeScroll();

		/**
		 * Collapsible navigation.
		 * @param el
		 * @constructor
		 */
		function CollapsibleNav(el) {
			this.el = el;
			el.addEventListener("click", this.onClick.bind(this));
		}

		CollapsibleNav.prototype = {
			onClick: function (e) {
				var maxHeight = window.getComputedStyle(this.el).maxHeight;
				if (maxHeight === "none") {
					return;
				}

				var isExpanded = this.el.getAttribute("aria-expanded") === "true";
				var navLink = e.target;

				if (isExpanded) {
					// Close the nav if the clicked link is selected
					if (navLink.getAttribute("aria-selected") === "true") {
						this.el.setAttribute("aria-expanded", "false");
						this.el.classList.remove("is-expanded");
						navLink.setAttribute("aria-selected", "false");
						e.preventDefault();
					}
				} else {
					// Open the nav if it's closed
					this.el.setAttribute("aria-expanded", "true");
					this.el.classList.add("is-expanded");
					navLink.setAttribute("aria-selected", "true");
					e.preventDefault();
				}
			}
		};

		each(".collapsible-nav", function (nav) {
			new CollapsibleNav(nav);
		});

		window.CollapsibleNav = CollapsibleNav;

		// 팝업 초기화
		const popupOverlay = document.querySelector(".popup-overlay");
		if (popupOverlay) initPopups(popupOverlay);
	});

	const url = window.location.href;
	let language;

	Object.keys(footerTranslateTopRight).forEach((key) => {
		if (url.includes(`hc/${key}`)) {
			language = key;
		}
	});
	const ftrData = footerTranslateTopRight[language];

	const newsLetterTitle = document.querySelector(".newsletter_title");
	newsLetterTitle.innerHTML = ftrData.leftbox.title;

	const formControl = document.querySelector(".newletter_input");
	formControl.placeholder = ftrData.leftbox.placeHolder;
	formControl.classList.add("footer_form_control");

	const formControlDescription = document.querySelector(".newsletter_button_description");

	if (ftrData.leftbox.description) {
		formControlDescription.innerHTML = ftrData.leftbox.description;
	}

	const newletterButton = document.querySelector(".newsletter_button_describe");
	newletterButton.innerHTML = ftrData.leftbox.subscribeButton;

	const companyProfileTitle = document.querySelector(".company_profile_title");
	companyProfileTitle.innerHTML = ftrData.rightbox.title;

	const profileHref = document.querySelector(".profile_href");
	profileHref.href = ftrData.rightbox.url;

	const footerLogo = document.querySelector(".footer_logo");
	footerLogo.src = ftrData.logo;

	const footerAddress = document.querySelector(".footer_address");
	footerAddress.innerHTML = ftrData.address;

	const footerCompany = document.querySelector(".footer_company");
	if (ftrData.raw) {
		ftrData.raw.forEach((item) => {
			const footerName = document.createElement("div");
			const footerHref = document.createElement("a");

			if (item.tag) {
				footerName.classList.add("orange");
			}

			footerName.innerHTML = item.title;
			footerName.style.fontSize = "14px";
			footerHref.href = item.url;

			footerHref.appendChild(footerName);
			footerCompany.appendChild(footerHref);
		});
	}

	// 팝업 공지사항
	function positionPopups(popups, centerX, centerY) {
		let scaleValue = 1;
		let offsetY = 0;
		Array.from(popups)
			.reverse()
			.forEach((popup) => {
				popup.style.left = `${centerX}px`;
				popup.style.top = `${centerY - offsetY}px`;
				popup.style.transform = `translate(-50%, -50%) scale(${scaleValue})`;
				scaleValue -= 0.05;
				offsetY += 30;
			});
	}

	function initPopups(popupOverlay) {
		const popups = document.querySelectorAll(".popup");
		if (!popups.length) return;

		const userId = JSON.parse(localStorage.getItem("ajs_user_id"));
		const popupVisibleKey = `${userId}_popupVisible`;
		const popupVisibleObj = JSON.parse(localStorage.getItem(popupVisibleKey)) || [];
		const today = new Date().setHours(0, 0, 0, 0);
		const nextWeek = (() => {
			const d = new Date();
			d.setDate(d.getDate() + 7);
			return d.setHours(0, 0, 0, 0);
		})();
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;

		positionPopups(popups, centerX, centerY);

		const checkAllPopupClosed = () => {
			if (!Array.from(popups).some((p) => p.classList.contains("show"))) {
				popupOverlay.classList.remove("show");
			}
		};

		popups.forEach((popup) => {
			const stored = popupVisibleObj.find((item) => item.id === popup.id);
			const isExpired = stored && stored.exp_date < today;

			if (!stored || isExpired) {
				popup.classList.add("show");
				popupOverlay.classList.add("show");
			}
		});

		const btns = document.querySelectorAll(".btn-popup-check");

		btns.forEach((btn) => {
			btn.addEventListener("click", () => {
				const popupId = btn.getAttribute("data-popup-id");
				const popup = document.getElementById("popup-" + popupId);

				if (!popup) {
					console.warn("[popup] popup 요소를 찾지 못함. id 불일치 가능성");
					return;
				}

				popup.classList.remove("show");
				checkAllPopupClosed();

				let scaleValue = 1;
				let offsetY = 0;
				Array.from(document.querySelectorAll(".popup"))
					.reverse()
					.forEach((p) => {
						if (p.classList.contains("show")) {
							p.style.left = `${centerX}px`;
							p.style.top = `${window.innerHeight / 2 - offsetY}px`;
							p.style.transform = `translate(-50%, -50%) scale(${scaleValue})`;
							scaleValue -= 0.05;
							offsetY += 30;
						}
					});
			});
		});
	}
})();