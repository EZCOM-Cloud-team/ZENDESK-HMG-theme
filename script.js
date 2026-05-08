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

	try {
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
	} catch (e) {
		// footer 번역 초기화 실패 (해당 페이지에 footer 요소 없음)
	}

	ready(function () {
		const titleElements = document.querySelectorAll(
			".link-stretched.text-inherit, h1.article-title, .article-list-item a, .promoted-articles-item a"
		);

		titleElements.forEach(function (el) {
			const originalText = el.innerText.trim();

			// 1. 모든 상태값을 한 번에 찾는 정규식 (Open, In Progress, Solved -> Investigating, Scheduled, Fixed 및 한국어 추가)
			const match = originalText.match(
				/^\[\s*(Investigating|Scheduled|Fixed|확인\s*중|예정됨|해결됨|장애\s*발생|장애\s*종료|Incident|Resolved|배포\s*전|배포\s*완료|Pre-Release|Pre\s*Release|Released|예정|진행\s*중|종료|Upcoming|Ongoing|Ended)\s*\]/i
			);

			if (match) {
				// 2. 매칭된 텍스트에서 공백을 모두 제거하고 소문자로 변환
				const rawStatus = match[1].replace(/\s+/g, "").toLowerCase();
				let badgeClass = "";
				let displayText = "";

				// 3. 공백이 제거된 상태값(rawStatus)을 기준으로 분기 처리
				switch (rawStatus) {
					// --- [1] 기본 상태값 (수정됨) ---
					case "investigating":
						badgeClass = "investigating-en";
						displayText = "INVESTIGATING";
						break;
					case "확인중":
						badgeClass = "investigating-kr";
						displayText = "확인 중";
						break;
					case "scheduled":
						badgeClass = "scheduled-en";
						displayText = "SCHEDULED";
						break;
					case "예정됨":
						badgeClass = "scheduled-kr";
						displayText = "예정됨";
						break;
					case "fixed":
						badgeClass = "fixed-en";
						displayText = "FIXED";
						break;
					case "해결됨":
						badgeClass = "fixed-kr";
						displayText = "해결됨";
						break;

					// --- [2] 장애 관련 상태값 ---
					case "장애발생":
						badgeClass = "incident-kr";
						displayText = "장애 발생";
						break;
					case "장애종료":
						badgeClass = "resolved-kr";
						displayText = "장애 종료";
						break;
					case "incident":
						badgeClass = "incident-en";
						displayText = "INCIDENT";
						break;
					case "resolved":
						badgeClass = "resolved-en";
						displayText = "RESOLVED";
						break;

					// --- [3] 배포 관련 상태값 ---
					case "배포전":
						badgeClass = "prerelease-kr";
						displayText = "배포 전";
						break;
					case "배포완료":
						badgeClass = "released-kr";
						displayText = "배포 완료";
						break;
					case "pre-release":
					case "prerelease":
						badgeClass = "prerelease-en";
						displayText = "PRE-RELEASE";
						break;
					case "released":
						badgeClass = "released-en";
						displayText = "RELEASED";
						break;

					// --- [4] 이벤트 관련 상태값 ---
					case "예정":
						badgeClass = "event-upcoming-kr";
						displayText = "예정";
						break;
					case "진행중":
						badgeClass = "event-ongoing-kr";
						displayText = "진행 중";
						break;
					case "종료":
						badgeClass = "event-ended-kr";
						displayText = "종료";
						break;
					case "upcoming":
						badgeClass = "event-upcoming-en";
						displayText = "UPCOMING";
						break;
					case "ongoing":
						badgeClass = "event-ongoing-en";
						displayText = "ONGOING";
						break;
					case "ended":
						badgeClass = "event-ended-en";
						displayText = "ENDED";
						break;
				}

				// 4. 뱃지 생성 및 적용
				if (badgeClass !== "") {
					const badge = document.createElement("span");
					badge.className = `status-badge badge-${badgeClass}`;
					badge.innerText = displayText;

					// 기존 제목에서 [상태값] 텍스트 제거
					const newText = originalText.replace(/^\[.*?\]\s*/, "");

					// 요소 업데이트
					el.innerHTML = "";
					el.appendChild(badge);
					el.appendChild(document.createTextNode(" " + newText));
				}
			}
		});
	});

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
		const checkBox = popup.querySelector(".popup-visible-checkbox");

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
				// '일주일간 표시하지 않기'가 체크되어있는 경우
				if (checkBox.checked) {
					popupVisibleObj.push({ id: popupId, exp_date: nextWeek });
					localStorage.setItem(popupVisibleKey, JSON.stringify(popupVisibleObj));
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
