
/**
 * Executes a callback function when the page is ready.
 *
 * @param callback
 */
var ready = function(callback) {
  if (document.readyState !== "loading") callback();
  else document.addEventListener("DOMContentLoaded", callback);
};

/**
 * Executes a callback function for each element returned by a given selector.
 *
 * @param selector
 * @param callback
 */
var each = function(selector, callback) {
  Array.prototype.forEach.call(document.querySelectorAll(selector), function(el, index) {
    callback(el, index);
  });
};

// True if debug mode is enabled
var DEBUG = false;

// True if sideloading should be used when fetching data from the Zendesk REST API
// @see https://developer.zendesk.com/documentation/ticketing/using-the-zendesk-api/side_loading/
var SIDELOADING = false;

var ClassName = {
  HOVER:     'is-hovering',
  ACTIVE:    'is-active',
  FOCUS:     'is-focused',
  VISIBLE:   'is-visible',
  DISABLED:  'is-disabled',
  OPEN:      'is-open',
  HIDDEN:    'is-hidden',
  INVISIBLE: 'invisible',
  EXPANDED:  'is-expanded',
  SELECTED:  'is-selected'
};

var Util = (function() {
  "use strict";

  var MINUTE = 1000 * 60;
  var HOUR = MINUTE * 60;

  // Inflight request resolve functions awaiting data
  // @see Util.request()
  var requests = {};

  var API = {

    locale: Theme.locale,

    classNames: ClassName,

    endpoints: {
      'articles': {
        'product': 'help_center/' + Theme.locale,
        'endpoint': 'articles.json',
        'sideloads': ['categories', 'sections', 'users', 'translations'],
        'properties': ["id",  "title", "name", "html_url", "position", "category_id", "parent_section_id", "section_id", "promoted", "sorting"]
      },
      'sections': {
        'product': 'help_center/' + Theme.locale,
        'endpoint': 'sections.json',
        'sideloads': ['categories', 'translations'],
        'properties': ["id",  "name", "html_url", "position", "category_id", "parent_section_id", "sorting"]
      },
      'categories': {
        'product': 'help_center/' + Theme.locale,
        'endpoint': 'categories.json',
        'sideloads': ['translations'],
        'properties': ["id",  "name", "html_url", "position", "sorting"]
      },
      'posts': {
        'product': 'community',
        'endpoint': 'posts.json',
        'sideloads': ['topics', 'users'],
        'properties': ["id",  "title", "html_url", "position", "featured", "pinned", "topic_id"]
      },
      'topics': {
        'product': 'community',
        'endpoint': 'topics.json',
        'sideloads': [],
        'properties': ["id",  "name", "html_url", "position"]
      }
    },

    /**
     * Prints to the browser console if debugging is enabled.
     */
    log: function() {
      if (DEBUG === true) {
        console.log.apply(this, arguments);
      }
    },

    /**
     * Returns the type of a given value.
     *
     * @param value
     * @returns {string}
     */
    typeOf: function(value) {
      return {}.toString.call(value).match(/\s([a-z]+)/i)[1].toLowerCase();
    },

    /**
     * Returns an array of objects that are unique with respect to a particular property.
     *
     * @param array
     * @param property
     * @returns {*}
     */
    unique: function unique(array, property) {
      var properties = array.map(function(obj) {
        return obj[property];
      });
      return array.filter(function(obj, i) {
        return properties.indexOf(obj[property]) === i;
      });
    },

    /**
     * Returns an object composed of properties from another object.
     *
     * @param obj
     * @param props
     * @returns {{}}
     */
    pick: function pick(obj, props) {
      var picked = {};
      if (!obj) {
        return picked;
      }

      if (!props || !props.length) {
        return obj;
      }

      props.forEach(function(prop) {
        if (obj.hasOwnProperty(prop)) {
          picked[prop] = obj[prop];
        }
      });
      return picked;
    },

    /**
     * Returns the closest ancestor of the current element (or the current element itself) which matches the selectors.
     *
     * @param el
     * @param selector
     * @returns {*}
     */
    closest: function(el, selector) {
      if (Element.prototype.closest) {
        return el.closest(selector);
      }
      do {
        if (Element.prototype.matches && el.matches(selector)
          || Element.prototype.msMatchesSelector && el.msMatchesSelector(selector)
          || Element.prototype.webkitMatchesSelector && el.webkitMatchesSelector(selector)) {
          return el;
        }
        el = el.parentElement || el.parentNode;
      } while (el !== null && el.nodeType === 1);
      return null;
    },

    /**
     * Returns a function that will be called after it stops being called for `wait` milliseconds.
     *
     * If `immediate` is passed, trigger the function on the leading edge instead of the trailing edge.
     *
     * @see https://davidwalsh.name/javascript-debounce-function
     *
     * @param func
     * @param wait
     * @param immediate
     * @returns {Function}
     */
    debounce: function(func, wait, immediate) {
      var timeout;
      return function() {
        var context = this;
        var args = arguments;
        var callNow = immediate && !timeout;

        var later = function() {
          timeout = null;
          if (!immediate) {
            func.apply(context, args);
          }
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) {
          func.apply(context, args);
        }
      };
    },

    /**
     * Throttles a given function.
     *
     * @param func
     * @param limit
     * @returns {Function}
     */
    throttle: function(func, limit) {
      var inThrottle;
      return function() {
        var args = arguments;
        var context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(function() {
            return inThrottle = false;
          }, limit);
        }
      }
    },

    /**
     * Returns true if the given item is an object.
     *
     * @param obj
     * @returns {*|boolean}
     */
    isObject: function(obj) {
      return (obj && typeof obj === 'object' && !Array.isArray(obj));
    },

    /**
     * Extends a target object with properties from a source object.
     *
     * @param target
     * @param source
     * @returns {*}
     */
    extend: function(target, source) {
      var output = Object.assign({}, target);
      if (API.isObject(target) && API.isObject(source)) {
        Object.keys(source).forEach(function(key) {
          if (API.isObject(source[key])) {
            if (!(key in target)) {
              var obj = {};
              obj[key] =  source[key];
              Object.assign(output, obj);
            } else {
              if (API.isElement(source[key])) {
                output[key] = source[key];
              } else {
                output[key] = API.extend(target[key], source[key]);
              }
            }
          } else {
            output[key] = source[key];
          }
        });
      }
      return output;
    },

    /**
     * Returns true if the given object is an HTML element.
     *
     * @param obj
     * @returns {*|boolean}
     */
    isElement: function(obj) {
      return obj instanceof Element || obj instanceof HTMLDocument;
    },

    /**
     * Returns true if the current URL (or the one specified) is the Home page.
     * @param url
     * @returns {boolean}
     */
    isHomePage: function(url) {
      url = url || window.location.href;
      return /^http(s)?:\/\/[^\/?#]+(\/hc(\/[a-z-0-9_]+)?(\/)?(signin)?([?]([^?\/]+)?)?([#]([^#\/]+)?)?)?$/.test(url,);
    },

    /**
     * Returns true if the current URL (or the one specified) is a category.
     * @param url
     * @returns {boolean}
     */
    isCategoryPage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?categories\//i.test(url);
    },

    /**
     * Returns true if the current URL (or the one specified) is a section.
     * @param url
     * @returns {boolean}
     */
    isSectionPage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?sections\//i.test(url);
    },

    /**
     * Returns true if the current URL (or the one specified) is an article.
     * @param url
     * @returns {boolean}
     */
    isArticlePage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?articles\//i.test(url);
    },

    /**
     * Returns true if the current URL (or the one specified) is the Search Results page.
     * @param url
     * @returns {boolean}
     */
    isSearchResultsPage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?search\?*.*/i.test(url);
    },

    /**
     * Returns true if the current URL (or the one specified) is the New Request page.
     * @param url
     * @returns {boolean}
     */
    isNewRequestPage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?requests\/new(\/)?([?#].*)?$/i.test(url);
    },

    /**
     * Returns true if a request form is being viewed on the New Request page.
     * @param url
     * @returns {boolean}
     */
    isNewRequestForm: function(url) {
      var ticketFormIdField = document.getElementById('request_ticket_form_id');
      return API.isNewRequestPage(url) && ((ticketFormIdField && ticketFormIdField.value) || API.getURLParameter('ticket_form_id'));
    },

    /**
     * Returns true if the current URL (or the one specified) is the Community Topic List page.
     * @param url
     * @returns {boolean}
     */
    isTopicListPage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?community\/topics(\/)?([?#].*)?$/i.test(url);
    },

    /**
     * Returns true if the current URL (or the one specified) is the Community Post List page.
     * @param url
     * @returns {boolean}
     */
    isPostListPage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?community\/posts(\/)?([?#].*)?$/i.test(url);
    },

    /**
     * Returns true if the current URL (or the one specified) is the Community Topic page.
     * @param url
     * @returns {boolean}
     */
    isTopicPage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?community\/topics\/[^\/?#]+(\/)?([?#].*)?$/i.test(url);
    },

    /**
     * Returns true if the current URL (or the one specified) is the Community Post page.
     * @param url
     * @returns {boolean}
     */
    isPostPage: function(url) {
      url = url || window.location.href;
      return !API.isNewPostPage(url) && /\/hc\/([a-z-0-9_]+\/)?community\/posts\/[^\/?#]+(\/)?([?#].*)?$/i.test(url);
    },

    /**
     * Returns true if the current URL (or the one specified) is the Community New Post page.
     * @param url
     * @returns {boolean}
     */
    isNewPostPage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?community\/posts\/new(\/)?([?#].*)?$/i.test(url);
    },

    /**
     * Returns true if the current URL (or the one specified) is the User Profile page.
     * @param url
     * @returns {boolean}
     */
    isUserProfilePage: function(url) {
      url = url || window.location.href;
      return /\/hc\/([a-z-0-9_]+\/)?profiles\/[^\/?#]+(\/)?([?#].*)?$/i.test(url);
    },

    /**
     * Sorts objects by created date (ascending).
     * @param a
     * @param b
     * @returns {number}
     */
    sortByDate: function(a, b) {
      return new Date(a['created_at']) - new Date(b['created_at']);
    },

    /**
     * Sorts objects by position.
     * @param a
     * @param b
     * @returns {number}
     */
    sortByPosition: function(a, b) {
      return a.position - b.position;
    },

    /**
     * Sorts objects by name or title.
     * @param a
     * @param b
     * @returns {number}
     */
    sortByName: function(a, b) {
      if ((a.title || a.name) < (b.title || b.name)) return -1;
      if ((a.title || a.name) > (b.title || b.name)) return 1;
      return 0;
    },

    /**
     * Sorts objects by promoted status.
     * @param a
     * @param b
     * @returns {number}
     */
    sortByPromoted: function(a, b) {
      if (a.hasOwnProperty('promoted') && b.hasOwnProperty('promoted')) {
        if (a.promoted > b.promoted) return -1;
        if (b.promoted > a.promoted) return 1;
      }
      return 0;
    },

    /**
     * Returns the object ID associated with the current URL (or the one specified).
     * @param url
     * @returns {number | null}
     */
    getPageId: function(url) {
      url = url || window.location.href;
      var links = url.split('/');
      var result = links[links.length - 1];
      return parseInt(result, 10) || null;
    },

    /**
     * Returns the value of a named URL parameter.
     *
     * @param name
     * @param url
     * @returns {string}
     */
    getURLParameter: function(name, url) {
      url = url || location.search;
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(url);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    },

    /**
     * Sets the value of a named URL parameter.
     *
     * @param url
     * @param name
     * @param value
     * @returns {string}
     */
    setURLParameter: function(url, name, value) {
      name = encodeURIComponent(name);
      value = encodeURIComponent(value);

      var baseUrl = url.split('?')[0];
      var newParam = name + '=' + value;
      var params = '?' + newParam;
      var urlQueryString = (url.split('?')[1] === undefined) ? '' : '?' + url.split('?')[1];

      if (urlQueryString) {
        var updateRegex = new RegExp('([\?&])' + name + '[^&]*');
        var removeRegex = new RegExp('([\?&])' + name + '=[^&;]+[&;]?');

        if (typeof value === 'undefined' || value === null || value === '') {
          params = urlQueryString.replace(removeRegex, "$1");
          params = params.replace(/[&;]$/, "");
        } else if (urlQueryString.match(updateRegex) !== null) {
          params = urlQueryString.replace(updateRegex, "$1" + newParam);
        } else if (urlQueryString === '') {
          params = '?' + newParam;
        } else {
          params = urlQueryString + '&' + newParam;
        }
      }
      params = params === '?' ? '' : params;
      return baseUrl + params;
    },

    /**
     * Returns the transition duration in ms for a given element.
     *
     * @param el
     * @returns {number}
     * @private
     */
    getTransitionDuration: function(el) {
      if (!el) {
        return 0;
      }

      var computedStyle = getComputedStyle(el);
      var transitionDuration = parseFloat(computedStyle.transitionDuration);
      var transitionDelay = parseFloat(computedStyle.transitionDelay);
      if (!transitionDuration && !transitionDelay) {
        return 0
      }

      return (transitionDuration + transitionDelay) * 1000;
    },

    /**
     * Calls a given function once when a transition ends on the target element.
     *
     * If the target element has no defined transitionDuration or transitionDelay, the callback function
     * is called immediately.
     *
     * @param el
     * @param callback
     */
    onTransitionEnd: function(el, callback) {
      if (!el || !callback || typeof callback !== 'function') {
        return;
      }

      var called = false;
      var _this = this;

      el.addEventListener('transitionend', function endTransition(e) {
        if (e.target !== el) {
          return;
        }
        called = true;
        el.removeEventListener('transitionend', endTransition, false);
        callback.call(_this, e);
      }, false);

      setTimeout(function () {
        if (!called) {
          API.triggerEvent(el, 'transitionend');
        }
      }, API.getTransitionDuration(el));
    },

    /**
     * Returns a hashed version of the string provided.
     *
     * @param str
     * @returns {number}
     */
    getHashString: function(str) {
      var hash = 0;
      if (str.length === 0) {
        return hash;
      }
      for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash;
    },

    /**
     * Returns the values that are the intersection of two arrays.
     *
     * @param x
     * @param y
     * @returns []
     */
    intersection: function(x, y) {
      return x.filter(function(value) {
        return y.includes(value);
      });
    },

    /**
     * Compares the position of two objects.
     *
     * @param a
     * @param b
     * @returns {number}
     */
    comparePosition: function(a, b) {
      if (a.position < b.position) {
        return -1;
      } else if (a.position > b.position) {
        return 1;
      }
      return 0;
    },

    /**
     * Returns objects from the Zendesk REST API.
     *
     * Supported object types are `categories`, `sections`, `articles`,
     * `topics` and `posts`.
     *
     * @param objects
     * @param properties
     * @returns {Promise}
     */
    get: function(objects, properties) {
      if (typeof objects === 'string') {
        objects = [objects];
      }

      if (!Array.isArray(objects) || !objects.length) {
        return new Promise(function(resolve, reject) {
          reject(new Error('The object argument provided is invalid'));
        });
      }

      var supportedEndpoints = Object.keys(API.endpoints);
      var supportedObjects = objects.filter(function(obj) {
        return supportedEndpoints.indexOf(obj) !== -1;
      });

      if (!supportedObjects.length) {
        return new Promise(function(resolve, reject) {
          reject(new Error('The specified object types are not supported'));
        });
      }

      // Identify the set of required requests
      var requests = [];
      supportedEndpoints.forEach(function(endpointId) {
        if (objects.indexOf(endpointId) !== -1) {
          var definition = API.endpoints[endpointId];
          var endpoint = definition['endpoint'];
          var sideloads = API.intersection(objects, definition['sideloads']);

          if (sideloads.length) {
            endpoint += ('?include=' + sideloads.join(','));
            supportedObjects = supportedObjects.filter(function(object) {
              return sideloads.indexOf(object) === -1;
            });
          }
          requests.push({
            id: endpointId,
            url: "/api/v2/" + definition['product'] + "/" + endpoint,
            properties: properties || definition['properties']
          });
        }
      });

      requests = requests.filter(function(request) {
        return supportedObjects.indexOf(request.id) !== -1;
      });

      if (!requests.length) {
        return new Promise(function(resolve, reject) {
          reject(new Error('No valid REST API endpoints were found'));
        });
      }

      return Promise.all(requests.map(function(obj) {
        return API.request(obj.url, obj.properties);
      })).then(function(responses) {

        // Return the response, if there's only one
        if (responses.length === 1) {
          return responses[0];
        }

        // Combine responses into a single response containing the required object types
        var result = {};
        responses.forEach(function(response) {
          for (var objectType in response) {
            if (response.hasOwnProperty(objectType) && supportedEndpoints.indexOf(objectType) !== -1) {
              result[objectType] = response[objectType];
            }
          }
        });
        return result;
      });
    },

    /**
     * Filters supported object types by the specified set of properties.
     *
     * @param json
     * @param properties
     * @returns {*}
     */
    filterObjectProperties: function(json, properties) {
      var supportedObjects = Object.keys(API.endpoints);
      for (var key in json) {
        if (json.hasOwnProperty(key) && supportedObjects.indexOf(key) !== -1 && Array.isArray(json[key])) {
          json[key] = json[key]

          // Remove draft objects
            .filter(function(object) {
              return !(object.hasOwnProperty('draft') && object.draft === true);
            })

            // Remove unnecessary object properties
            .map(function(object) {
              return API.pick(object, properties);
            });

          // Sort by position if this is the only page
          if (properties.indexOf('position') !== -1 && json['page_count'] === 1) {
            json[key].sort(API.comparePosition);
          }
        }
      }

      // Remove unnecessary response properties
      delete json['previous_page'];
      delete json['sort_by'];
      delete json['sort_order'];
      return json;
    },

    /**
     * Returns the theme preview cookie, if available.
     * @returns {string}
     */
    getPreviewCookie: function() {
      return document.cookie
        .split('; ')
        .find(function(row) { return /(^hc-[a-z0-9]+-preview)/i.test(row); });
    },

    /**
     * Returns the excerpt of a given string.
     * @param str
     * @param excerptLength
     * @returns {string}
     */
    getExcerpt: function(str, excerptLength) {
      str = str || ''
      if (excerptLength) {
        str = str.replace(/<[^>]+>/g, '');
        if (str.length > excerptLength) {
          return str.substring(0, excerptLength) + '...';
        }
      }
      return str;
    },

    /**
     * Returns a JSON response from the Zendesk REST API.
     *
     * If the response has multiple pages, all pages are returned.  Responses are filtered
     * by the specified set of properties and cached using sessionStorage.
     *
     * @param url
     * @param properties
     * @param cache
     * @returns {*}
     */
    request: function(url, properties, cache) {
      properties = properties || [];
      if (cache !== false) cache = true;

      // Add a per_page parameter to the URL, if one doesn't exist
      var perPage = Util.getURLParameter('per_page', url);
      if (!perPage) {
        url = API.setURLParameter(url, 'per_page', 100);
      }

      // Generate a cache key from the URL
      var cacheString = url + properties.join('-') + '-signed-in-' + window.Theme.signedIn;
      var cacheKey = API.getHashString(cacheString);

      var supportedObjects = Object.values(API.endpoints)
        .reduce(function(acc, endpoint) {
          return acc.concat(endpoint.sideloads);
          }, []);
      supportedObjects = supportedObjects.concat(Object.keys(API.endpoints));
      supportedObjects = supportedObjects.filter((item, index, arr) => arr.indexOf(item) === index);

      // Check whether a valid stored JSON response exists
      if (cache) {
        var storage = Util.storage(cacheKey, true);
        if (storage.isValid(HOUR)) {
          return new Promise(function(resolve) {
            resolve(storage.get());
          });
        }
      }

      // Check for an in progress request
      if (requests.hasOwnProperty(cacheKey)) {
        return new Promise(function(resolve) {
          requests[cacheKey].push(resolve)
        });
      } else {
        requests[cacheKey] = []
      }

      /**
       * Fetch the remaining pages of results, if required.
       * @param json
       * @param properties
       * @returns {Promise}
       */
      var maybeFetchRemaining = function(json, properties) {

        // If there's a single page of results, return the page
        if (json['page_count'] && (json['page_count'] === 1 || json['page'] > 1)) {
          return json;
        }

        // If there's multiple pages of results, fetch the remaining pages up to a limit of 20
        var pages = [];
        var maxPages = Math.min(json['page_count'], 20)
        for (var i = 2; i <= maxPages; i++) {
          pages.push(API.setURLParameter(json['next_page'], 'page', i));
        }

        return Promise
          .all(pages.map(function(page) {
            return API.request(page, properties, false);
          }))
          .then(function(pages) {

            // Add supported objects from each page of results to the response
            pages.forEach(function(page) {
              for (var objectType in page) {
                if (page.hasOwnProperty(objectType) && Array.isArray(page[objectType]) && supportedObjects.indexOf(objectType) !== -1) {
                  json[objectType] = json[objectType].concat(page[objectType]);
                }
              }
            });

            for (var objectType in json) {
              if (json.hasOwnProperty(objectType) && Array.isArray(json[objectType])) {

                // Ensure objects are unique with respect to ID
                json[objectType] = API.unique(json[objectType], 'id');

                // Sort objects based on position
                if (properties.indexOf('position') > -1) {
                  json[objectType].sort(API.comparePosition);
                }
              } else {
                delete json[objectType];
              }
            }
            return json;
          });
      };

      /**
       * Resolve the duplicate pending requests with the API data.
       * @param json
       */
      var maybeResolveRequests = function(json) {
        if (requests[cacheKey].length) {
          requests[cacheKey].forEach(function(resolve) {
            resolve(json)
          })
        }
      };

      return fetch(url)
        .then(function(response) {
          if (response.status !== 200) {
            return Promise.reject(new Error(response.statusText));
          }

          // Check whether the content type of the response is
          var contentType = response.headers.get('Content-Type');
          if (contentType.indexOf("application/json") === -1) {
            return Promise.reject("Response does not have a content type of JSON");
          }
          return response.json();
        })
        .then(function(json) {
          return maybeFetchRemaining(json, properties);
        })
        .then(function(json) {

          // Store the filtered JSON response
          json = API.filterObjectProperties(json, properties);

          // Remove unnecessary properties
          for (var property in json) {
            if (json.hasOwnProperty(property) && supportedObjects.indexOf(property) === -1) {
              delete json[property];
            }
          }

          if (cache) {
            storage.set(json);
            maybeResolveRequests(json);
          }
          return json;
        })
    },

    /**
     * Scrolls a given element into view.
     * @param el
     * @param offset
     * @param scrollElement
     */
    scrollIntoView: function(el, offset, scrollElement) {
      offset = parseInt(offset, 10) || 0;
      scrollElement = scrollElement || window;
      if (!el) return;
      if (offset) {
        var targetElementPosition = el.getBoundingClientRect().top;
        var scrollTop = scrollElement === window ? scrollElement.pageYOffset : scrollElement.scrollTop;
        var scrollElementOffset = scrollElement === window ? 0 : scrollElement.offsetTop;
        var offsetPosition = targetElementPosition - offset + scrollTop - scrollElementOffset;
        scrollElement.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      } else if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({
          block: 'start',
          inline: 'nearest',
          behavior: 'smooth'
        });
      }
    },

    /**
     * Replace SVG images with inline SVGs.
     *
     * @arg options
     */
    replaceWithSVG: function(arg) {
      var elements = [];

      /**
       * Returns true if the given element is an SVG image.
       *
       * @param el
       * @returns {boolean|string|string}
       */
      var isImage = function(el) {
        return el.tagName === 'IMG' && el.src && el.src.substr(el.src.lastIndexOf('.') + 1) === 'svg';
      };

      if (typeof arg === 'string') {
        arg = document.querySelectorAll(arg);
        if (!arg) {
          return;
        }
      }

      if (NodeList.prototype.isPrototypeOf(arg)) {
        elements = Array.prototype.filter.call(arg, function(el) {
          if (isImage(el)) return true;
          el.classList.remove(ClassName.INVISIBLE);
          return false;
        });
      } else if (API.isElement(arg)) {
        if (isImage(arg)) {
          elements.push(arg);
        } else {
          arg.classList.remove(ClassName.INVISIBLE);
        }
      }

      if (!elements.length) {
        return;
      }

      // @todo add imagesLoaded step

      // Replace images with inline SVG
      elements.forEach(function(el) {
        fetch(el.src, {
          cache: 'no-cache',
          mode: 'cors',
          credentials: 'omit'
        })
          .then(function(response) {
            return response.blob();
          })
          .then(function(blob) {
            return blob.text();
          })
          .then(function(text) {
            var div = document.createElement('div');
            div.innerHTML = text.trim();
            var target = div.querySelector('svg');
            el.classList.forEach(function(className) {
              target.classList.add(className);
            });
            for (var i = 0; i < el.attributes.length; i++) {
              var attr = el.attributes[i];
              target.setAttribute(attr.name, attr.value);
            }
            target.removeAttribute('data-inline-svg');
            target.classList.remove(ClassName.INVISIBLE);
            el.replaceWith(target);
          });
      });
    },

    /**
     * Force reflow.
     *
     * @param el
     * @returns {number}
     */
    reflow: function(el) {
      return el.offsetHeight;
    },

    /**
     * Triggers a new custom event on the specified element.
     *
     * @param el
     * @param eventName
     * @param data
     * @returns {CustomEvent}
     */
    triggerEvent: function(el, eventName, data) {
      if (!eventName) {
        return;
      }

      var event = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: true,
        detail: data || {}
      });

      (el || window).dispatchEvent(event);
      return event;
    },

    /**
     * Returns the selector for a given element, based on the `data-target` or `href` properties.
     *
     * @param el
     * @returns {string|null}
     */
    getSelectorFromElement: function(el) {
      var selector = el.getAttribute('data-target');
      if (!selector || selector === '#') {
        var hrefAttr = el.getAttribute('href');
        selector = hrefAttr && hrefAttr !== '#' ? hrefAttr.trim() : '';
      }
      try {
        return document.querySelector(selector) ? selector : null;
      } catch (err) {
        return null;
      }
    }

  };

  return API;

})();

