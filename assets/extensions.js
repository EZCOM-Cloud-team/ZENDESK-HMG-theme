/* collapse.js */
(function() {
  "use strict";

  var NAME = 'collapse';

  var ClassName = {
    ACTIVE:     'is-active',
    SHOW:       'is-visible',
    COLLAPSE:   'collapse',
    COLLAPSING: 'collapsing',
    COLLAPSED:  'is-hidden'
  };

  var Event = {
    SHOW:   NAME + ':show',
    SHOWN:  NAME + ':shown',
    HIDE:   NAME + ':hide',
    HIDDEN: NAME + ':hidden'
  };

  var Selector = {
    DATA_TOGGLE:  '[data-toggle="collapse"]',
  };

  /**
   * Collapse.
   *
   * @type {component}
   */
  window.Collapse = Util.createExtension({

    defaults: {
      parent: false,
      toggle: true,
    },

    optionTypes: {
      parent: '(string|element|boolean)',
      toggle: 'boolean',
    },

    /**
     * Initializes the extension.
     */
    initialize: function(options) {
      this._isTransitioning = false;
      this._parent = options.parent ? this._getParent() : null;

      this._triggerArray = [].slice.call(document.querySelectorAll(
        Selector.DATA_TOGGLE + '[href="#' + this.el.id + '"],' +
        Selector.DATA_TOGGLE + '[data-target="#' + this.el.id + '"]'
      ));

      var _this = this;

      var toggleList = [].slice.call(document.querySelectorAll(Selector.DATA_TOGGLE));
      for (var i = 0, len = toggleList.length; i < len; i++) {
        var selector = Util.getSelectorFromElement(toggleList[i]);
        var filterElement = [].slice.call(document.querySelectorAll(selector)).filter(function(el) {
          return el === _this.el;
        });

        if (selector !== null && filterElement.length > 0) {
          this._selector = selector;
        }
      }

      if (!options.parent) {
        this._addAriaAndCollapsedClass(this.el, this._triggerArray)
      }

      if (options.toggle) {
        this.toggle()
      }
    },

    _getTargetFromElement: function(element) {
      var selector = Util.getSelectorFromElement(element);
      return selector ? document.querySelector(selector) : null;
    },

    _getParent: function() {
      var parent;

      if (Util.isElement(this.options.parent)) {
        parent = this.options.parent;
      } else {
        parent = document.querySelector(this.options.parent)
      }

      if (parent) {
        var selector = Selector.DATA_TOGGLE + '[data-parent="' + this.options.parent + '"]';
        var children = [].slice.call(parent.querySelectorAll(selector));
        for (var i = 0; i < children.length; i++) {
          this._addAriaAndCollapsedClass(
            this._getTargetFromElement(children[i]),
            [children[i]]
          )
        }
      }
      return parent
    },

    _addAriaAndCollapsedClass: function(el, triggers) {
      var isOpen = el.classList.contains(ClassName.SHOW);
      if (triggers.length) {
        triggers.forEach(function(trigger) {
          trigger.classList.toggle(ClassName.ACTIVE, isOpen);
          trigger.classList.toggle(ClassName.COLLAPSED, !isOpen);
          trigger.setAttribute('aria-expanded', isOpen);
        });
      }
    },

    _setTransitioning: function(isTransitioning) {
      this._isTransitioning = isTransitioning
    },

    toggle: function() {
      if (this.el.classList.contains(ClassName.SHOW)) {
        this.hide()
      } else {
        this.show()
      }
    },

    show: function() {
      if (this._isTransitioning || this.el.classList.contains(ClassName.SHOW)) {
        return;
      }

      var options = this.options;
      var actives;

      if (this._parent) {
        actives = [].slice.call(this._parent.querySelectorAll('.' + ClassName.SHOW + ', .' + ClassName.COLLAPSING))
          .filter(function(el) {
            if (typeof options.parent === 'string') {
              return el.getAttribute('data-parent') === options.parent
            }
            return el.classList.contains(ClassName.COLLAPSE)
          });

        if (actives.length === 0) {
          actives = null
        }
      }

      var startEvent = Util.triggerEvent(this.el, Event.SHOW, {
        relatedTargets: this._triggerArray
      });

      if (startEvent && startEvent.defaultPrevented) {
        return;
      }

      if (actives) {
        actives.forEach(function(el) {
          var instance = dataStorage.get(el, NAME);
          if (!instance) {
            dataStorage.put(el, NAME, new Collapse(el));
          } else {
            instance.hide();
          }
        });
      }

      this.el.classList.remove(ClassName.COLLAPSE);
      this.el.classList.add(ClassName.COLLAPSING);
      this.el.style.height = '0px';

      if (this._triggerArray.length) {
        this._triggerArray.forEach(function(el) {
          el.classList.add(ClassName.ACTIVE);

          var customActiveClass = el.getAttribute('data-active-class');
          if (customActiveClass) {
            el.classList.add.apply(
              el.classList,
              customActiveClass.split(' ')
            );
          }
          el.classList.remove(ClassName.COLLAPSED);
          el.setAttribute('aria-expanded', 'true');
        });
      }

      this._setTransitioning(true);

      var complete = function() {
        this.el.classList.remove(ClassName.COLLAPSING);
        this.el.classList.add(ClassName.COLLAPSE);
        this.el.classList.add(ClassName.SHOW);
        this.el.style.height = '';

        this._setTransitioning(false);

        Util.triggerEvent(this.el, Event.SHOWN, {
          relatedTargets: this._triggerArray
        });
      }.bind(this);

      Util.onTransitionEnd(this.el, complete);

      this.el.style.height = this.el.scrollHeight + 'px';
    },

    hide: function() {
      if (this._isTransitioning || !this.el.classList.contains(ClassName.SHOW)) return;

      var startEvent = Util.triggerEvent(this.el, Event.HIDE, {
        relatedTargets: this._triggerArray
      });

      if (startEvent && startEvent.defaultPrevented) {
        return;
      }

      this.el.style.height = this.el.getBoundingClientRect().height + 'px';
      this.el.classList.add(ClassName.COLLAPSING);
      this.el.classList.remove(ClassName.COLLAPSE);
      this.el.classList.remove(ClassName.SHOW);

      if (this._triggerArray.length > 0) {
        for (var i = 0; i < this._triggerArray.length; i++) {
          var trigger = this._triggerArray[i];
          var selector = Util.getSelectorFromElement(trigger);

          if (selector !== null) {
            [].slice.call(document.querySelectorAll(selector)).forEach(function(el) {
              if (!el.classList.contains(ClassName.SHOW)) {
                trigger.classList.add(ClassName.COLLAPSED);
                trigger.classList.remove(ClassName.ACTIVE);

                var customActiveClass = trigger.getAttribute('data-active-class');
                if (customActiveClass) {
                  trigger.classList.remove.apply(
                    trigger.classList,
                    customActiveClass.split(' ')
                  );
                }
                trigger.setAttribute('aria-expanded', 'false');
              }
            });
          }
        }
      }

      this._setTransitioning(true);

      var complete = function() {
        this._setTransitioning(false);
        this.el.classList.remove(ClassName.COLLAPSING);
        this.el.classList.add(ClassName.COLLAPSE);
        Util.triggerEvent(this.el, Event.HIDDEN, {
          relatedTargets: this._triggerArray
        });
      }.bind(this);

      Util.onTransitionEnd(this.el, complete);

      this.el.style.height = '';
    }
  });

  document.addEventListener('click', function(e) {
    var trigger = e.target;
    if (!trigger.matches(Selector.DATA_TOGGLE)) {
      trigger = Util.closest(trigger, Selector.DATA_TOGGLE);
      if (!trigger) {
        return;
      }
    }

    if (trigger.tagName === 'A') {
      e.preventDefault();
    }

    var selector = Util.getSelectorFromElement(trigger);

    [].slice.call(document.querySelectorAll(selector)).forEach(function(el) {
      var instance = dataStorage.get(el, NAME);
      if (!instance) {
        dataStorage.put(el, NAME, new Collapse(el));
      } else {
        instance.toggle();
      }
    });
  }, false);

})();

