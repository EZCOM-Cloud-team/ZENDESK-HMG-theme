(function() {
  "use strict";

  // Automatically convert YouTube and Vimeo players
  each('.content img', function(img, index) {
    if (!Util.closest(img, 'a')) {

      // Wrap image
      var a = document.createElement('a');
      a.href = img.src;
      a.setAttribute('data-fancybox', '');

      if (img.hasAttribute('alt')) {
        a.setAttribute('data-caption', img.getAttribute('alt'));
      }

      img.insertAdjacentElement('afterend', a);
      a.appendChild(img);
    }
  });
})();