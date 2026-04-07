(function() {
  "use strict";

  var NAME = 'notification';

  var Event = {
    RENDER: NAME + ':render'
  };

  /**
   * Notifications extension.
   *
   * @type {component}
   */
  window.Notification = Util.createExtension({

    defaults: {
      id: null,
      content: '',
      type: 'error',
      labels: '',
      dismissible: false,
      template: null,
      templateData: {}
    },

    optionTypes: {
      id: '(string|null)',
      content: 'string',
      type: 'string',
      labels: 'string',
      dismissible: 'boolean',
      template: '(string|null)',
      templateData: 'object'
    },

    /**
     * Initializes the extension.
     * @param options
     */
    initialize: function(options) {

      if (!options.labels && !options.content) {
        console.error('You must provide content or one or more article labels');
        return;
      }

      if (['error', 'warning', 'success', 'tip'].indexOf(options.type) === -1) {
        console.error('An invalid notification type was provided');
        this.options.type = options.type = 'error';
      }

      if (options.dismissible && !options.labels && !options.id) {
        console.error('Dismissible notifications must be given a valid ID');
        this.options.dismissible = options.dismissible = false;
      }

      if (options.labels) {
        this.getArticles(options.labels)
          .then(function(json) {
            return json.results
              .map(function(article) {
                if (options.dismissible && window.sessionStorage.getItem(article.id + '_dismissed') === 'true') {
                  return false;
                }
                return {
                  id: article.id,
                  title: article.title,
                  body: article.body,
                  body_plain: article.body.replace(/(<([^>]+)>)/gi, ""),
                  type: options.type,
                  url: article['html_url']
                }
              })
              .filter(function(notification) {
                return notification;
              })
          })
          .then(this.render.bind(this));
      } else {
        var notifications = [];
        var bodyPlain = options.content.replace(/(<([^>]+)>)/gi, "");
        if (options.dismissible && options.id && window.sessionStorage.getItem(options.id + '_dismissed') === 'true') {
          return;
        }
        notifications.push({
          id: options.id,
          title: null,
          body: options.content,
          body_plain: bodyPlain,
          type: options.type,
          url: null
        });
        this.render(notifications);
      }
    },

    /**
     * Returns all articles with the given labels.
     * @param labels
     * @returns {Promise}
     */
    getArticles: function(labels) {
      var url = '/api/v2/help_center/articles/search.json?label_names=' + labels;
      return fetch(url)
        .then(function(response) {
          return response.json()
        });
    },

    /**
     * Renders the HTML for the notification(s).
     */
    render: function(notifications) {
      var templateString = Util.getTemplateString(this.options.template);
      var html;

      this.notification = notifications;

      if (!templateString) {
        templateString = '' +
          '<% if (notifications.length) { %>' +
            '<% notifications.forEach(function(notification, index) { %>' +
              '<% if (notification.type === "error") { %>' +
                '<div class="relative p-4 mb-4 text-white bg-red-500 transition opacity-100"<% if (dismissible && notification.id) { %> data-notification-id="<%= notification.id %>"<%} %>>' +
                  '<div class="flex align-items-start">' +
                    '<svg class="svg-icon fill-current bottom-0 font-size-3xl mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                      '<g stroke="none" stroke-width="1" fill-rule="evenodd">' +
                        '<rect opacity="0" x="0" y="0" width="24" height="24"></rect>' +
                        '<circle opacity="0.3" cx="12" cy="12" r="10"></circle>' +
                        '<rect x="11" y="7" width="2" height="8" rx="1"></rect>' +
                        '<rect x="11" y="16" width="2" height="2" rx="1"></rect>' +
                      '</g>' +
                    '</svg>' +
                    '<p class="m-1 font-medium mr-auto"><%= notification.body_plain %></p>' +
                    '<% if (dismissible && notification.id) { %>' +
                      '<button class="not-a-button js-close">' +
                        '<svg class="svg-icon font-size-2xl fill-current cursor-pointer" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
                          '<path d="M17.414,16l9.293-9.293c0.391-0.391,0.391-1.023,0-1.414s-1.023-0.391-1.414,0L16,14.586L6.707,5.293  c-0.391-0.391-1.023-0.391-1.414,0s-0.391,1.023,0,1.414L14.586,16l-9.293,9.293c-0.391,0.391-0.391,1.023,0,1.414  C5.488,26.902,5.744,27,6,27s0.512-0.098,0.707-0.293L16,17.414l9.293,9.293C25.488,26.902,25.744,27,26,27s0.512-0.098,0.707-0.293  c0.391-0.391,0.391-1.023,0-1.414L17.414,16z"/>' +
                        '</svg>' +
                      '</button>' +
                    '<% } %>' +
                  '</div>' +
                '</div>' +
              '<% } %>' +
              '<% if (notification.type === "warning") { %>' +
                '<div class="relative p-4 mb-4 text-white bg-orange-500 transition opacity-100"<% if (dismissible && notification.id) { %> data-notification-id="<%= notification.id %>"<%} %>>' +
                  '<div class="flex align-items-start">' +
                    '<svg class="svg-icon fill-current bottom-0 font-size-3xl mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                      '<g stroke="none" stroke-width="1" fill-rule="evenodd">' +
                        '<rect opacity="0" x="0" y="0" width="24" height="24"></rect>' +
                        '<path d="M11.1669899,4.49941818 L2.82535718,19.5143571 C2.557144,19.9971408 2.7310878,20.6059441 3.21387153,20.8741573 C3.36242953,20.9566895 3.52957021,21 3.69951446,21 L21.2169432,21 C21.7692279,21 22.2169432,20.5522847 22.2169432,20 C22.2169432,19.8159952 22.1661743,19.6355579 22.070225,19.47855 L12.894429,4.4636111 C12.6064401,3.99235656 11.9909517,3.84379039 11.5196972,4.13177928 C11.3723594,4.22181902 11.2508468,4.34847583 11.1669899,4.49941818 Z" opacity="0.3"></path>' +
                        '<rect x="11" y="9" width="2" height="7" rx="1"></rect>' +
                        '<rect x="11" y="17" width="2" height="2" rx="1"></rect>' +
                      '</g>' +
                    '</svg>' +
                    '<p class="m-1 font-medium mr-auto"><%= notification.body_plain %></p>' +
                    '<% if (dismissible && notification.id) { %>' +
                      '<button class="not-a-button js-close">' +
                        '<svg class="svg-icon font-size-2xl fill-current cursor-pointer" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
                          '<path d="M17.414,16l9.293-9.293c0.391-0.391,0.391-1.023,0-1.414s-1.023-0.391-1.414,0L16,14.586L6.707,5.293  c-0.391-0.391-1.023-0.391-1.414,0s-0.391,1.023,0,1.414L14.586,16l-9.293,9.293c-0.391,0.391-0.391,1.023,0,1.414  C5.488,26.902,5.744,27,6,27s0.512-0.098,0.707-0.293L16,17.414l9.293,9.293C25.488,26.902,25.744,27,26,27s0.512-0.098,0.707-0.293  c0.391-0.391,0.391-1.023,0-1.414L17.414,16z"/>' +
                        '</svg>' +
                      '</button>' +
                    '<% } %>' +
                  '</div>' +
                '</div>' +
              '<% } %>' +
              '<% if (notification.type === "success") { %>' +
                '<div class="relative p-4 mb-4 text-white bg-green-500 transition opacity-100"<% if (dismissible && notification.id) { %> data-notification-id="<%= notification.id %>"<%} %>>' +
                  '<div class="flex align-items-start">' +
                    '<svg class="svg-icon fill-current bottom-0 font-size-3xl mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                      '<g stroke="none" stroke-width="1" fill-rule="evenodd">' +
                        '<rect opacity="0" x="0" y="0" width="24" height="24"></rect>' +
                        '<circle opacity="0.3" cx="12" cy="12" r="10"></circle>' +
                        '<path d="M16.7689447,7.81768175 C17.1457787,7.41393107 17.7785676,7.39211077 18.1823183,7.76894473 C18.5860689,8.1457787 18.6078892,8.77856757 18.2310553,9.18231825 L11.2310553,16.6823183 C10.8654446,17.0740439 10.2560456,17.107974 9.84920863,16.7592566 L6.34920863,13.7592566 C5.92988278,13.3998345 5.88132125,12.7685345 6.2407434,12.3492086 C6.60016555,11.9298828 7.23146553,11.8813212 7.65079137,12.2407434 L10.4229928,14.616916 L16.7689447,7.81768175 Z" fill-rule="nonzero"></path>' +
                      '</g>' +
                    '</svg>' +
                    '<p class="m-1 font-medium mr-auto"><%= notification.body_plain %></p>' +
                    '<% if (dismissible && notification.id) { %>' +
                      '<button class="not-a-button js-close">' +
                        '<svg class="svg-icon font-size-2xl fill-current cursor-pointer" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
                          '<path d="M17.414,16l9.293-9.293c0.391-0.391,0.391-1.023,0-1.414s-1.023-0.391-1.414,0L16,14.586L6.707,5.293  c-0.391-0.391-1.023-0.391-1.414,0s-0.391,1.023,0,1.414L14.586,16l-9.293,9.293c-0.391,0.391-0.391,1.023,0,1.414  C5.488,26.902,5.744,27,6,27s0.512-0.098,0.707-0.293L16,17.414l9.293,9.293C25.488,26.902,25.744,27,26,27s0.512-0.098,0.707-0.293  c0.391-0.391,0.391-1.023,0-1.414L17.414,16z"/>' +
                        '</svg>' +
                      '</button>' +
                    '<% } %>' +
                  '</div>' +
                '</div>' +
              '<% } %>' +
              '<% if (notification.type === "tip") { %>' +
                '<div class="relative p-4 text-white bg-primary transition opacity-100"<% if (dismissible && notification.id) { %> data-notification-id="<%= notification.id %>"<%} %>>' +
                  '<div class="flex align-items-start">' +
                    '<svg class="svg-icon fill-current bottom-0 font-size-3xl mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                      '<g stroke="none" stroke-width="1" fill-rule="evenodd">' +
                        '<rect opacity="0" x="0" y="0" width="24" height="24"></rect>' +
                        '<circle opacity="0.3" cx="12" cy="12" r="10"></circle>' +
                        '<path d="M12,16 C12.5522847,16 13,16.4477153 13,17 C13,17.5522847 12.5522847,18 12,18 C11.4477153,18 11,17.5522847 11,17 C11,16.4477153 11.4477153,16 12,16 Z M10.591,14.868 L10.591,13.209 L11.851,13.209 C13.447,13.209 14.602,11.991 14.602,10.395 C14.602,8.799 13.447,7.581 11.851,7.581 C10.234,7.581 9.121,8.799 9.121,10.395 L7.336,10.395 C7.336,7.875 9.31,5.922 11.851,5.922 C14.392,5.922 16.387,7.875 16.387,10.395 C16.387,12.915 14.392,14.868 11.851,14.868 L10.591,14.868 Z"></path>' +
                      '</g>' +
                    '</svg>' +
                    '<p class="m-1 font-medium mr-auto"><%= notification.body_plain %></p>' +
                    '<% if (dismissible && notification.id) { %>' +
                      '<button class="not-a-button js-close">' +
                        '<svg class="svg-icon font-size-2xl fill-current cursor-pointer" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
                          '<path d="M17.414,16l9.293-9.293c0.391-0.391,0.391-1.023,0-1.414s-1.023-0.391-1.414,0L16,14.586L6.707,5.293  c-0.391-0.391-1.023-0.391-1.414,0s-0.391,1.023,0,1.414L14.586,16l-9.293,9.293c-0.391,0.391-0.391,1.023,0,1.414  C5.488,26.902,5.744,27,6,27s0.512-0.098,0.707-0.293L16,17.414l9.293,9.293C25.488,26.902,25.744,27,26,27s0.512-0.098,0.707-0.293  c0.391-0.391,0.391-1.023,0-1.414L17.414,16z"/>' +
                        '</svg>' +
                      '</button>' +
                    '<% } %>' +
                  '</div>' +
                '</div>' +
              '<% } %>' +
            '<% }); %>' +
          '<% } %>';
      }

      var compiled = Util.template(templateString);
      var data = {
        notifications: notifications,
        dismissible: this.options.dismissible
      };

      if (this.options.templateData) {
        data = Util.extend(data, this.options.templateData);
      }

      html = compiled(data).replace(/(^\s+|\s+$)/g, '');
      if (html) {
        this.el.innerHTML = html;
      }

      if (this.options.dismissible) {
        this.addEventListeners();
      }

      Util.triggerEvent(this.el, Event.RENDER, {
        relatedTarget: this.el
      });
    },

    /**
     * Adds the required event listeners.
     */
    addEventListeners: function() {
      var buttons = this.el.querySelectorAll('.js-close');
      var _this = this;
      Array.prototype.forEach.call(buttons, function(button) {
        button.addEventListener('click', _this.dismiss.bind(_this));
      });
    },

    /**
     * Dismisses a notification.
     * @param e
     */
    dismiss: function(e) {
      var el = Util.closest(e.target, '[data-notification-id]');
      if (!el) return;

      var id = el.getAttribute('data-notification-id');
      Util.onTransitionEnd(el, function() {
        el.remove();
        window.sessionStorage.setItem(id + '_dismissed', 'true');
      });
      el.classList.remove('opacity-100');
      Util.reflow(el);
      el.classList.add('opacity-0');
    }
  });

  window.addEventListener('load', function() {
    each('[data-element="notification"]', function(el) {
      new Notification(el);
    });
  });
})();