/* tab.js */
(function() {
  "use strict";

  var NAME = 'tab';

  var Event = {
    HIDE:   NAME + ':hide',
    HIDDEN: NAME + ':hidden',
    SHOW:   NAME + ':show',
    SHOWN:  NAME + ':shown'
  };

  var ClassName = {
    ACTIVE:   'is-active',
    DISABLED: 'is-disabled',
    SHOWN:    'is-shown'
  };

  var Selector = {
    NAV:          '.nav',
    ACTIVE:       '.' + ClassName.ACTIVE,
    DATA_TOGGLE:  '[data-toggle="tab"]',
  };

  /**
   * Tab.
   *
   * @type {component}
   */
  window.Tab = Util.createExtension({

    /**
     * Initializes the extension.
     */
    initialize: function(options) {},

    show: function() {
      if (
        this.el.parentNode &&
        this.el.parentNode.nodeType === Node.ELEMENT_NODE &&
        this.el.classList.contains(ClassName.ACTIVE) ||
        this.el.classList.contains(ClassName.DISABLED)
      ) {
        return;
      }

      var nav = Util.closest(this.el, Selector.NAV) || this.el.parentNode;
      var selector = Util.getSelectorFromElement(this.el);
      var previous;
      var target;

      if (nav) {
        previous = nav.querySelector(Selector.ACTIVE);
      }

      if (previous) {

        // Do nothing if a transition is underway on the previous element
        var previousSelector = Util.getSelectorFromElement(previous);
        var previousTarget = document.querySelector(previousSelector);

        if (
          previousTarget &&
          Util.getTransitionDuration(previousTarget) &&
          !previousTarget.classList.contains(ClassName.SHOWN)
        ) {
          return;
        }

        var hideEvent = Util.triggerEvent(previous, Event.HIDE, {
          relatedTarget: this.el
        });
      }

      var showEvent = Util.triggerEvent(this.el, Event.SHOW, {
        relatedTarget: previous
      });

      if (showEvent.defaultPrevented || (hideEvent && hideEvent.defaultPrevented)) {
        return;
      }

      this._activate(this.el, nav);

      /**
       * Trigger `hidden` and `shown` events.
       */
      var complete = function() {

        if (previous) {
          Util.triggerEvent(previous, Event.HIDDEN, {
            relatedTarget: this.el
          });
        }

        Util.triggerEvent(this.el, Event.SHOWN, {
          relatedTarget: previous
        });

      }.bind(this);

      if (selector) {
        target = document.querySelector(selector);
      }

      if (target) {
        this._activate(target, target.parentNode, complete);
      } else {
        complete();
      }
    },

    _activate: function(el, container, callback) {
      var active;
      if (container === el.parentNode) {
        active = Array.prototype.filter.call(container.children, function(el) {
          return el.matches(Selector.ACTIVE);
        })[0] || null;
      } else {
        active = container.querySelector(Selector.ACTIVE);
      }

      var onActivated = function() {
        return this._transitionComplete(el, active, callback);
      }.bind(this);

      if (active) {
        Util.onTransitionEnd(active, onActivated);
        active.classList.remove(ClassName.SHOWN);
      } else {
        onActivated();
      }
    },

    _transitionComplete: function(el, active, callback) {
      var customActiveClass;
      if (active) {

        // Remove active class names
        active.classList.remove(ClassName.ACTIVE);

        customActiveClass = active.getAttribute('data-active-class');
        if (customActiveClass) {
          active.classList.remove.apply(
            active.classList,
            customActiveClass.split(' ')
          );
        }

        if (active.getAttribute('role') === 'tab') {
          active.setAttribute('aria-selected', false)
        }
      }

      // Add active class names
      el.classList.add(ClassName.ACTIVE);

      customActiveClass = el.getAttribute('data-active-class');
      if (customActiveClass) {
        el.classList.add.apply(
          el.classList,
          customActiveClass.split(' ')
        );
      }

      if (el.getAttribute('role') === 'tab') {
        el.setAttribute('aria-selected', true)
      }

      Util.reflow(el);
      el.classList.add(ClassName.SHOWN);

      if (callback) {
        callback();
      }
    }
  });

  document.addEventListener('click', function(e) {
    var el = e.target;
    if (!el.matches(Selector.DATA_TOGGLE)) {
      el = Util.closest(el, Selector.DATA_TOGGLE);
      if (!el) {
        return;
      }
    }

    if (el.tagName === 'A') {
      e.preventDefault();
    }

    var instance = dataStorage.get(el, NAME);
    if (!instance) {
      instance = new Tab(el);
      dataStorage.put(el, NAME, instance);
    }

    instance.show();
  }, false);

})();

