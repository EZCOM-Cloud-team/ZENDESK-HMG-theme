(function() {
  "use strict";

  var OFFSET = 100;

  /**
   * Animates elements within a given scroll container.
   *
   * @param scrollContainer
   * @param offset
   */
  function animateElements(scrollContainer, offset) {
    var nodeList = (scrollContainer === window ? document : scrollContainer).querySelectorAll('[data-animation]');

    // Do nothing if there are no elements to animate
    if (!nodeList.length) {
      return;
    }

    // How far (px) from the bottom of the screen the element can be before being animated
    offset = offset || 0;

    var lastScrollY = 0;
    var ticking = false;
    var elements = Array.prototype.slice.call(nodeList).filter(function (element) {
      return element.getAttribute('data-animation');
    });

    /**
     * Adds animation class names to an animated element if it is within the viewport.
     */
    function update() {
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var rect = el.getBoundingClientRect();
        if ((scrollContainer.innerHeight - offset) > rect.top) {

          function onAnimationStart(e) {
            e.target.classList.add('visible');
            e.target.removeEventListener('animationstart', onAnimationStart);
          }

          el.addEventListener('animationstart', onAnimationStart);
          el.addEventListener('animationend', onAnimationStart);

          el.classList.add('animated');
          el.classList.add('animation:' + el.getAttribute('data-animation'));

          elements.splice(i, 1);
          i--;

          // Remove the scroll event listener if all animations have been applied
          if (elements.length === 0) {
            scrollContainer.removeEventListener('scroll', onScroll, false);
            scrollContainer.removeEventListener('resize', onScroll, false);
          }
        }
      }
      ticking = false;
    }

    /**
     * Runs the (throttled) update function on scroll.
     */
    function onScroll(e) {
      lastScrollY = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    // Adds the required event listeners
    scrollContainer.addEventListener('scroll', onScroll, false);
    scrollContainer.addEventListener('resize', onScroll, false);

    // Animate elements within the viewport on page load
    onScroll();
  }

  document.addEventListener("DOMContentLoaded", function() {
    animateElements(window, OFFSET)
  });

})();