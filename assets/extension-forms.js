(function() {
  "use strict";

  /**
   * Forms extension.
   *
   * @type {component}
   */
  window.Forms = Util.createExtension({

    defaults: {
      template: null,
      templateData: {}
    },

    optionTypes: {
      template: '(string|null)',
      templateData: 'object'
    },

    /**
     * Initializes the extension.
     */
    initialize: function() {
      var newRequestForm = document.getElementById('new_request');
      if (!newRequestForm) {
        console.error('The New Request form does not exist on the page');
        return;
      }

      var formField = newRequestForm.querySelector('.request_ticket_form_id');
      if (!formField) {
        Util.log('The Ticket Form ID field does not exist on the page');
        return;
      }

      var formSelectField = newRequestForm.querySelector('#request_issue_type_select');
      if (!formSelectField.value || formSelectField.value === '-') {
        var label = formField.querySelector('label');
        this.render((label ? label.innerText : ''), this.getForms());
      }
      formField.style.display = 'block';
    },

    /**
     * Returns all available forms.
     * @returns {[]}
     */
    getForms: function() {
      var options = Array.prototype.slice.call(this.el.querySelectorAll('#request_issue_type_select option'));
      return options
        .map(function(option) {
          if (option.value === '-') return null;
          return {
            id: option.value,
            title: option.text,
            html_url: window.location.pathname + '?ticket_form_id=' + option.value
          }
        })
        .filter(function(option) { return option; });
    },

    /**
     * Renders the form list.
     * @param title
     * @param forms
     */
    render: function(title, forms) {
      var data = { title: title, forms: forms };
      if (this.options.templateData) {
        data = Util.extend(data, this.options.templateData);
      }

      Util.renderTemplate(this.el, this.options.template, data);
    }
  });
})();