/* table-of-contents.js */
(function() {
  "use strict";

  // Globals
  var NAME = 'tableOfContents';

  var Event = {
    RENDER: NAME + ':render'
  };

  /**
   * Table of Contents.
   *
   * @type {component}
   */
  window.TableOfContents = Util.createExtension({

    defaults: {
      parentElement: null,
      selector: '.content h2',
      anchorLinks: true,
      generateIds: true,

      // The ID of the custom template to use when generating HTML
      template: null,

      // Additional data to expose to the template
      templateData: {}
    },

    optionTypes: {
      parentElement: '(window|element|string|null)',
      selector: 'string',
      anchorLinks: 'boolean',
      generateIds: 'boolean',
      template: '(string|null)',
      templateData: '(string|object)'
    },

    /**
     * Initializes the extension instance.
     *
     * @param options {Object}
     */
    initialize: function(options) {

      // Validate header selector
      var selector = options.selector;
      if (typeof selector !== 'string') {
        throw new TypeError('Selectors must be a string');
      }

      var parentElement = this._getParentElement();
      var headings = Array.prototype.slice.call(parentElement.querySelectorAll(this.options.selector));
      if (!headings) return;

      var validTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      var target = null;
      var _this = this;

      // Only include <h1> - <h6> headings
      var filteredHeadings = headings.filter(function(heading) {
        if (options.generateIds === false && !heading.id) {
          return false;
        }
        return validTags.indexOf(heading.tagName.toLowerCase()) !== -1;
      });

      var existingHeadingIds = filteredHeadings
        .map(function(heading) { return heading.id; })
        .filter(function(heading, index, arr) {
          return heading && arr.indexOf(heading) === index;
        });

      var headingNumber = 1;
      filteredHeadings.forEach(function(heading) {
        if (heading.id) {
          headingNumber ++;
        } else {
          if (options.generateIds === true) {
            var id = 'heading-' + headingNumber++;
            while (existingHeadingIds.indexOf(id) !== -1) {
              id = 'heading-' + headingNumber++;
            }
            heading.id = id;
          } else {
            headingNumber ++;
          }
        }

        if (heading.id && window.location.hash === ('#' + heading.id)) {
          target = heading;
        }

        // Maybe add an anchor link
        _this._maybeAddAnchorLink(heading);
      });

      this.render(this._structureItems(filteredHeadings));

      // Scroll the target into view if it's a dynamic element
      if (target) {
        setTimeout(function() {
          Util.scrollIntoView(target, 50)
        }, 100)
      }
    },

    /**
     * Adds an anchor link to the heading.
     * @param heading
     * @private
     */
    _maybeAddAnchorLink: function(heading) {
      if (this.options.anchorLinks === true && heading.getElementsByClassName('link-anchor').length === 0) {
        var a = document.createElement('A');
        a.className = 'link-anchor';
        a.href = '#' + heading.id;
        a.innerHTML = (
          '<svg class="fill-current" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M14.4833094,12.7886331 C14.0159137,12.3212374 13.2557698,12.3212374 12.7883741,12.7886331 C11.3861871,14.1908201 9.10109353,14.1908201 7.69873381,12.7886331 L3.45906475,8.54896403 C2.77920863,7.86910791 2.40621583,6.96733813 2.40621583,6.00423022 C2.40621583,5.0411223 2.77919137,4.13935252 3.45906475,3.4594964 C4.8612518,2.05730935 7.14159712,2.05730935 8.54870504,3.4594964 L11.1548201,6.06561151 C11.6222158,6.53300719 12.3823597,6.53300719 12.8497554,6.06561151 C13.3171511,5.59821583 13.3171511,4.83807194 12.8497554,4.37067626 L10.2436403,1.76456115 C7.90661871,-0.572460432 4.10119424,-0.572460432 1.76421583,1.76456115 C0.631122302,2.89765468 0.00789928058,4.39899281 0.00789928058,6.00423022 C0.00789928058,7.60471942 0.631122302,9.11080576 1.76421583,10.2438993 L6.00388489,14.4835683 C7.1747482,15.6497266 8.70915108,16.2351367 10.243554,16.2351367 C11.7779568,16.2351367 13.3123597,15.6497266 14.483223,14.4835683 C14.9506187,14.0161727 14.9506187,13.2560288 14.483223,12.7886331 L14.4833094,12.7886331 Z"></path>' +
            '<path d="M22.2353957,13.7564029 L17.9957266,9.51673381 C15.658705,7.17971223 11.8532806,7.17971223 9.51630216,9.51673381 C9.04890647,9.9841295 9.04890647,10.7442734 9.51630216,11.2116691 C9.98369784,11.6790647 10.7438417,11.6790647 11.2112374,11.2116691 C12.6134245,9.80948201 14.8937698,9.80948201 16.3008777,11.2116691 L20.5405468,15.4513381 C21.2204029,16.1311942 21.5933957,17.032964 21.5933957,17.9960719 C21.5933957,18.9591799 21.2204201,19.8609496 20.5405468,20.5408058 C19.1808345,21.900518 16.8107914,21.900518 15.4509065,20.5408058 L12.8494964,17.9346906 C12.3821007,17.467295 11.6219568,17.467295 11.1545612,17.9346906 C10.6871655,18.4020863 10.6871655,19.1622302 11.1545612,19.6296259 L13.7606763,22.231036 C14.8937698,23.3641295 16.3998561,23.9873525 18.0003453,23.9873525 C19.6008345,23.9873525 21.1069209,23.3641295 22.2400144,22.231036 C23.3731079,21.0979424 23.9963309,19.5918561 23.9963309,17.9913669 C23.9916095,16.3908777 23.3684029,14.8895396 22.2353094,13.756446 L22.2353957,13.7564029 Z"></path>' +
          '</svg>'
        );
        heading.appendChild(a);
      }
    },

    /**
     * Structures headings into a hierarchical collection.
     * @param headings
     * @returns {[]}
     * @private
     */
    _structureItems: function(headings) {
      var data = {
        allItems: [],
        items: []
      };
      var lastObj = undefined;
      var tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
      };

      headings.forEach(function(heading, index) {
        var level = heading.outerHTML.match(/<h([\d]).*>/)[1];
        var name = Array.prototype.slice.call(heading.childNodes)
          .map(function(child) {
            var childText = child.textContent.trim();
            return childText.replace(/[&<>]/g, function(tag) {
              return tagsToReplace[tag] || tag;
            });
          })
          .filter(function(text) { return text && text !== '#'; })
          .join(' ');

        var obj = {
          level,
          name,
          html_url: '#' + heading.id,
          parent: null,
          children: []
        };

        data.allItems.push(obj);

        // First heading
        if (index === 0) {
          data.items.push(obj);
          lastObj = obj;
        }

        else {

          if (obj.level === lastObj.level) {
            obj.parent = lastObj.parent;
            if (obj.parent) {
              obj.parent.children.push(obj);
            } else {
              data.items.push(obj);
            }
            lastObj = obj;
          }

          else if (obj.level > lastObj.level) {
            obj.parent = lastObj;
            obj.parent.children.push(obj);
            lastObj = obj;
          }

          else {
            while (1) {

              if (lastObj.level < obj.level) {
                lastObj.children.push(obj);
                lastObj = obj;
                break
              }

              if (lastObj.level === obj.level) {
                obj.parent = lastObj.parent;
                if (obj.parent) {
                  obj.parent.children.push(obj);
                } else {
                  data.items.push(obj);
                }
                lastObj = obj;
                break;
              }

              lastObj = lastObj.parent;

              if (lastObj === null) {
                data.items.push(obj);
                lastObj = obj;
                break
              }
            }
          }
        }
      });

      return data;
    },

    /**
     * Returns the parent element.
     * @returns {*}
     * @private
     */
    _getParentElement: function() {
      var parentElement = this.options.parentElement;
      if (!parentElement) {
        return document;
      }

      if (Util.isElement(parentElement)) {
        return parentElement;
      }

      if (typeof parentElement === 'string') {
        return document.querySelector(parentElement) || document;
      }
      return document;
    },

    /**
     * Renders the extension.
     * @param data
     */
    render: function(data) {
      var options = this.options;
      if (options.templateData) {
        data = Util.extend(data, options.templateData);
      }

      Util.renderTemplate(this.el, options.template, data, { replaceContent: true });

      Util.triggerEvent(this.el, Event.RENDER, {
        relatedTarget: this.el
      });
    }
  });

  window.addEventListener('load', function() {
    each('[data-element="table-of-contents"]', function(el) {
      new TableOfContents(el);
    });
  });
})();

