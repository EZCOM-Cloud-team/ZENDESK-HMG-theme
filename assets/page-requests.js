(function() {
  "use strict";

  function saveFocus() {
    var activeElementId = document.activeElement.getAttribute("id");
    sessionStorage.setItem('returnFocusTo', '#' + activeElementId);
  }

  // Submit requests filter form on status or organization change in the request list page
  each('#request-status-select, #request-organization-select', function(el) {
    el.addEventListener('change', function(e) {
      e.stopPropagation();
      saveFocus();
      Util.closest(this, 'form').submit();
    });
  });

  // Submit requests filter form on search in the request list page
  var quickSearch = document.querySelector('#quick-search');
  quickSearch && quickSearch.addEventListener('keyup', function(e) {
    if (e.keyCode === 13) { // Enter key
      e.stopPropagation();
      saveFocus();
      Util.closest(this, 'form').submit();
    }
  });

  var returnFocusTo = sessionStorage.getItem('returnFocusTo');
  if (returnFocusTo) {
    sessionStorage.removeItem('returnFocusTo');
    var returnFocusToEl = document.querySelector(returnFocusTo);
    returnFocusToEl && returnFocusToEl.focus && returnFocusToEl.focus();
  }

})();