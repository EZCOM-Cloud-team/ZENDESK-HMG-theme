(function() {
  "use strict";

  var NAME = 'systemStatus';

  var Event = {
    RENDER: NAME + ':render'
  };

  /**
   * System Status extension.
   *
   * @type {component}
   */
  window.SystemStatus = Util.createExtension({

    defaults: {
      subdomain: 'zenplates',
      service: 'statuspage.io',
      template: null,
      templateData: {}
    },

    optionTypes: {
      subdomain: 'string',
      service: 'string',
      template: '(string|null)',
      templateData: 'object'
    },

    /**
     * Initializes the extension.
     * @param options
     */
    initialize: function(options) {
      if (!options.subdomain) {
        console.error('No subdomain specified');
        return;
      }

      if (options.service === 'statuspage.io') {
        this.getStatuspage(options).then(this.render.bind(this));
      } else {
        console.error('Invalid service specified');
      }
    },

    /**
     * Returns status information from statuspage.io.
     * @param options
     * @returns {Promise<string | number>}
     */
    getStatuspage: function(options) {
      var url = 'https://' + options.subdomain + '.statuspage.io/api/v2/status.json';
      return fetch(url)
        .then(function(response) {
          return response.json()
        })
        .then(function(json) {
          return json.status;
        });
    },

    /**
     * Renders the HTML for the status indicator.
     */
    render: function(status) {
      var templateString = Util.getTemplateString(this.options.template);
      var html;

      if (!templateString) {
        if (this.options.service === 'statuspage.io') {
          templateString = '' +
            '<% if (indicator) { %>' +
              '<a class="nav-link inline-flex align-items-center" href="https://<%= subdomain %>.statuspage.io" target="_blank">' +
                '<% if (indicator === "critical") { %><span class="w-3 h-3 flex-shrink-0 bg-red-500 circle"></span><% } %>' +
                '<% if (indicator === "major") { %><span class="w-3 h-3 flex-shrink-0 bg-orange-500 circle"></span><% } %>' +
                '<% if (indicator === "minor") { %><span class="w-3 h-3 flex-shrink-0 bg-orange-500 circle"></span><% } %>' +
                '<% if (indicator === "none") { %><span class="w-3 h-3 flex-shrink-0 bg-green-500 circle"></span><% } %>' +
                '<% if (["critical", "major", "minor", "none"].indexOf(indicator) === -1) { %><span class="w-3 h-3 flex-shrink-0 bg-gray-500 circle"></span><% } %>' +
                '<span class="ml-3"><%= description %></span>' +
              '</a>' +
            '<% } %>';
        }
      }

      var compiled = Util.template(templateString);
      var data = {
        subdomain: this.options.subdomain,
        indicator: status.indicator,
        description: status.description
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
    each('[data-element="system-status"]', function(el) {
      new SystemStatus(el);
    });
  });
})();