/* tabs.js */
(function() {
  "use strict";

  var NAME = 'tabs';

  var ClassName = {
    ACTIVE: 'is-active'
  };

  var Event = {
    RENDER: NAME + ':render'
  };

  /**
   * Tabs.
   *
   * @type {component}
   */
  window.Tabs = Util.createExtension({

    defaults: {
      initial: 0,
      activeClass: 'text-primary',
      template: 'tabs',
      templateData: {}
    },

    optionTypes: {
      initial: 'number',
      activeClass: 'string',
      template: '(string|null)',
      templateData: 'object'
    },

    /**
     * Initializes the extension.
     */
    initialize: function(options) {
      if (this.el.children.length) {
        this.render(options);
      }
    },

    /**
     * Renders the extension HTML.
     */
    render: function(options) {
      var templateString = Util.getTemplateString(this.options.template);
      var id = this.id;
      var html;

      var activeClass = ClassName.ACTIVE;
      if (options.activeClass) {
        activeClass += ' ' + options.activeClass;
      }

      var dataAttributes = 'data-toggle="tab"';
      if (options.activeClass) {
        dataAttributes += ' data-active-class="' + options.activeClass + '"';
      }

      if (!templateString) {
        templateString = '' +
          '<% if (children.length) { %>' +
            '<div class="my-6">' +
              '<ul class="nav nav-tabs overflow-hidden sm:overflow-visible" id="<%= id %>" role="tablist">' +
                '<% children.forEach(function(child, index) { %>' +
                  '<li class="nav-item bg-white sm:bg-transparent" role="presentation">' +
                    '<a class="nav-link text-inherit font-medium hover:text-primary<% if (initial === index ) { %> ' + activeClass + '<% } %>" role="tab" ' + dataAttributes + ' aria-selected="<%= initial === index %>" id="tab-<%= child.id %>"  href="#<%= child.id %>">' +
                      '<%= child.title %>' +
                    '</a>' +
                  '</li>' +
                '<% }); %>' +
              '</ul>' +
              '<div class="tabs">' +
                '<% children.forEach(function(child, index) { %>' +
                  '<div class="tab list-unstyled p-5 mb-4 bg-white border border-radius-bottom<% if (initial === index ) { %> ' + ClassName.ACTIVE + '<% } %>" id="<%= child.id %>" role="tab-panel" aria-labelledby="tab-<%= child.id %>">' +
                    '<%= child.innerHTML %>' +
                  '</div>' +
                '<% }); %>' +
              '</div>' +
            '</div>' +
          '<% } %>';
      }

      var compiled = Util.template(templateString);
      var ids = [];

      var children = Array.prototype.slice.call(this.el.children).map(function(el, i) {

        // Default tab heading and ID
        var title = 'Tab ' + i;
        var tabId = el.id || id + '-' + i;

        // Get the custom tab heading and ID, if available
        if (el.hasAttribute('title')) {
          title = el.getAttribute('title');
        } else if (el.hasAttribute('data-title')) {
          title = el.getAttribute('data-title');
        } else {
          var heading = el.querySelector('.tab-heading');
          if (heading) {
            title = heading.textContent;
            if (heading.id) {
              tabId = heading.id;
            }
          }
        }

        ids.push(tabId);

        return {
          innerHTML: el.innerHTML,
          title: title,
          id: tabId
        };
      });

      // Check for a reference to a specific tab in the URL
      var hash = window.location.hash.substring(1);
      var index = ids.indexOf(hash);
      var scrollToEl = false;
      if (index !== -1 && index >= 0 && index < children.length) {
        options.initial = index;
        scrollToEl = true;
      }

      var data = {
        id: id,
        children: children,
        items: children,
        initial: options.initial,
        dataAttributes: dataAttributes,
        activeClass: activeClass,
        options: options
      };

      if (options.templateData) {
        data = Util.extend(data, options.templateData);
      }

      html = compiled(data).replace(/(^\s+|\s+$)/g, '');
      if (html) {
        this.el.insertAdjacentHTML('afterend', html);
      }

      var el = this.el.nextElementSibling;
      this.el.classList.forEach(function(className) { el.classList.add(className); });
      if (this.el.id) {
        el.id = this.el.id;
      }

      Util.triggerEvent(this.el, Event.RENDER, {
        relatedTarget: el
      });

      this.el.remove();
      this.el = el;

      if (scrollToEl) {
        setTimeout(function() {
          el.scrollIntoView();
        }, 25)
      }

      Util.triggerEvent(document, 'template:render', {
        relatedTarget: el
      });
    }
  });

  var selector = '[data-element="tabs"], .js-tabs';

  // Create tabs within tabs
  document.addEventListener('template:render', function(e) {
    each(selector, createTabs);
  });

  // Create top-level tabs when the page loads
  window.addEventListener('load', function() {
    each(selector, createTabs);
  });

  /**
   * Create a set of tabs from the given element.
   * @param el
   */
  function createTabs (el) {
    if (el.classList.contains('js-tabs') || el.hasAttribute('data-element')) {
      el.classList.remove('js-tabs');
      el.removeAttribute('data-element');
      new Tabs(el);
    }
  }

})();

