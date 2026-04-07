(function() {
  "use strict";

  // Globals
  var NAME = 'navigation';

  var Event = {
    RENDER: NAME + ':render'
  };

  /**
   * Navigation extension.
   *
   * @type {component}
   */
  window.Navigation = Util.createExtension({

    defaults: {

      // A collection of categories, section and/or articles
      collection: {},

      // The object types to fetch and make available to the template
      objects: ['categories', 'sections', 'articles'],

      sideloading: SIDELOADING,

      // Only include articles with one or more labels
      labels: [],

      // Only include articles from a specific category or section
      categoryId: null,
      sectionId: null,

      // Only include posts from a specific topic
      topicId: null,

      // The list of properties passed to the rendering function
      properties: [
        "id",
        "title",
        "description",
        "name",
        "html_url",
        "position",
        "promoted",
        "pinned",
        "draft",
        "section_id",
        "sorting",
        "category_id",
        "parent_section_id",
        "topic_id",
        "created_at"
      ],

      // Custom filtering functions
      filter: {
        categories: null,
        sections: null,
        articles: function(article) { return article.draft !== true; },
        topics: null,
        posts: null
      },

      // Custom sorting functions
      sort: {
        categories: 'sortByPosition',
        sections: 'sortByPosition',
        articles: 'sortByPosition',
        topics: 'sortByPosition',
        posts: 'sortByPosition'
      },
      sortOrder: 'asc',

      // The ID of the custom template to use when generating HTML
      template: null,

      // Additional data to expose to the template
      templateData: {}
    },

    optionTypes: {
      collection: '(string|object)',
      objects: '(string|array)',
      sideloading: '(string|boolean)',
      labels: '(string|array)',
      categoryId: '(string|number|null)',
      sectionId: '(string|number|null)',
      topicId: '(string|number|null)',
      properties: '(string|array)',
      sort: '(string|object)',
      sortOrder: 'string',
      filter: '(string|object|null)',
      template: '(string|null)',
      templateData: '(string|object)'
    },

    /**
     * Initializes the extension.
     *
     * @param options
     */
    initialize: function(options) {
      var objects = options.objects;
      var _this = this;

      for (var optionName in options) {
        if (options.hasOwnProperty(optionName)) {
          var optionValue = options[optionName];
          if (typeof optionValue === 'string' && /object|array/g.test(this.optionTypes[optionName])) {
            try {
              this.options[optionName] = options[optionName] = JSON.parse(optionValue);
            }
            catch (e) {
              this.options[optionName] = options[optionName] = this.defaults[optionName];
              console.error('Option value (' + optionName + ') is not a valid JSON string.');
            }
          }
        }
      }

      if (objects.indexOf('articles') !== -1 && objects.indexOf('categories') !== -1 && objects.indexOf('sections') === -1) {
        options.objects.push('sections');
      }

      _this.pageIds = { activeCategoryId: null, activeSectionId: null, activeArticleId: null, activeTopicId: null, activePostId: null };

      /**
       * Sorts and filters objects within the collection.
       * @param collection
       * @returns {*}
       */
      var sortAndFilterObjects = function(collection) {
        options.objects.forEach(function(objectType) {
          if (collection.hasOwnProperty(objectType)) {
            collection[objectType] = _this._filterObjects(collection[objectType], objectType);
            _this._sortObjects(collection[objectType], objectType);
            if (options.sortOrder === 'desc') collection[objectType] = collection[objectType].reverse();
          }
        });
        return collection;
      };

      sortAndFilterObjects.bind(this);

      /**
       * Adds information to the collection about which objects are active.
       * @param collection
       * @returns {*}
       */
      var extendObjects = function(collection) {
        var pageId = Util.getPageId();

        /**
         * Identifies the active category with an "isActive" property.
         * @param categoryId
         * @returns {*}
         */
        var findActiveCategory = function(categoryId) {
          var activeCategory = null;

          (collection.categories || []).forEach(function(category) {
            category.isActive = (category.id === categoryId);
            if (category.isActive === true) activeCategory = category;
          });

          if (activeCategory) _this.pageIds.activeCategoryId = activeCategory.id;
          return activeCategory;
        };

        /**
         * Identifies all active sections with an "isActive" property.
         * @param sectionId
         * @returns {*}
         */
        var findActiveSections = function(sectionId) {
          var activeSection = null;
          (collection.sections || []).forEach(function(section) {
            if (!section.isActive) {
              section.isActive = (section.id === sectionId);
              if (section.isActive === true) {
                activeSection = section;
                if (section['parent_section_id'] !== null) findActiveSections(section['parent_section_id'])
              }
            }
          });
          if (activeSection) _this.pageIds.activeSectionId = activeSection.id;
          return activeSection;
        };

        /**
         * Identifies the active article with an "isActive" property.
         * @param articleId
         * @returns {*}
         */
        var findActiveArticle = function(articleId) {
          var activeArticle = null;

          (collection.articles || []).forEach(function(article) {
            article.isActive = (article.id === articleId);
            if (article.isActive === true) activeArticle = article;
          });

          if (activeArticle) _this.pageIds.activeArticleId = activeArticle.id;
          return activeArticle;
        };

        if (Util.isCategoryPage()) {
          findActiveCategory(pageId);
        } else if (Util.isSectionPage()) {
          var activeSection = findActiveSections(pageId);
          _this.pageIds.activeSectionId = pageId;
          if (activeSection) {
            findActiveCategory(activeSection['category_id']);
          }
        } else if (Util.isArticlePage()) {
          var activeArticle = findActiveArticle(pageId);
          if (activeArticle) {
            var activeSection = findActiveSections(activeArticle['section_id']);
            if (activeSection) {
              findActiveCategory(activeSection['category_id']);
            }
          }
        }

        return collection;
      };

      if (Object.keys(options.collection).length) {
        var collection = extendObjects(options.collection);
        collection = sortAndFilterObjects(collection);
        collection = _this.structureObjects(collection);
        this.render(collection);
      } else {
        _this.getObjects(options)
          .then(extendObjects)
          .then(sortAndFilterObjects)
          .then(_this.structureObjects)
          .then(_this.render.bind(_this));
      }
    },

    /**
     * Retrieves all objects from the Zendesk REST API.
     * @see https://developer.zendesk.com/api-reference/help_center/help-center-api/help-center-api/
     * @param options
     * @returns {Promise<{}>}
     */
    getObjects: function(options) {
      var objects = options.objects;
      var requests = [];

      // Retrieve objects from specific category or section (or articles with one or more labels)
      if (options.categoryId !== null || options.sectionId !== null || options.labels.length > 0) {
        if (Util.intersection(['categories', 'sections', 'articles'], options.objects).length > 0) {
          if (options.objects.indexOf('articles') !== -1 || options.labels.length > 0) {
            requests.push(this.getArticles(options));
          } else if (options.objects.indexOf('sections') !== -1) {
            requests.push(this.getSections(options));
          } else {
            requests.push(this.getCategories(options));
          }
          objects = objects.filter(function(object) {
            return ['categories', 'sections', 'articles'].indexOf(object) === -1;
          });
        }
      }

      // Retrieve objects from a specific topic
      if (options.topicId !== null && Util.intersection(['topics', 'posts'], options.objects).length > 0) {
        if (options.objects.indexOf('posts') !== -1) {
          requests.push(this.getPosts(options));
        } else {
          requests.push(this.getTopics(options));
        }
        objects = objects.filter(function(object) {
          return ['topics', 'posts'].indexOf(object) === -1;
        });
      }

      if (!requests.length) {

        // Avoid side-loading
        if (options.sideloading === false && Util.intersection(['categories', 'sections', 'articles'], options.objects).length === 3) {
          return Promise.all([
            Util.get(['categories', 'sections'], options.properties),
            Util.get(['articles'], options.properties)
          ])
            .then(function(response) {
              var merged = Object.assign.apply(Object, response);
              for (var key in merged) {
                if (merged.hasOwnProperty(key)) {
                  if (options.objects.indexOf(key) === -1) {
                    delete merged[key];
                  }
                }
              }
              return merged;
            })
        }
      }

      if (objects.length) {
        Util.log('Fetching objects (' + objects.join(', ') + ') using Util.get()');
        requests.push(Util.get(objects, options.properties));
      }

      return Promise.all(requests)
        .then(function(response) {
          if (response.length === 1) return response[0];
          var merged = Object.assign.apply(Object, response);
          for (var key in merged) {
            if (merged.hasOwnProperty(key)) {
              if (options.objects.indexOf(key) === -1) {
                delete merged[key];
              }
            }
          }
          return merged;
        })
    },

    /**
     * Retrieves categories from the Zendesk REST API.
     * @see https://developer.zendesk.com/api-reference/help_center/help-center-api/categories/
     * @param options
     * @returns {Promise<{}>}
     */
    getCategories: function(options) {
      var url = '/api/v2/help_center/' + Util.locale + 'categories';
      if (options.categoryId !== null) {
        Util.log('Fetching category ' + options.categoryId);
        url += '/' + options.categoryId ;
      } else {
        Util.log('Fetching categories');
      }
      url += '.json';
      return Util.request(url, options.properties)
    },

    /**
     * Retrieves sections from the Zendesk REST API.
     * @see https://developer.zendesk.com/api-reference/help_center/help-center-api/sections/
     * @param options
     * @returns {Promise<{}>}
     */
    getSections: function(options) {
      var url = '/api/v2/help_center/' + Util.locale;
      if (options.categoryId !== null) {
        Util.log('Fetching sections from category ' + options.categoryId);
        url += '/categories/' + options.categoryId ;
      } else {
        Util.log('Fetching sections');
      }
      url += '/sections.json';
      if (options.objects.indexOf('categories') !== -1) {
        url += '?include=categories';
      }
      return Util.request(url, options.properties)
    },

    /**
     * Retrieves articles from the Zendesk REST API.
     * @see https://developer.zendesk.com/api-reference/help_center/help-center-api/articles/
     * @param options
     * @returns {Promise<{}>}
     */
    getArticles: function(options) {
      var includes = Util.intersection(['categories', 'sections'], options.objects);
      var params = [];

      // Generate the REST API URL
      var url = '/api/v2/help_center/' + Util.locale;
      if (options.categoryId !== null) {
        Util.log('Fetching articles from category ' + options.categoryId);
        url += '/categories/' + options.categoryId ;
      } else if (options.sectionId !== null) {
        Util.log('Fetching articles from section ' + options.sectionId);
        url += '/sections/' + options.sectionId;
      } else {
        Util.log('Fetching articles');
      }
      url += '/articles.json';

      if (includes.length) params.push('include=' + includes.join(','));
      if (options.labels) {
        Util.log('Fetching articles with labels (' + options.labels.join(',') + ')');
        params.push('label_names=' + options.labels.join(','));
      }
      if (params.length) url += '?' + params.join('&');

      return Util.request(url, options.properties);
    },

    /**
     * Retrieves topics from the Zendesk REST API.
     * @see https://developer.zendesk.com/api-reference/help_center/help-center-api/topics/
     * @param options
     * @returns {Promise<{}>}
     */
    getTopics: function(options) {
      var url = '/api/v2/community/topics';
      if (options.topicId !== null) {
        Util.log('Fetching topic ' + options.topicId);
        url += '/' + options.topicId ;
      } else {
        Util.log('Fetching topics');
      }
      url += '.json';
      return Util.request(url, options.properties);
    },

    /**
     * Retrieves posts from the Zendesk REST API.
     * @see https://developer.zendesk.com/api-reference/help_center/help-center-api/posts/
     * @param options
     * @returns {Promise<{}>}
     */
    getPosts: function(options) {
      var url = '/api/v2/community/';
      if (options.topicId !== null) {
        Util.log('Fetching posts from topic ' + options.topicId);
        url += 'topics/' + options.topicId + '/posts';
      } else {
        Util.log('Fetching posts');
        url += 'posts';
      }
      url += '.json';
      if (options.objects.indexOf('topics') !== -1) {
        url += '?include=topics';
      }
      return Util.request(url, options.properties);
    },

    /**
     * Filters objects based on the object type.
     * @param objects
     * @param objectType
     * @returns {*}
     */
    _filterObjects: function(objects, objectType) {
      var options = this.options;
      if (options.filter.hasOwnProperty(objectType) && options.sort[objectType] !== null) {
        if (typeof options.filter[objectType] === 'function') {
          return objects.filter(options.filter[objectType]);
        } else {
          var method = options.filter[objectType];
          if (typeof method === 'string' && typeof Util[method] === 'function') {
            return objects.filter(Util[method]);
          }
        }
      }
      return objects;
    },

    /**
     * Sorts objects based on the object type.
     * @param objects
     * @param objectType
     * @returns {*}
     */
    _sortObjects: function(objects, objectType) {
      var options = this.options;
      var defaultSortingFunctions = {
        categories: Util.sortByPosition,
        sections: Util.sortByPosition,
        articles: Util.sortByName,
        topics: Util.sortByDate,
        posts: Util.sortByDate
      };
      if (options.sort.hasOwnProperty(objectType) && options.sort[objectType] !== null) {
        if (typeof options.sort[objectType] === 'function') {
          return objects.sort(options.sort[objectType]);
        } else {
          var method = options.sort[objectType];
          if (typeof method === 'string' && typeof Util[method] === 'function') {
            return objects.sort(Util[method]);
          }
        }
      }
      return objects.sort(defaultSortingFunctions[objectType]).sort(Util.sortByPromoted);
    },

    /**
     * Nests objects for use in templates.
     * @param collection
     * @returns {*}
     */
    structureObjects: function(collection) {
      var categories = (collection.categories || []);
      var sections = (collection.sections || []);
      var articles = (collection.articles || []);
      var topics = (collection.topics || []);
      var posts = (collection.posts || []);

      var createSection = function(section) {

        section.articles = articles.filter(function(article) {
          return article['section_id'] === section.id;
        });

        // Maybe sort articles based on order specified by API
        // Options include 'manual', 'title', 'creation_desc', 'creation_asc'
        if (section.hasOwnProperty('sorting')) {
          if (section.sorting === 'manual') section.articles.sort(Util.sortByPosition);
          if (section.sorting === 'title') section.articles.sort(Util.sortByName);
          if (section.sorting === 'creation_asc') section.articles.sort(Util.sortByDate);
          if (section.sorting === 'creation_desc') {
            section.articles.sort(Util.sortByDate).reverse();
          }
        }
        section.articles.sort(Util.sortByPromoted);
        section.sections = sections.filter(function(subsection) {
          return subsection['parent_section_id'] && subsection['parent_section_id'] === section.id;
        });
        section.sections.forEach(createSection);
      };

      sections.forEach(createSection);

      categories.forEach(function(category) {
        category.sections = sections.filter(function(section) {
          return section['category_id'] === category.id && section['parent_section_id'] === null;
        });
      });

      topics.forEach(function(topic) {
        topic.posts = posts.filter(function(post) {
          return post['topic_id'] === topic.id;
        });
      });

      return {
        categories,
        sections,
        articles,
        topics,
        posts
      }
    },

    /**
     * Renders the extension.
     * @param collection
     */
    render: function(collection) {
      var options = this.options;
      var data = Util.extend(collection);

      for (var key in this.pageIds) {
        if (this.pageIds.hasOwnProperty(key)) {
          if (!data.hasOwnProperty(key)) {
            data[key] = this.pageIds[key];
          } else if (!!this.pageIds[key]) {
            data[key] = this.pageIds[key];
          }
        }
      }

      if (options.templateData) {
        data = Util.extend(data, options.templateData);
      }

      Util.renderTemplate(this.el, options.template, data, { replaceContent: true });

      Util.triggerEvent(this.el, Event.RENDER, {
        relatedTarget: this.el,
        data: data,
        options: options
      });
    }
  });

  ready(function() {
    each('[data-element="navigation"]', function(el) {
      new Navigation(el);
    });
  });
})();