/**
 * Extension framework.
 */
(function(Util) {

  /**
   * Data storage API using WeakMap.
   */
  window.dataStorage = {
    _storage: new WeakMap(),

    /**
     * Stores an object against an element,
     *
     * @param element
     * @param key
     * @param obj
     */
    put: function(element, key, obj) {
      if (!this._storage.has(element)) {
        this._storage.set(element, new Map());
      }
      this._storage.get(element).set(key, obj);
    },

    /**
     * Retrieves an object associated with an element.
     *
     * @param element
     * @param key
     * @returns {undefined|*}
     */
    get: function (element, key) {
      if (this._storage.has(element)) {
        return this._storage.get(element).get(key);
      }
      return undefined;
    },

    /**
     * Returns true if an element has an object stored against a given key.
     *
     * @param element
     * @param key
     * @returns {boolean | * | Promise<boolean>}
     */
    has: function (element, key) {
      return this._storage.has(element) && this._storage.get(element).has(key);
    },

    /**
     * Removes an object stored against an element.
     *
     * @param element
     * @param key
     * @returns {boolean | Promise<boolean> | void | IDBRequest<undefined>}
     */
    remove: function (element, key) {
      var ret = this._storage.get(element).delete(key);
      if (!this._storage.get(element).size === 0) {
        this._storage.delete(element);
      }
      return ret;
    }

  };

  // The number of extension instances that have been created
  var numberExtensions = 0;

  /**
   * Create the extension constructor.
   *
   * @param {HTMLElement} el
   * @param {object} options
   * @constructor
   */
  var Extension = function(el, options) {
    if (!Util.isElement(el)) {
      throw Error('A valid DOM element was not provided.');
    }

    this.el = el;
    this.instanceNumber = numberExtensions++;
    this.id = 'zp-' + this.instanceNumber;
    this.options = this._getOptions(options);
    this.events = Util.extend(this.events, { initialize: 'initialize' });

    this.initialize(this.options);
  };

  var _proto = Extension.prototype;

  /**
   * The default options for the extension.
   *
   * @type {{}}
   */
  _proto.defaults = {};

  /**
   * The option types for the extension.
   *
   * @type {{}}
   */
  _proto.optionTypes = {};

  /**
   * The supported events for the extension.
   *
   * @type {{}}
   */
  _proto.events = {};

  /**
   * Returns the options for the extension instance.
   *
   * @param options
   * @returns {*}
   * @private
   */
  _proto._getOptions = function(options) {

    // Extend defaults with options provided
    options = Util.extend(this.defaults, options);

    // Extend options with element data attributes
    var dataset = this.el.dataset;
    for (var key in dataset) {
      if (dataset.hasOwnProperty(key) && options.hasOwnProperty(key)) {
        var value = dataset[key];

        // Maybe perform value type conversion
        if (value === "true") value = true;
        if (value === "false") value = false;
        if (value === "null") value = null;

        // Only convert to a number if it doesn't change the string
        if (value === +value + "") value = +value;

        options[key] = value;
      }
    }

    // Validate that the options provided are of the correct type
    this._checkOptionTypes(options, this.optionTypes);

    return options;
  };

  /**
   * Checks whether each option is of the correct type.
   *
   * @param options
   * @param optionTypes
   * @private
   */
  _proto._checkOptionTypes = function(options, optionTypes) {
    for (var property in optionTypes) {
      if (Object.prototype.hasOwnProperty.call(optionTypes, property)) {
        var expectedTypes = optionTypes[property];
        var value = options[property];
        var valueType = value && Util.isElement(value) ? 'element' : Util.typeOf(value);
        if (!new RegExp(expectedTypes).test(valueType)) {
          throw new Error('Option "' + property + '" provided "' + valueType + '" but expected "' + expectedTypes + '"');
        }
      }
    }
  };

  /**
   * Initializes the extension instance.
   */
  _proto.initialize = function() {};

  /**
   * Returns the class name with a given identifier.
   *
   * @param identifier
   * @returns {*}
   * @private
   */
  _proto._getClassName = function(identifier) {
    var className = undefined;

    // Options does not include a classNames object
    if (
      !this.options.hasOwnProperty('classNames') ||
      'object' !== Util.typeOf(this.options.classNames) ||
      !this.options.classNames.hasOwnProperty(identifier)
    ) {
      return className;
    }

    var classNames = this.options.classNames;
    if (typeof classNames[identifier] === 'function') {
      className = classNames[identifier].apply(this, [].slice.call(arguments, 1));
    } else if (typeof classNames[identifier] === 'string') {
      className = classNames[identifier];
    }

    return className;
  };

  /**
   * Returns an extension constructor function.
   *
   * @param prototype
   * @returns {extension}
   */
  Util.createExtension = function(prototype) {
    var extension = function(el, options) {
      Extension.call(this, el, options);
    };

    // Extend the extension prototype
    extension.prototype = Object.create(Extension.prototype);
    for (var key in prototype) {
      if (prototype.hasOwnProperty(key)) {
        extension.prototype[key] = prototype[key];
      }
    }

    Object.defineProperty(extension.prototype, 'constructor', {
      enumerable: false,
      value: extension
    });

    return extension;
  }

})(Util || {});