/* toggles.js */
(function() {
  "use strict";

  var NAME = 'toggles';

  var Event = {
    RENDER: NAME + ':render'
  };

  /**
   * Toggles.
   *
   * @type {component}
   */
  window.Toggles = Util.createExtension({

    defaults: {

      // The index of the toggle to open on initialization
      initial: -1,

      // True if the toggles should behave as an accordion
      accordion: false,

      activeClass: 'text-primary',

      // The ID of the custom template to use when generating HTML
      template: 'toggles',

      // Additional data to expose to the template
      templateData: {}
    },

    optionTypes: {
      initial: 'number',
      activeClass: 'string',
      accordion: 'boolean',
      template: '(string|null)',
      templateData: 'object'
    },

    /**
     * Initializes the extension.
     */
    initialize: function(options) {
      if (this.el.children.length) {
        this.render(options);
      }
    },

    /**
     * Renders the extension HTML.
     */
    render: function(options) {
      var templateString = Util.getTemplateString(this.options.template);
      var id = this.id;
      var html;

      var dataAttributes = 'data-toggle="collapse"';
      if (options.activeClass) {
        dataAttributes += ' data-active-class="' + options.activeClass + '"';
      }

      if (!templateString) {
        templateString = '' +
          '<% if (children.length) { %>' +
            '<ul class="list-unstyled list-bordered my-6 border border-radius" id="<%= id %>">' +
              '<% children.forEach(function(child, index) { %>' +
                '<% var isActive = (initial === index); %>' +
                '<li class="px-5 py-1">' +
                  '<a class="toggle-title font-semibold text-inherit hover:text-primary<% if (isActive && activeClass) { %> activeClass<% } %>" ' + dataAttributes + ' aria-expanded="<%= isActive %>" href="#<%= child.id %>">' +
                    '<%= child.title %>' +
                  '</a>' +
                  '<div class="collapse<% if (isActive) { %> is-visible<% } %>" id="<%= child.id %>" <% if (parent) { %>data-parent="<%= parent %>"<% } %>>' +
                    '<div class="py-4">' +
                      '<%= child.innerHTML %>' +
                    '</div>' +
                  '</div>' +
                '</li>' +
              '<% }); %>' +
            '</ul>' +
          '<% } %>';
      }

      var compiled = Util.template(templateString);
      var ids = [];

      var children = Array.prototype.slice.call(this.el.children).map(function(el, i) {

        // Default toggle heading and ID
        var title = 'Toggle ' + i;
        var toggleId = el.id || id + '-' + i;

        if (el.hasAttribute('title')) {
          title = el.getAttribute('title');
        } else if (el.hasAttribute('data-title')) {
          title = el.getAttribute('data-title');
        } else {
          var heading = el.querySelector('.toggle-heading');
          if (heading) {
            title = heading.textContent;
            if (heading.id) {
              toggleId = heading.id;
            }
          }
        }

        ids.push(toggleId);

        return {
          innerHTML: el.innerHTML,
          title: title,
          id: toggleId
        };
      });

      // Check for a reference to a specific tab in the URL
      var hash = window.location.hash.substring(1);
      var index = ids.indexOf(hash);
      var scrollToEl = false;
      if (index !== -1 && index >= 0 && index < children.length) {
        options.initial = index;
        scrollToEl = true;
      }

      var data = {
        id: id,
        children: children,
        items: children,
        accordion: options.accordion,
        parent: options.accordion ? '#' + this.id : null,
        initial: options.initial,
        dataAttributes: dataAttributes,
        activeClass: options.activeClass
      };

      if (this.options.templateData) {
        data = Util.extend(data, this.options.templateData);
      }

      html = compiled(data).replace(/(^\s+|\s+$)/g, '');
      if (html) {
        this.el.insertAdjacentHTML('afterend', html);
      }

      var el = this.el.nextElementSibling;
      this.el.classList.forEach(function(className) { el.classList.add(className); });
      if (this.el.id) {
        el.id = this.el.id;
      }

      Util.triggerEvent(this.el, Event.RENDER, {
        relatedTarget: el
      });

      this.el.remove();
      this.el = el;

      if (scrollToEl) {
        setTimeout(function() {
          el.scrollIntoView();
        }, 25)
      }

      Util.triggerEvent(document, 'template:render', {
        relatedTarget: el
      });
    }
  });

  var selector = '[data-element="toggles"], .js-toggles';

  // Create toggles within toggles
  document.addEventListener('template:render', function(e) {
    each(selector, createToggles);
  });

  // Create top-level toggles when the page loads
  window.addEventListener('load', function() {
    each(selector, createToggles);
  });

  /**
   * Create a set of toggles from the given element.
   * @param el
   */
  function createToggles (el) {
    if (el.classList.contains('js-toggles') || el.hasAttribute('data-element')) {
      el.classList.remove('js-toggles');
      el.removeAttribute('data-element');
      new Toggles(el);
    }
  }

})();

