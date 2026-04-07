(function() {
  "use strict";

  ready(function() {
    if (typeof Plyr !== 'function') return;

    // Apply custom video player to .plyr elements
    Plyr.setup('.plyr');

    // Automatically convert YouTube and Vimeo players
    each('.content iframe', function(el, index) {
      if (/(youtube|vimeo)/.test(el.src)) {

        // Wrap video
        var div = document.createElement('div');
        el.parentNode.appendChild(div);
        div.appendChild(el);

        // Apply custom video player
        var id = 'video-' + Util.getPageId() + '-' + index;
        div.id = id;
        new Plyr('#' + id);
      }
    });
  });
})();