/**
 * Micro-templating system.
 */
(function(Util) {

  var templateSettings = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an interpolation, evaluation or
  // escaping regex, we need one that is guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a string literal.
  var escapes = {
    "'": "'",
    '\\': '\\',
    '\r': 'r',
    '\n': 'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };

    // Regexes for identifying a key that needs to be escaped.
    var source = '(?:' + Object.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };

  var escape = createEscaper(escapeMap);

  /**
   * Returns the template string for a given template ID.
   * @param templateId
   * @returns {string|(string | string)}
   */
  Util.getTemplateString = function(templateId) {
    if (!templateId) return '';
    var templates = document.querySelectorAll('#tmpl-' + templateId);
    if (!templates.length) return '';
    return templates[templates.length - 1].innerHTML || '';
  };

  /**
   * Compiles a template string into a function that can be evaluated for rendering.
   *
   * @param text
   * @param settings
   * @returns {function(*=): *}
   */
  Util.template = function(text, settings) {
    settings = settings || {};
    settings = Util.extend(settings, templateSettings);

    text = Util.decodeHTML(text);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offset.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    var render;
    try {
      render = new Function(settings.variable || 'obj', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data);
    };

    return template;
  };

  /**
   * Decodes HTML entities.
   * @see https://gomakethings.com/decoding-html-entities-with-vanilla-javascript/
   * @param html
   * @returns {string}
   */
  Util.decodeHTML = function(html) {
    var txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  /**
   * Renders a custom template within the given element.
   *
   * @param el
   * @param templateId
   * @param data
   * @param options
   */
  Util.renderTemplate = function(el, templateId, data, options) {
    data = data || {};
    options = options || {};

    if (!options.hasOwnProperty('replaceContent')) {
      options.replaceContent = true;
    }

    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) {
      console.error('A valid HTML element was not specified');
    }

    var templates = document.querySelectorAll('#tmpl-' + templateId);
    var template = templates.length ? templates[templates.length - 1] : null;
    var templateInnerHTML = '';
    if (!template || !template.innerHTML) {
      Util.log('Template ' + templateId + ' does not exist');

      var patterns = {
        // Header
        'topbar': 'Top Bar',
        'notification': 'Notification',
        'header-search': 'Header Search',
        'category-dropdown': 'Category Dropdown',

        // Home page
        'popular-keywords': 'Popular Keywords',
        'custom-blocks': 'Custom Blocks',
        'content-blocks': 'Content Blocks',
        'contact-blocks': 'Contact Blocks',
        'call-to-action': 'Call to Action',

        // Article page
        'table-of-contents': 'Table of Contents',

        // New Request page
        'form-list': 'Form List',
        'form-tip': 'Form Tip',

        // General
        'breadcrumbs': 'Breadcrumbs',
        'articles': 'Articles',
        'recent-articles': 'Recent Articles',
        'related-articles': 'Related Articles',
        'promoted-articles': 'Promoted Articles',
        'sidebar-navigation': 'Sidebar Navigation',
        'social': 'Social links',

        // Footer
        'back-to-top-link': 'Category Dropdown',
      };

      var templateName = patterns.hasOwnProperty(templateId) ? patterns[templateId] : templateId;
      templateInnerHTML = (
        '<div class="notification-notice template-notice border border-radius my-5 px-5 py-4 font-size-md">' +
          '<h4>Custom micro-template</h4>' +
          '<p>With the theme <a href="https://support.zendesk.com/hc/en-us/articles/4408842911898#topic_pzy_jb1_wmb" target="_blank">Developer license</a> you can copy-and-paste your desired <b>' + templateName + '</b> template from our Pattern Library into the bottom of your theme\'s <a href="https://support.zendesk.com/hc/en-us/articles/4408839332250#topic_h5c_k4w_n3" target="_blank">footer.hbs template</a> and have it appear here automatically.</p>' +
        '</div>'
      );
    } else {
      templateInnerHTML = template.innerHTML;
    }

    data.partial = function(templateId, templateData) {
      var template = document.getElementById('tmpl-' + templateId);
      if (!template || !template.innerHTML) return '';
      return compileTemplate(template.innerHTML, templateData);
    };

    var compileTemplate = function(templateString, templateData) {
      var compiled = Util.template(Util.decodeHTML(templateString));
      return compiled(templateData).replace(/(^\s+|\s+$)/g,'');
    };

    var html = compileTemplate(templateInnerHTML, data);

    if (html) {
      if (options.replaceContent === true) {
        el.innerHTML = html;
      } else {
        el.insertAdjacentHTML('afterbegin', html);
      }

      // Trigger render event
      Util.triggerEvent(el, 'template:render', {
        relatedTarget: el
      });

    } else {
      if (options.removeEmptyElement === true) {
        el.remove();
      }
    }

    if (el) {

      // Maybe replace images with SVGs
      var images = el.querySelectorAll('img[data-inline-svg]');
      if (images.length) Util.replaceWithSVG(images);

      if (options.hasOwnProperty('removeClasses') && Array.isArray(options.removeClasses) && options.removeClasses.length) {
        options.removeClasses.forEach(function(className) {
          el.classList.remove(className);
        });
      }
    }
  }

})(Util || {});