/* carousels.js */
(function() {
  "use strict";

  // Globals
  var NAME = 'carousel';

  var Event = {
    RENDER:   NAME + ':render',
    INIT:   NAME + ':initialize',
    NEXT:  NAME + ':next',
    PREVIOUS:   NAME + ':previous',
  };

  /**
   * Carousel.
   *
   * @type {component}
   */
  window.Carousel = Util.createExtension({

    defaults: {

      // The index of the page to open on initialization
      initial: 0,

      // Selectors
      children: '.list-unstyled > li',
      previousButton: '.js-previous',
      nextButton: '.js-next',

      // The 'Next step' title
      nextTitle: 'Next',

      // The 'Previous step' title
      previousTitle: 'Previous',

      scrollToTop: false,

      // The ID of the custom template to use when generating HTML
      template: 'carousel',

      // Additional data to expose to the template
      templateData: {}
    },

    optionTypes: {
      initial: 'number',
      children: 'string',
      previousButton: 'string',
      nextButton: 'string',
      nextTitle: 'string',
      previousTitle: 'string',
      scrollToTop: 'boolean',
      template: '(string|null)',
      templateData: 'object'
    },

    /**
     * Initializes the extension.
     *
     * @param options
     */
    initialize: function(options) {
      if (!this.el.children.length) return;

      this.render();

      this.children = this.el.querySelectorAll(options.children);
      this.previousButton = this.el.querySelector(options.previousButton);
      this.nextButton = this.el.querySelector(options.nextButton);

      var initial = options.initial;
      this._activate(initial >= 0 && initial < this.children.length ? initial : 0);
      this._addEventListeners();

      Util.triggerEvent(this.el, Event.INIT, {
        relatedTarget: this.el
      });
    },

    render: function() {
      var templateString = Util.getTemplateString(this.options.template);
      var html;

      if (!templateString) {
        templateString = '' +
          '<% if (children.length) { %>' +
            '<div class="p-6 mb-4 border border-radius bg-white">' +
              '<ul class="list-unstyled">' +
                '<% children.forEach(function(child, index) { %>' +
                  '<li>' +
                    '<%= child.innerHTML %>' +
                  '</li>' +
                '<% }); %>' +
              '</ul>' +
              '<div class="mt-6">' +
                '<button class="button button-link js-previous">' +
                  '<% if (previousTitle) { %>' +
                    '<%= previousTitle %>' +
                  '<% } %>' +
                '</button>' +
                '<button class="button button-primary js-next">' +
                  '<% if (nextTitle) { %>' +
                    '<%= nextTitle %>' +
                  '<% } %>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '<% } %>';
      }

      var compiled = Util.template(templateString);
      var children = [].slice.call(this.el.children).map(function(child, i) {
        var title = 'Item ' + i;
        if (child.hasAttribute('data-title')) {
          title = child.getAttribute('data-title');
        } else {
          var heading = child.querySelector('.carousel-heading');
          if (heading) {
            title = heading.textContent;
          }
        }
        return {
          innerHTML: child.innerHTML,
          title: title
        }
      });

      var data = {
        id: this.id,
        items: children,
        children: children,
        nextTitle: this.options.nextTitle,
        previousTitle: this.options.previousTitle,
        initial: this.options.initial
      };

      if (this.options.templateData) {
        data = Util.extend(data, this.options.templateData);
      }

      html = compiled(data).replace(/(^\s+|\s+$)/g, '');

      if (html) {
        this.el.insertAdjacentHTML('afterend', html);
      }

      var el = this.el.nextElementSibling;
      this.el.classList.forEach(function(className) {
        el.classList.add(className);
      });
      if (this.el.id) {
        el.id = this.el.id;
      }
      this.el.remove();
      this.el = el;

      Util.triggerEvent(this.el, Event.RENDER, {
        relatedTarget: this.el
      });

      Util.triggerEvent(document, 'template:render', {
        relatedTarget: el
      });
    },

    /**
     * Shows the previous page.
     */
    previous: function() {
      if (this.previousButton.classList.contains(Util.classNames.DISABLED) || this.active === 0) {
        return;
      }
      this._activate(this.active - 1);
      this._maybeScroll(this.el.parentNode);
      Util.triggerEvent(this.el, Event.PREVIOUS, {
        relatedTarget: this.children[this.active]
      });
    },

    /**
     * Shows the next page.
     */
    next: function() {
      if (this.nextButton.classList.contains(Util.classNames.DISABLED) || this.active === (this.children.length - 1)) {
        return;
      }
      this._activate(this.active + 1);
      this._maybeScroll(this.el.parentNode);
      Util.triggerEvent(this.el, Event.NEXT, {
        relatedTarget: this.children[this.active]
      });
    },

    /**
     * Adds event listeners.
     */
    _addEventListeners: function() {
      this.previousButton.addEventListener('click', this._onClick.bind(this));
      this.previousButton.addEventListener('keypress', this._onClick.bind(this));
      this.nextButton.addEventListener('click', this._onClick.bind(this));
      this.nextButton.addEventListener('keypress', this._onClick.bind(this));
    },

    /**
     * Activates the item at the specified index.
     *
     * @param index
     * @private
     */
    _activate: function(index) {
      var isFirst = (index === 0);
      var isLast = (index === (this.children.length - 1));
      var visibleClassName = Util.classNames.VISIBLE;
      var disabledClassName = Util.classNames.DISABLED;

      Array.prototype.forEach.call(this.children, function(child, i) {
        if (i === index) {
          child.style.display = 'block';
          child.classList.add(visibleClassName);
        } else {
          child.style.display = 'none';
          child.classList.remove(visibleClassName);
        }
      });

      if (isFirst) {
        this.previousButton.classList.add(disabledClassName);
        this.previousButton.setAttribute('disabled', 'true');
      } else {
        this.previousButton.classList.remove(disabledClassName);
        this.previousButton.removeAttribute('disabled');
      }

      if (isLast) {
        this.nextButton.classList.add(disabledClassName);
        this.nextButton.setAttribute('disabled', 'true');
      } else {
        this.nextButton.classList.remove(disabledClassName );
        this.nextButton.removeAttribute('disabled');
      }

      this.active = index;
    },

    /**
     * Activates an item when the previous/next button is clicked.
     *
     * @param e
     * @private
     */
    _onClick: function(e) {
      if (e.type === "keypress" && e.which !== 13) {
        return;
      }

      this[e.currentTarget === this.previousButton ? 'previous' : 'next'].call(this);
      e.preventDefault();
    },

    /**
     * Scrolls to the top of the carousel if part of it is outside of the viewport.
     *
     * @param el
     * @private
     */
    _maybeScroll: function(el) {
      if (!this.options.scrollToTop) {
        return;
      }
      var rect = el.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > (window.innerHeight || document.documentElement.clientHeight)) {
        el.scrollIntoView({
          block: "start",
          inline: "nearest",
          behavior: "smooth"
        });
      }
    }
  });

  var selector = '[data-element="carousel"], .js-carousel';

  // Create carousels within carousels
  document.addEventListener('template:render', function(e) {
    each(selector, createCarousel);
  });

  // Create top-level carousels when the page loads
  window.addEventListener('load', function() {
    each(selector, createCarousel);
  });

  /**
   * Create a carousel from the given element.
   * @param el
   */
  function createCarousel (el) {
    el.classList.remove('js-carousel');
    el.removeAttribute('data-element');
    new Carousel(el);
  }

})();

