(function() {
  "use strict";

  var registeredAssets = window.Theme.assets || {};
  var assetsByPrefix = {};

  var loadAsset = function(el) {
    var assetId = el.getAttribute('data-asset-id');
    var defaultAssetId = el.getAttribute('data-default-asset-id');

    if (!assetId) {
      if (!defaultAssetId) {
        console.log('No asset ID was provided.');
        return;
      }
      assetId = defaultAssetId;
    }

    if (assetId.indexOf('*') !== -1) {
      var prefix = assetId.substr(0, assetId.indexOf('*'));
      assetsByPrefix[prefix] = assetsByPrefix[prefix] || 0;
      assetId = assetId.replace('*', (++assetsByPrefix[prefix]).toString());
    }

    var url = '';
    if (!registeredAssets.hasOwnProperty(assetId) || !registeredAssets[assetId]) {
      if (!registeredAssets.hasOwnProperty(defaultAssetId) || !registeredAssets[defaultAssetId]) {
        Util.log('Asset with ID ' + assetId + ' has not been registered.');
        return;
      }
      url = registeredAssets[defaultAssetId];
    } else {
      url = registeredAssets[assetId];
    }

    // if (!(/\.(gif|jpg|jpeg|tiff|png|svg)$/i).test(url)) {
    //   Util.log('Asset with ID ' + assetId + ' is not a valid image.');
    //   return;
    // }

    // If the element is an image, update the src attribute
    if (el.tagName === 'IMG') {
      el.src = url;
    } else {
      // Replace the existing element with an image
      var img = document.createElement('img');
      img.src = url;
      img.role = 'presentation';
      Array.prototype.slice.call(el.attributes).forEach(function(attr) {
        img.setAttribute(attr.name, attr.value);
      });

      el.parentNode.insertBefore(img, el);
      el.remove();
      el = img;
    }

    if (el.hasAttribute('data-inline-svg')) {
      Util.replaceWithSVG(el);
    }
  };

  ready(function() {
    var imageElements = document.querySelectorAll('[data-asset="image"]');
    if (!imageElements.length) return;

    // Do nothing if no assets have been registered
    if (!registeredAssets || typeof registeredAssets !== 'object') {
      Util.error('No assets have been registered.');
      return;
    }

    Array.prototype.forEach.call(imageElements, loadAsset);
  });
})();