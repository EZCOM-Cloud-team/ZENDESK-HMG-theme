(function() {
  "use strict";

  window.Widgets = window.Widgets || {};

  // Key map
  var ENTER = 13;
  var ESCAPE = 27;
  var SPACE = 32;
  var UP = 38;
  var DOWN = 40;
  var TAB = 9;

  document.addEventListener('alpine:init', function() {

    // Responsive scrollable element
    Alpine.data('scrollableElement', function(data) {
      return Object.assign({
        top: '0px',
        breakpoint: null,

        /**
         * Creates a new responsive scrollable element.
         */
        init: function() {
          var updateElement = this.updateElement.bind(this);
          var updateElementThrottled = Util.throttle(updateElement, 200);
          var updateElementDebounced = Util.debounce(updateElement, 200);
          window.addEventListener('resize', updateElementDebounced);
          window.addEventListener('scroll', updateElementThrottled);
          window.addEventListener('scrollend', updateElement);
          this.$nextTick(updateElement)
        },

        /**
         * Updates the inline styles of the element.
         */
        updateElement: function() {
          var windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

          // Get the maximum height of the element
          var rect = this.$el.getBoundingClientRect();
          var maxHeight = windowHeight - rect.top;

          // Maybe remove styles if below the breakpoint threshold specified
          if (typeof this.breakpoint === 'string') {
            var windowWidth = window.innerWidth || document.body.clientWidth;
            var breakpointWidth = this.getBreakpointWidth();
            if (windowWidth < breakpointWidth) {
              this.removeStyles();
              return;
            }
          }

          // Apply maximum height based on screen height
          this.addStyles(maxHeight);
        },

        /**
         * Returns the applicable breakpoint width, if any.
         * @returns {string}
         */
        getBreakpointWidth: function() {
          var computedStyle = getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-' + this.breakpoint);
          if (computedStyle && computedStyle.slice(-2) === 'px') {
            return parseInt(computedStyle, 10);
          }
          return null;
        },

        /**
         * Adds the inline styles that make the element scrollable.
         * @param maxHeight
         */
        addStyles: function(maxHeight) {
          this.$el.style.top = this.top;
          this.$el.style.maxHeight = maxHeight + 'px';
          this.$el.style.overflowY = 'auto';
        },

        /**
         * Removes the inline styles that make the element scrollable.
         */
        removeStyles: function() {
          this.$el.style.top = this.$el.style.maxHeight = this.$el.style.overflowY = null;
        }

      }, data);
    });

    // External links
    Alpine.data('link', function(data) {
      return Object.assign({
        isExternal: null,

        init: function() {
          var host = this.$el.host;
          this.isExternal = host && host !== window.location.host;
          if (this.isExternal) {
            this.$el.target = '_blank';
          }
        }
      }, data);
    });

    // Simple toggle functionality
    Alpine.data('toggle', function(data) {
      return Object.assign({
        isOpen: false,

        toggle: function() {
          if (this.isOpen) {
            this.close();
          } else {
            this.open();
          }
        },

        open: function() {
          this.isOpen = true;
        },

        close: function() {
          this.isOpen = false;
        }
      }, data);
    });

    // Returns the current category object for section and article pages
    Alpine.data('category', function(data) {
      return Object.assign({
        sectionId: null,
        categoryId: null,
        category: null,

        init: function() {
          var pageId = Util.getPageId();

          // Properties aligned with Navigation extension
          var properties = [
            "id",
            "title",
            "description",
            "name",
            "html_url",
            "position",
            "promoted",
            "pinned",
            "draft",
            "section_id",
            "sorting",
            "category_id",
            "parent_section_id",
            "topic_id",
            "created_at"
          ];
          if (!this.categoryId && Util.isCategoryPage()) this.categoryId = pageId;
          if (!this.sectionId && Util.isSectionPage()) this.sectionId = pageId;

          if (!this.categoryId && !this.sectionId) return;

          Util.get(['categories', 'sections'], properties).then(this.getActiveCategory.bind(this));
        },

        getActiveCategory: function(collection) {

          if (this.categoryId) {
            var activeCategoryId = this.categoryId;
            this.category = collection.categories.filter(function(category) {
              return category.id === activeCategoryId;
            })[0] || null;
          } else if (this.sectionId) {
            var sectionId = this.sectionId;

            // Get the active section
            var activeSection = collection.sections.filter(function(section) {
              return section.id === sectionId;
            })[0] || null;

            // Get the active category
            this.category = collection.categories.filter(function(category) {
              return category.id === activeSection['category_id'];
            })[0] || null;
          }
        }
      }, data);
    });
  });

  /**
   * Dropdown widget.
   */
  window.Widgets.dropdown = function(data) {
    return Object.assign({
      isExpanded: false,

      get focusableElements() {
        return [...this.$refs.menu.querySelectorAll('a[href], button, input, textarea, select, details,[tabindex]:not([tabindex="-1"])')]
          .filter(el => !el.hasAttribute('disabled') && !el.getAttribute("aria-hidden"))
      },

      init: function() {
        this.$refs.toggle.addEventListener('click', this.clickHandler.bind(this));
        this.$refs.toggle.addEventListener('keydown', this.toggleKeyHandler.bind(this));
        this.$refs.menu.addEventListener('keydown', this.menuKeyHandler.bind(this));
        if (!this.isExpanded) {
          this.$refs.menu.classList.add('invisible');
        }
      },

      open: function() {
        this.setPosition();
        this.$nextTick(this.updatePosition.bind(this));
        this.isExpanded = true;
      },

      close: function() {
        var menu = this.$refs.menu;

        // Hide menu
        menu.classList.add('invisible');

        // Remove inline styles
        menu.style.top = null;
        menu.style.bottom = null;
        menu.style.left = null;
        menu.style.position = null;
        menu.style.maxHeight = null;
        menu.style.overflow = null;

        this.isExpanded = false;
      },

      setPosition: function() {
        var menu = this.$refs.menu;
        menu.style.display = 'block';
        menu.style.top = '0px';
        menu.style.left = '0px';
        menu.style.position = 'fixed';
        // menu.style.maxHeight = '100vh';
        // menu.style.maxWidth = '100vh';
      },

      updatePosition: function() {
        var menu = this.$refs.menu;

        // Window properties
        var windowInnerWidth = document.documentElement.clientWidth;
        var windowInnerHeight = document.documentElement.clientHeight;

        var elClientBoundingRect = this.$el.getBoundingClientRect();

        // Get computed style
        var menuComputedStyle = window.getComputedStyle(menu)
        var marginTop = parseInt(menuComputedStyle.getPropertyValue('margin-top'), 0);
        var marginBottom = parseInt(menuComputedStyle.getPropertyValue('margin-bottom'), 0);
        var marginLeft = parseInt(menuComputedStyle.getPropertyValue('margin-left'), 0);
        var marginRight = parseInt(menuComputedStyle.getPropertyValue('margin-right'), 0);
        var borderTopWidth = parseInt(menuComputedStyle.getPropertyValue('border-top-width'), 0);
        var borderBottomWidth = parseInt(menuComputedStyle.getPropertyValue('border-bottom-width'), 0);
        var borderLeftWidth = parseInt(menuComputedStyle.getPropertyValue('border-left-width'), 0);
        var borderRightWidth = parseInt(menuComputedStyle.getPropertyValue('border-right-width'), 0);
        var menuScrollWidth = menu.scrollWidth + marginLeft + marginRight + borderLeftWidth + borderRightWidth;
        var menuScrollHeight = menu.scrollHeight + marginTop + marginBottom + borderTopWidth + borderBottomWidth;

        // Hide the menu
        menu.style.display = 'none';

        // Menu extends beyond left edge of screen
        if (elClientBoundingRect.x < 0) {

          // Set the left position
          var left = Math.abs(elClientBoundingRect.x);
          menu.style.left = left + 'px';

          // Maybe adjust the maximum width
          if ((left + menuScrollWidth) > windowInnerWidth) {
            menu.style.maxWidth = windowInnerWidth + 'px';
          }
        }

        // Menu extends beyond right edge of screen
        else if ((elClientBoundingRect.x + menuScrollWidth) > windowInnerWidth) {
          var difference = Math.abs(Math.round(windowInnerWidth - (elClientBoundingRect.x + menuScrollWidth)));
          if (elClientBoundingRect.x - difference >= 0) {
            menu.style.left = '-' + difference + 'px';
          } else {
            menu.style.left = '-' + elClientBoundingRect.x + 'px';
            menu.style.maxWidth = 'calc(100vw - ' + (elClientBoundingRect.x * 2) + 'px)';
          }
        }

        // Extends beyond bottom edge of screen
        if ((elClientBoundingRect.bottom + menuScrollHeight) >= windowInnerHeight) {
          var elMidpoint = elClientBoundingRect.top + (elClientBoundingRect.height / 2);
          var windowMidpoint = windowInnerHeight / 2;

          // More space below element
          if (elMidpoint <= windowMidpoint) {

            // Adjust maximum height
            menu.style.top = '100%';
            menu.style.bottom = null;
            menu.style.maxHeight = 'calc(100vh - ' + (elClientBoundingRect.bottom + marginTop + borderTopWidth) + 'px)';
          }

          // More space above element
          else {

            // Adjust maximum height
            menu.style.top = null;
            menu.style.bottom = '100%';
            menu.style.maxHeight = 'calc(100vh - ' + ((windowInnerHeight - elClientBoundingRect.top) + marginBottom + borderBottomWidth) + 'px)';
          }
        } else {

          // Undo initial placement
          menu.style.top = '100%';
          menu.style.bottom = null;
          menu.style.maxHeight = null;
        }

        menu.style.overflow = 'auto';

        // Show menu
        menu.style.position = null;
        menu.style.display = null;
        menu.classList.remove('invisible');
      },

      // handleOverflow: function() {
      //   var observer = new IntersectionObserver((entries) => {
      //     for (var entry of entries) {
      //       var menu = this.$refs.menu;
      //       var menuClientBoundingRect = menu.getBoundingClientRect();
      //
      //       // Menu extends beyond left edge of screen
      //       if (menuClientBoundingRect.x < 0) {
      //         menu.style.left = Math.abs(menuClientBoundingRect.left) + 'px';
      //       }
      //
      //       // Menu extends beyond right edge of screen
      //       if (menuClientBoundingRect.x + menuClientBoundingRect.width >= window.innerWidth) {
      //         menu.style.left = -((menuClientBoundingRect.x + menuClientBoundingRect.width) - window.innerWidth) + 'px';
      //       }
      //
      //       // Extends beyond bottom edge of screen
      //       if (menuClientBoundingRect.top + menuClientBoundingRect.height >= window.innerHeight) {
      //         var elClientBoundingRect = this.$el.getBoundingClientRect();
      //         var elMidpoint = elClientBoundingRect.top + (elClientBoundingRect.height / 2);
      //         var windowMidpoint = window.innerHeight / 2;
      //
      //         // More space below
      //         if (elMidpoint <= windowMidpoint) {
      //
      //           // Adjust maximum height
      //           menu.style.maxHeight = 'calc(100vh - ' + menuClientBoundingRect.top + 'px)';
      //         }
      //
      //         // More space above
      //         else {
      //
      //           // Display menu above
      //           menu.style.top = 'auto';
      //           menu.style.bottom = '100%';
      //
      //           // Adjust maximum height
      //           menuClientBoundingRect = menu.getBoundingClientRect();
      //           menu.style.maxHeight = 'calc(100vh - ' + (window.innerHeight - menuClientBoundingRect.bottom) + 'px)';
      //         }
      //
      //         menu.style.overflowY = 'auto';
      //       }
      //
      //       menu.classList.remove('invisible');
      //     }
      //     observer.disconnect();
      //   });
      //   observer.observe(this.$refs.menu);
      // },

      focusNextMenuItem: function(currentItem) {
        if (!this.focusableElements.length) return;
        var currentIndex = this.focusableElements.indexOf(currentItem);
        var nextIndex = currentIndex === this.focusableElements.length - 1 || currentIndex < 0 ? 0 : currentIndex + 1;
        this.focusableElements[nextIndex].focus();
      },

      focusPreviousMenuItem: function(currentItem) {
        if (!this.focusableElements.length) return;
        var currentIndex = this.focusableElements.indexOf(currentItem);
        var previousIndex = currentIndex <= 0 ? this.focusableElements.length - 1 : currentIndex - 1;
        this.focusableElements[previousIndex].focus();
      },

      clickHandler: function(e) {
        if (this.isExpanded) {
          this.close();
        } else {
          this.open();
        }
      },

      toggleKeyHandler: function(e) {
        switch (e.keyCode) {
          case ENTER:
          case SPACE:
          case DOWN:
            e.preventDefault();
            if (!this.isExpanded) this.open();
            this.focusNextMenuItem();
            break;
          case UP:
            e.preventDefault();
            if (!this.isExpanded) this.open();
            this.focusPreviousMenuItem();
            break;
          case ESCAPE:
            this.close();
            if (this.$refs.toggle) this.$refs.toggle.focus();
            break;
        }
      },

      menuKeyHandler: function(e) {
        var firstItem = this.focusableElements[0];
        var lastItem = this.focusableElements[this.focusableElements.length - 1];
        var currentElement = e.target;

        switch (e.keyCode) {
          case ESCAPE:
            this.close();
            if (this.$refs.toggle) this.$refs.toggle.focus();
            break;
          case DOWN:
            e.preventDefault();
            this.focusNextMenuItem(currentElement);
            break;
          case UP:
            e.preventDefault();
            this.focusPreviousMenuItem(currentElement);
            break;
          case TAB:
            if (e.shiftKey) {
              if (currentElement === firstItem) {
                this.close();
              } else {
                e.preventDefault();
                this.focusPreviousMenuItem(currentElement);
              }
            } else if (currentElement === lastItem) {
              this.close();
            } else {
              e.preventDefault();
              this.focusNextMenuItem(currentElement);
            }
            break;
        }
      }
    }, data)
  };

  /**
   * Notification widget.
   */
  window.Widgets.notification = function() {
    return {
      key: 'alpine:notification:dismissed',
      isDismissed: null,

      /**
       * Fetches a page of categories.
       * @returns {Promise}
       */
      getNotification: function() {
        this.isDismissed = window.sessionStorage.getItem(this.key) === 'true';
      },

      /**
       * Dismisses the notification.
       */
      dismiss: function() {
        this.isDismissed = true;
        window.sessionStorage.setItem(this.key, 'true');
      }
    }
  };

  /**
   * Header widget.
   */
  window.Widgets.header = function(data) {
    return Object.assign({
      isFixed: false,
      isSticky: false,
      isStuck: null,
      isUnstuck: null,

      init: function() {
        var $el = this.$el;

        if (this.isFixed && this.hasHeroElement()) {
          this.applyFixedHeader();
        } else {
          this.isFixed = false;
          $el.classList.remove('fixed-header');
        }

        $el.classList.add('transition-none');
        $el.classList.add('visible');
        $el.classList.remove('transition-none');

        Util.reflow(this.$el);

        if (this.isSticky) {
          this.applyStickyHeader();
        }
      },

      hasHeroElement: function() {
        var main = document.querySelector('main[role="main"]');
        return main.firstElementChild && main.firstElementChild.classList.contains('hero');
      },

      applyStickyHeader: function() {
        new Sticky(this.$el, {
          classNames: { sticky: 'sticky-top transition' }
        });
        this.$el.addEventListener('sticky:stuck', this.onStuck.bind(this));
        this.$el.addEventListener('sticky:unstuck', this.onUnstuck.bind(this));
      },

      applyFixedHeader: function() {
        this.$el.classList.add('absolute-top');
      },

      onStuck: function() {
        this.isStuck = true;
        this.isUnstuck = false;
        },

      onUnstuck: function() {
        this.isStuck = false;
        this.isUnstuck = true;
      }

    }, data);
  };

  /**
   * Search widget.
   */
  window.Widgets.search = function() {
    return {
      isOpen: false,

      init: function() {
        var searchFields = Array.prototype.slice.call(this.$root.querySelectorAll('[type="search"]'));
        this.searchField = searchFields.length ? searchFields[searchFields.length - 1] : null;

        // Add query string value if appropriate
        var queryString = Util.getURLParameter('query');
        if (queryString && this.searchField && !this.searchField.value) {
          this.searchField.value = queryString;
        }

        this.addEventListeners();
      },

      addEventListeners: function() {
        this.$watch('isOpen', this.onChange.bind(this));
        window.addEventListener('resize', Util.debounce(this.close.bind(this), 500));
      },

      onChange: function(isOpen) {
        if (isOpen) {
          this.showSearch();
        } else {
          this.hideSearch();
        }
      },

      toggle: function() {
        if (this.isOpen) {
          this.close();
        } else {
          this.open();
        }
      },

      open: function() {
        this.isOpen = true;
      },

      showSearch: function() {
        if (this.searchField) {
          var container = Util.closest(this.searchField, '.search');
          if (container) container.style.display = 'block';
          this.searchField.focus();
        }
      },

      close: function() {
        this.isOpen = false;
      },

      hideSearch: function() {
        if (this.searchField) {
          var container = Util.closest(this.searchField, '.search');
          if (container) {
            if (this.$refs.dropdown) {
              Util.onTransitionEnd(this.$refs.dropdown, function() {
                container.style.display = 'none';
              });
            } else {
              container.style.display = 'none';
            }
          }
        }

        // Focus on toggle
        if (this.$root.contains(document.activeElement) && this.$refs.toggle) {
          this.$refs.toggle.focus();
        }
      }
    }
  };

  /**
   * Mobile menu widget.
   */
  window.Widgets.mobileMenu = function() {
    return {
      isOpen: false,

      init: function() {
        window.addEventListener('resize', Util.debounce(this.close.bind(this), 500));
        document.addEventListener('keydown', this.toggleKeyHandler.bind(this));
      },

      toggleKeyHandler: function(e) {
        switch (e.keyCode) {
          case ESCAPE:
            this.close();
            break;
        }
      },

      toggle: function() {
        if (this.isOpen) {
          this.close();
        } else {
          this.open();
        }
      },

      open: function() {
        this.isOpen = true;
      },

      close: function() {
        this.isOpen = false;
      }
    }
  };

  /**
   * Categories widget.
   */
  window.Widgets.categories = function() {
    return {
      categories: [],
      isLoading: true,

      /**
       * Fetches a page of categories.
       * @returns {Promise}
       */
      getCategories: function() {
        return Util.get('categories')
          .then(this.addCategories.bind(this));
      },

      /**
       * Adds the categories returned by the REST API to the collection.
       * @param json
       */
      addCategories: function(json) {
        this.categories = json.categories;
        this.isLoading = false;
      }
    }
  };

  /**
   * Parallax image widget.
   */
  window.Widgets.parallaxImage = function() {
    return {

      init: function() {
        if (!this.prefersReducedMotion()) {
          this.addEventListeners();
        }
      },

      prefersReducedMotion: function() {
        var mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
        return mediaQueryList.matches;
      },

      addEventListeners: function() {
        window.addEventListener('scroll', this.onScroll.bind(this));
      },

      onScroll: function() {
        var scrolled = window.scrollY;
        this.$el.style['-moz-transform'] = `translate3d(0px,${scrolled / + 3}px, 0px)`;
        this.$el.style['-webkit-transform'] = `translate3d(0px,${scrolled / + 3 }px, 0px)`;
        this.$el.style['transform'] = `translate3d(0px,${scrolled / + 3}px, 0px)`;
      }
    }
  };

  /**
   * Popular keywords widget.
   */
  window.Widgets.popularKeywords = function() {
    return {
      keywords: [],

      /**
       * Parses the set of keywords.
       * @returns {Promise}
       */
      parseKeywords: function(keywords) {
        var baseURL = location.protocol + '//' + location.hostname + '/hc/' + Theme.locale + '/search?query=';
        this.keywords = keywords
          .split(',')
          .map(function(keyword) {
            keyword = keyword.trim();
            return keyword ? { title: keyword, html_url: baseURL + keyword }: keyword;
          })
          .filter(function(keyword) {
            return keyword;
          });
      }
    }
  };

})();