/* sticky.js */
(function() {
  "use strict";

  // Globals
  var NAME = 'sticky';

  var Event = {
    INITIALIZE: NAME + ':initialize',
    STUCK: NAME + ':stuck',
    UNSTUCK: NAME + ':unstuck',
    HIDDEN: NAME + ':hidden',
    SHOWN: NAME + ':shown'
  };

  /**
   * Sticky.
   *
   * @type {component}
   */
  window.Sticky = Util.createExtension({

    defaults: {
      scrollElement: window,
      offset: 0,
      tolerance: 8,
      hide: false,
      classNames: {

        // The class name(s) to apply to the element when the extension is initialized
        sticky: 'sticky-top',

        // The class name(s) to apply to the element when it is not stuck
        unstuck: 'is-unstuck',

        // The class name(s) to apply to the element when it is stuck
        stuck: 'is-stuck',

        // The class name(s) to apply to the element when it is hidden (if applicable)
        hidden: Util.classNames.HIDDEN
      }
    },

    optionTypes: {
      scrollElement: '(window|element|string)',
      offset: 'number',
      tolerance: 'number',
      hide: 'boolean',
      classNames: '(object|string)'
    },

    /**
     * Initializes the extension.
     *
     * @param options
     */
    initialize: function(options) {

      // Do nothing if the browser does not support position:sticky
      if (!this._supportsSticky()) return;

      if (typeof this.options.classNames === 'string') this.options.classNames = this._parseJSON(this.options.classNames);

      var stickyClassNames = this._getClassName('sticky');
      if (stickyClassNames) {
        this.el.classList.add.apply(
          this.el.classList,
          stickyClassNames.split(' ')
        );
      }

      this.scrollElement = (typeof options.scrollElement === 'string' ? document.querySelector(options.scrollElement) : options.scrollElement) || window;
      this.lastScrollTop = (this.scrollElement === window) ? window.scrollY || window.pageYOffset : this.scrollElement.scrollTop;
      this.scrolling = false;

      this._addEventListeners();

      // Set the initial state
      this._onScroll();

      Util.triggerEvent(this.el, Event.INITIALIZE);
    },

    /**
     * Returns an object given a JSON string.
     * @param str
     * @returns {*}
     * @private
     */
    _parseJSON: function(str) {
      var value = undefined;
      try {
        return JSON.parse(str);
      }
      catch(e) {
        if (str.indexOf('\'')) {
          str = str.replace(/\'/g, '"');
          value = this._parseJSON(str)
        } else {
          console.error('Sticky: classNames option value is not valid.');
        }
        return value;
      }
    },

    /**
     * Returns true if the browser supports position:sticky.
     *
     * @returns {boolean}
     */
    _supportsSticky: function() {
      var prefix = ['', '-o-', '-webkit-', '-moz-', '-ms-'];
      var test = document.head.style;
      for (var i = 0; i < prefix.length; i += 1) {
        test.position = prefix[i] + 'sticky';
      }
      var supportsSticky = !!test.position;
      test.position = '';
      return supportsSticky;
    },

    /**
     * Adds event listeners.
     */
    _addEventListeners: function() {
      this.scrollElement.addEventListener('scroll', this._onScroll.bind(this));
    },

    /**
     * Returns the top position of the specified element.
     *
     * @param el
     * @returns {number}
     * @private
     */
    _getTopPosition: function(el) {
      return el.getBoundingClientRect().top + (this.scrollElement.pageYOffset || document.documentElement.scrollTop);
    },

    /**
     * Checks the position of the header on scroll.
     *
     * @private
     */
    _onScroll: function() {
      if (!this.scrolling) {
        requestAnimationFrame(this._updateClassNames.bind(this));
        this.scrolling = true;
      }
    },

    /**
     * Updates class names of the sticky element based on the scroll position.
     *
     * @private
     */
    _updateClassNames: function() {
      var scrollTop = (this.scrollElement === window) ? window.scrollY || window.pageYOffset : this.scrollElement.scrollTop;
      var parentTop = this._getTopPosition(this.el.parentElement);
      var isStuck = scrollTop > (parentTop + this.options.offset);

      // Do nothing if the state is unchanged
      if (typeof this.isStuck !== 'undefined' && this.isStuck === isStuck) {
        this.scrolling = false;
        return;
      }

      this.isStuck = isStuck;

      var stuckClassNames = this._getClassName('stuck');
      var unStuckClassNames = this._getClassName('unstuck');
      if (isStuck) {
        if (unStuckClassNames) {
          this.el.classList.remove.apply(
            this.el.classList,
            unStuckClassNames.split(' ')
          );
        }
        if (stuckClassNames) {
          this.el.classList.add.apply(
            this.el.classList,
            stuckClassNames.split(' ')
          );
        }
      } else {
        if (stuckClassNames) {
          this.el.classList.remove.apply(
            this.el.classList,
            stuckClassNames.split(' ')
          );
        }
        if (unStuckClassNames) {
          this.el.classList.add.apply(
            this.el.classList,
            unStuckClassNames.split(' ')
          );
        }
      }

      Util.triggerEvent(this.el, (isStuck? Event.STUCK : Event.UNSTUCK));

      if (this.options.hide === true) {
        var hiddenClassNames = this._getClassName('hidden');
        if (scrollTop > (this.lastScrollTop + this.options.tolerance)) {
          if (hiddenClassNames) {
            this.el.classList.add.apply(
              this.el.classList,
              hiddenClassNames.split(' ')
            );
          }
          Util.triggerEvent(this.el, Event.HIDDEN);
        } else if (scrollTop < this.lastScrollTop || scrollTop <= 0) {
          if (hiddenClassNames) {
            this.el.classList.remove.apply(
              this.el.classList,
              hiddenClassNames.split(' ')
            );
          }
          Util.triggerEvent(this.el, Event.SHOWN);
        }
      }

      this.lastScrollTop = scrollTop;
      this.scrolling = false;
    }
  });

  window.addEventListener('load', function() {
    each('[data-element="sticky"]', function(el) {
      new Sticky(el);
    });
  });
}());

/* scrollspy.js */
(function() {
  "use strict";

  var NAME = 'scrollspy';

  var Event = {
    ACTIVE:   NAME + ':active',
    INACTIVE:   NAME + ':inactive'
  };

  /**
   * Scrollspy.
   *
   * @type {component}
   */
  window.Scrollspy = Util.createExtension({

    defaults: {
      offset: 0,
      updateURL: false,
      scrollElement: null,
      activeClass: Util.classNames.ACTIVE
    },

    optionTypes: {
      offset: '(string|number)',
      updateURL: 'boolean',
      scrollElement: '(string|element|null)',
      activeClass: 'string'
    },

    /**
     * Initializes the extension.
     */
    initialize: function() {
      var links = this.el.querySelectorAll("a[href^='#']");
      if (!links.length) {
        Util.log('The scrollspy element does not contain any links to anchor elements.');
        return;
      }

      if (typeof this.options.offset === 'string') this.options.offset = parseInt(this.options.offset, 10);

      var scrollElement = this._getScrollElement();

      this._scrollElement = scrollElement.tagName === 'BODY' ? window : scrollElement;
      this._links = Array.prototype.slice.call(links);
      this._targets = this._getTargets();
      this._activeTarget = null;

      this._addEventListeners();
      this._onScroll();
    },

    /**
     * Returns the scroll element.
     *
     * @returns {*}
     * @private
     */
    _getScrollElement: function() {
      var scrollElement = this.options.scrollElement;
      if (!scrollElement) {
        return window;
      }

      if (Util.isElement(scrollElement)) {
        return scrollElement;
      }

      if (typeof scrollElement === 'string') {
        return document.querySelector(scrollElement) || window;
      }
      return window;
    },

    /**
     * Returns the target elements of the list.
     *
     * @private
     */
    _getTargets: function() {
      var scrollElement = this._scrollElement === window ? document : this._scrollElement;
      return this._links

        // Find elements in the scroll element
        .map(function(el) {
          var href = el.getAttribute('href').trim();
          var target;
          try {
            target = scrollElement.querySelector(href);
          } catch (err) {
            target = document.getElementById(href.substring(1));
          }
          return target;
        })
        .filter(function(item) {
          return item;
        })

        // Sort based on top position
        .sort(function(a, b) {
          return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
        });
    },

    /**
     * Adds the required event listeners.
     */
    _addEventListeners: function() {
      var _this = this;
      this._scrollElement.addEventListener('scroll', this._onScroll.bind(this));
      this._links.forEach(function(link) {
        link.addEventListener('click', _this._onClick.bind(_this));
      });
    },

    /**
     * Scroll the target element into view when a link referencing it is clicked.
     *
     * @param e
     * @private
     */
    _onClick: function(e) {
      var elementId = e.target.href.substring(e.target.href.indexOf('#') + 1);
      var targetElement = document.getElementById(elementId);

      // Scroll the element into view
      if (targetElement) {
        Util.scrollIntoView(targetElement, this.options.offset, this._scrollElement);
        if (targetElement.id && this.options.updateURL === true) {
          history.pushState(null, null,'#' + targetElement.id);
        }
      }
      e.preventDefault();
    },

    /**
     * Returns the scrollTop position of the scroll element.
     *
     * @returns {number}
     * @private
     */
    _getScrollTop: function() {
      return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
    },

    /**
     * Returns the scrollHeight of the scroll element.
     *
     * @returns {number}
     * @private
     */
    _getScrollHeight: function() {
      return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    },

    /**
     * Returns the height of the scroll element.
     *
     * @returns {number}
     * @private
     */
    _getOffsetHeight: function() {
      return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height
    },

    /**
     * Updates the links on page scroll.
     *
     * @private
     */
    _onScroll: function() {
      var scrollTop = this._getScrollTop() + this.options.offset;
      var scrollHeight = this._getScrollHeight();
      var maxScroll = this.options.offset + scrollHeight - this._getOffsetHeight();

      // Identify active target
      var activeTarget = null;
      if (scrollTop >= maxScroll) {
        activeTarget = this._targets[this._targets.length - 1];
      } else {
        var scrollElementTop = this._scrollElement === window ? 0 : this._scrollElement.getBoundingClientRect().top;
        for (var i = 0; i < this._targets.length; i++) {
          var target = this._targets[i];
          if ((target.getBoundingClientRect().top - scrollElementTop - (this.options.offset + 1)) > 0) {
            if (activeTarget === null) {
              activeTarget = target;
            }
            break;
          }
          activeTarget = target;
        }
      }

      // Do nothing if the active target hasn't changed
      if (this._activeTarget === activeTarget) {
        return;
      }

      this._activeTarget = activeTarget;

      // Update link class names
      var activeClassNames = this.options.activeClass;
      this._links.forEach(function(link) {
        link.classList.remove.apply(
          link.classList,
          activeClassNames.split(' ')
        );
      });

      var activeLink = this._links.filter(function(link) {
        return activeTarget && link.getAttribute('href') === ('#' + activeTarget.id);
      })[0] || null;

      this._links.filter(function(link) {
        return activeTarget && link.getAttribute('href') !== ('#' + activeTarget.id);
      });

      if (activeLink === null) return;

      activeLink.classList.add.apply(
        activeLink.classList,
        activeClassNames.split(' ')
      );

      // Trigger event for active link
      var el = this.el;
      Util.triggerEvent(activeLink, Event.ACTIVE, {
        relatedTargets: el
      });

      // Trigger event for inactive links
      this._links.forEach(function(link) {
        if (activeTarget && link.getAttribute('href') !== ('#' + activeTarget.id)) {
          Util.triggerEvent(link, Event.INACTIVE, {
            relatedTargets: el
          });
        }
      });

      // Update ancestor link class names
      var parent = activeLink.parentElement;
      while (parent !== this.el) {
        var sibling = parent.previousElementSibling;
        if (['UL','OL','NAV'].indexOf(parent.tagName) > -1 && sibling && sibling.tagName === 'A') {
          var link = this._links.filter(function(el) {
            return el === sibling;
          });
          if (link.length) {
            link.classList.add.apply(
              link.classList,
              activeClassNames.split(' ')
            );
          }
        }
        parent = parent.parentElement;
      }
    }
  });

  window.addEventListener('load', function() {
    each('[data-spy="scroll"]', function(el) {
      new Scrollspy(el);
    });
  });
})();