/**
 * Storage API.
 */
(function(Util) {

  /**
   * Create the storage constructor.
   *
   * @param {string} id - The storage ID
   * @param {boolean} session - If true, use sessionStorage instead of localStorage
   */
  var Storage = function(id, session) {
    if (!id) {
      throw Error('Please provide an ID for your storage');
    }
    this.id = id;
    this.storage = session ? sessionStorage : localStorage;
  };

  var _proto = Storage.prototype;

  /**
   * Saves data to storage with a timestamp.
   *
   * @param {object|array|string|number} data - The data to save
   */
  _proto.set = function(data) {
    this.storage.setItem(this.id, JSON.stringify({
      timestamp: new Date().getTime(),
      data: data
    }));
  };

  /**
   * Gets data from storage.
   *
   * @param {object|array|string|number} fallback - The fallback value to return if no data is found [optional]
   * @param {boolean} full - If true, return the data AND timestamp [optional]
   * @returns {string}
   */
  _proto.get = function(fallback, full) {
    var data = this.storage.getItem(this.id);
    data = data ? JSON.parse(data) : null;
    if (!data || DEBUG === true) {
      return fallback ? fallback : data;
    }
    return full ? data : data.data;
  };

  /**
   * Returns true if stored data is still valid.
   *
   * @param {number} time - The expiry time of the data in milliseconds
   * @returns {boolean}
   */
  _proto.isValid = function(time) {
    var data = this.get(null, true);
    if (!data || DEBUG === true) {
      return false;
    }
    var difference = new Date().getTime() - data.timestamp;
    return difference < time;
  };

  /**
   * Removes an item from storage.
   */
  _proto.remove = function() {
    this.storage.removeItem(this.id);
  };

  /**
   * Returns a new Storage instance.
   *
   * @param id
   * @param session
   * @returns {Storage}
   */
  Util.storage = function(id, session) {
    return new Storage(id, session);
  };

})(Util || {});