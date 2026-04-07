(function() {
  "use strict";

  // Submit organization form when a new organization is selected
  var requestOrganisationSelect = document.querySelector('#request-organization select');
  if (requestOrganisationSelect) {
    requestOrganisationSelect.addEventListener('change', function() {
      Util.closest(this, 'form').submit();
    });
  }

  // Do nothing if the form or comment textarea does not exist on the page
  var form = document.querySelector('form[data-form-type="comment"]');
  if (!form) {
    return;
  }

  /**
   * Solves the request.
   */
  function solveRequest() {
    solvedCheckbox.checked = true;
    form.submit();
  }

  // Maybe allow end-users to mark the request as solved
  var solvedButton = form.querySelector('button');
  var solvedCheckbox = form.querySelector('input[type="checkbox"]');
  if (solvedButton && solvedCheckbox) {
    solvedButton.addEventListener('click', solveRequest);
  }

})();