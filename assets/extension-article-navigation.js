(function() {
  "use strict";

  // Globals
  var NAME = 'articleNavigation';

  var Event = {
    RENDER: NAME + ':render'
  };

  /**
   * Articles Navigation extension.
   *
   * @type {component}
   */
  window.ArticleNavigation = Util.createExtension({

    defaults: {

      // A collection of articles (can include sections and categories)
      collection: {},

      sideloading: SIDELOADING,

      // The ID of the current article
      articleId: null,

      // The 'Next article' title
      nextTitle: 'Next article',

      // The 'Previous article' title
      previousTitle: 'Next article',

      // Only include articles with one or more labels
      labels: [],

      // The list of REST API properties passed to the rendering function
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
        articles: function(article) { return article.draft !== true; }
      },

      // Custom sorting functions
      sort: {
        categories: 'sortByPosition',
        sections: 'sortByPosition',
        articles: null
      },
      sortOrder: 'asc',

      // The ID of the custom template to use when generating HTML
      template: null,

      // Additional data to expose to the template
      templateData: {}
    },

    optionTypes: {
      collection: 'object',
      sideloading: '(string|boolean)',
      articleId: '(string|number|null)',
      nextTitle: 'string',
      previousTitle: 'string',
      labels: '(string|array)',
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

      if (options.collection && options.collection.hasOwnProperty('articles')) {
        this.render(options.collection);
      } else {
        if (!options.articleId) {
          if (!Util.isArticlePage()) {
            console.error('An article ID must be specified');
            return;
          }
          options.articleId = Util.getPageId();
        }
        this._getObjects(options.properties).then(this.render.bind(this));
      }
    },

    /**
     * Returns all category, section and article objects from the Zendesk REST API.
     * @param properties
     * @returns {Promise<{categories: *, articles: *, sections: *}>}
     * @private
     */
    _getObjects: function(properties) {
      var requests = [this._getArticles(properties)];
      if (this.options.sideloading === false) {
        requests.push(Util.get(['categories', 'sections'], properties))
      }
      return Promise
        .all(requests)
        .then(function(responses) {
          return Object.assign.apply(Object, responses);
        })
    },

    /**
     * Returns articles from the Zendesk REST API.
     *
     * Categories and sections may also be included, depending on the extension settings.
     *
     * @returns {Promise}
     */
    _getArticles: function(properties) {
      var options = this.options;

      if (!options.labels.length) {
        if (options.sideloading === false) {
          return Util.get(['articles'], properties);
        }
        return Util.get(['categories', 'sections', 'articles'], properties);
      }

      var url = '/api/v2/help_center/' + Util.locale + '/articles.json';
      var params = [];

      if (options.sideloading === true) {
        params.push('include=categories,sections');
      }

      if (options.labels.length) {
        params.push('label_names=' + options.labels.join(','));
      }

      if (params.length) {
        url += '?' + params.join('&');
      }

      return Util.request(url, properties);
    },

    /**
     * Sorts articles in the provided collection.
     *
     * @param collection
     * @returns {*[]}
     * @private
     */
    _sortArticles: function(collection) {

      // Filter categories, sections and articles
      var filteredCategories = this._filterObjects(collection.categories, 'categories').reverse();
      var filteredSections = this._filterObjects(collection.sections, 'sections').reverse();
      var filteredArticles = this._filterObjects(collection.articles, 'articles');

      // Sorted categories, sections and articles
      var sortObjects = this._sortObjects.bind(this);
      var sortedCategories = sortObjects(filteredCategories, 'categories');
      var sortedSections = sortObjects(filteredSections, 'sections');
      var sortedArticles = [];

      /**
       * Sorts subsections of the specified section.
       * @param section
       */
      var sortSubsections = function(section) {
        var subsections = sortedSections.filter(function(subsection) {
          return subsection['parent_section_id'] === section.id;
        });
        subsections.forEach(addSectionArticles);
      };

      /**
       * Adds articles from the specified section to the sorted articles array.
       * @param section
       */
      var addSectionArticles = function(section) {
        var articlesInSection = filteredArticles.filter(function(article) {
          return article['section_id'] === section.id;
        });
        if (section.hasOwnProperty('sorting')) {
          if (section.sorting === 'manual') articlesInSection.sort(Util.sortByPosition);
          if (section.sorting === 'title') articlesInSection.sort(Util.sortByName);
          if (section.sorting === 'creation_asc') articlesInSection.sort(Util.sortByDate);
          if (section.sorting === 'creation_desc') articlesInSection.sort(Util.sortByDate).reverse();
        }
        articlesInSection.sort(Util.sortByPromoted);
        sortedArticles = sortedArticles.concat(articlesInSection);
        sortSubsections(section);
      };

      sortedCategories.forEach(function(category) {

        // Top-level sections
        var sectionsInCategory = sortedSections.filter(function(section) {
          return section['category_id'] === category.id && section['parent_section_id'] === null;
        });

        sectionsInCategory.forEach(function(section) {

          // Add articles
          addSectionArticles(section);

          // Sort subsections
          sortSubsections(section);
        });
      });

      return this.options.sortOrder === 'desc' ? sortedArticles.reverse() : sortedArticles;
    },

    /**
     * Filters objects based on the object type.
     * @param objects
     * @param objectType
     * @returns {*}
     */
    _filterObjects: function(objects, objectType) {
      var options = this.options;
      var filterFunction = options.filter.hasOwnProperty(objectType) ? options.filter[objectType] : null;
      if (typeof filterFunction === 'function') return objects.filter(filterFunction);
      if (typeof filterFunction === 'string' && typeof Util[filterFunction] === 'function') return objects.filter(Util[filterFunction]);
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
      var sortFunction = options.sort.hasOwnProperty(objectType) ? options.sort[objectType] : null;
      if (typeof sortFunction === 'function') return objects.sort(sortFunction);
      if (typeof sortFunction === 'string' && typeof Util[sortFunction] === 'function') return objects.sort(Util[sortFunction]);
      return objects;
    },

    /**
     * Renders the extension.
     *
     * @param collection
     */
    render: function(collection) {
      var options = this.options;
      var articles = this._sortArticles(collection);

      // Get the index of the current article
      var index;
      for (var i = 0; i < articles.length; i++) {
        if (articles[i].id === options.articleId) {
          index = i;
          break;
        }
      }

      var data = {
        collection: collection,
        nextTitle: this.options.nextTitle,
        currentArticle: articles[index],
        previousTitle: this.options.previousTitle,
        previousArticle: (index - 1 >= 0) ? articles[index - 1] : null,
        nextArticle: (index + 1 < articles.length) ? articles[index + 1] : null,
      };
      if (options.templateData) {
        data = Util.extend(data, options.templateData);
      }

      Util.renderTemplate(this.el, options.template, data, { replaceContent: true });

      Util.triggerEvent(this.el, Event.RENDER, {
        relatedTarget: this.el,
        articles: articles,
      });
    }
  });

  window.addEventListener('load', function() {
    each('[data-element="article-navigation"]', function(el) {
      new ArticleNavigation(el);
    });
  });
})();