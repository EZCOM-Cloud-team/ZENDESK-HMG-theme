(function() {
  "use strict";

  var NAME = 'backToTop';

  var Event = {
    RENDER: NAME + ':render',
    VISIBLE: NAME + ':visible',
    INVISIBLE: NAME + ':invisible'
  };

  /**
   * Back To Top extension.
   *
   * @type {component}
   */
  window.BackToTop = Util.createExtension({

    defaults: {
      threshold: null,
      template: null,
      templateData: {}
    },

    optionTypes: {
      threshold: '(string|number|null)',
      template: '(string|null)',
      templateData: 'object'
    },

    /**
     * Initializes the extension.
     * @param options
     */
    initialize: function(options) {
      this.el.classList.add('opacity-0', 'z-fixed');
      if (this.options.threshold) options.threshold = parseInt(options.threshold);
      this.setThreshold();
      this.render();
      this.addEventListeners();
      this.onScroll();
      this.el.classList.add('transition');
    },

    /**
     * Adds the required event listeners.
     */
    addEventListeners: function() {
      window.addEventListener('scroll', this.onScroll.bind(this));
      window.addEventListener('resize', this.setThreshold.bind(this));
      this.el.addEventListener('click', this.scrollToTop.bind(this));
    },

    /**
     * Determines whether the Back to Top link should be visible.
     */
    onScroll: function() {
      if ((document.documentElement.scrollTop || document.body.scrollTop) > this.threshold) {
        this.show();
      } else {
        this.hide();
      }
    },

    setThreshold: function() {
      this.threshold = this.options.threshold !== null ? this.options.threshold : document.documentElement.clientHeight;
    },

    /**
     * Shows the Back to Top link.
     */
    show: function() {
      var el = this.el;
      el.classList.remove('opacity-0');
      Util.onTransitionEnd(el, function() {
        Util.triggerEvent(el, Event.VISIBLE, {
          relatedTarget: el
        });
      });
    },

    /**
     * Hides the Back to Top link.
     */
    hide: function() {
      var el = this.el;
      el.classList.add('opacity-0');
      Util.onTransitionEnd(el, function() {
        Util.triggerEvent(el, Event.INVISIBLE, {
          relatedTarget: el
        });
      });
    },

    /**
     * Scrolls to the top of the page.
     * @param e
     */
    scrollToTop: function(e) {
      window.scrollTo({top: 0, behavior: 'smooth'});
      e.preventDefault();
    },

    /**
     * Renders the Back to Top link.
     */
    render: function() {
      var templateString = Util.getTemplateString(this.options.template);
      var html;

      if (!templateString) {
        templateString = '' +
          '<a class="flex button button-primary button-sm p-4 m-4 circle" href="#">' +
            '<svg class="fill-current text-primary-inverse" width="20" height="20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">' +
              '<polygon points="12.4,40.1 25.8,53.6 40.5,38.8 40.5,97.5 59.5,97.5 59.5,38.8 74.2,53.6 87.6,40.1 50,2.5" />' +
            '</svg>' +
          '</a>';
      }

      var compiled = Util.template(templateString);
      var data = {
        threshold: this.options.threshold
      };

      if (this.options.templateData) {
        data = Util.extend(data, this.options.templateData);
      }

      html = compiled(data).replace(/(^\s+|\s+$)/g, '');
      if (html) {
        this.el.innerHTML = html;
      }

      Util.triggerEvent(this.el, Event.RENDER, {
        relatedTarget: this.el
      });
    }
  });

  window.addEventListener('load', function() {
    each('[data-element="back-to-top"]', function(el) {
      new BackToTop(el);
    });
  });
})();