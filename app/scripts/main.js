/* eslint-env browser */

(function() {
  'use strict';
  /*
   // Are Notifications supported in the service worker?
   if (!('ServiceWorkerRegistration' in window)) {
   alert('[Notifications] Notifications aren\'t supported1.');
   }

   // Check if push messaging is supported
   if (!('PushManager' in window)) {
   alert('[Notifications] Push messaging isn\'t supported2.');
   }
   */

  /** Main app */
  function OpenBikoPWA() {
    var self = this;

    // Display program images when json has loaded
    document.addEventListener('json-loaded', function() {
      var jsonImages = document.querySelectorAll('.program-list img');
      jsonImages.forEach(function(item) {
        item.addEventListener('load', function(e) {
          e.target.style.opacity = 1;
        });
      });
    });

    document.addEventListener('partial-loaded', function() {
      // Show mdl-layout__content
      document.querySelector('.mdl-layout__content').style.opacity = 1;

      // Display content images when partial has loaded
      var contentImages = document.querySelectorAll('.mdl-layout__content img');
      contentImages.forEach(function(item) {
        item.addEventListener('load', function(e) {
          e.target.style.opacity = 1;
        });
      });

      // Set events for click-on-target
      var clickOnTargetLinks = document.querySelectorAll('.click-on-target');
      clickOnTargetLinks.forEach(function(item) {
        item.addEventListener(
          'click',
          function(e) {
            var targetHref = e.target.parentElement.getAttribute('data-target');
            self.locationBar.update(targetHref, {trigger: true});
          }
        );
      });

      /* email submit */
      var submit = document.getElementById('submit');
      if (submit) {
        submit.addEventListener(
          'click',
          function(e) {
            e.preventDefault();
            var nameSurname = document.getElementById('name-surname').value;
            var email = document.getElementById('email').value;
            var cocktail = document.getElementById('cocktail').value;
            document.location.href = 'mailto:10aniversario@biko2.com?' +
              'subject=OpenBiko' +
              '&body=Nombre: ' + nameSurname +
              '. Email: ' + email +
              '. Mensaje: ' + cocktail;
          }
        );
      }
    });

    this.init = function() {
      self.loadedUrl = null;
      self.selectorToClick = null;

      var LocationBar = require('location-bar');
      self.locationBar = new LocationBar();

      // listen to all changes to the location bar
      self.locationBar.onChange(function(path) {
        console.log('the current url is', path);
      });

      // home
      self.locationBar.route(/^\/?$/, function() {
        console.log('[LocationBar] /');
        self.selectorToClick = '.mdl-tabs__tab[href="#anyos"]';
        self.fetchUrlAndDisplay('partials/home.html');
      });

      // programa
      self.locationBar.route(/^\/?programa/, function() {
        console.log('[LocationBar] /programa');
        self.selectorToClick = '.mdl-tabs__tab[href="#programa"]';
        self.fetchUrlAndDisplay('partials/home.html');
      });

      // me apunto
      self.locationBar.route(/^\/?me\-apunto/, function() {
        console.log('[LocationBar] /me-apunto');
        self.selectorToClick = '.mdl-tabs__tab[href="#me-apunto"]';
        self.fetchUrlAndDisplay('partials/home.html');
      });

      // faq
      self.locationBar.route(/^\/?faq/, function() {
        console.log('[LocationBar] /faq');
        self.selectorToClick = null;
        self.fetchUrlAndDisplay('partials/faq.html');
      });

      // programa json event listener
      document.addEventListener(
        'partial-loaded:partials/home.html',
        function() {
          self.fetchProgramAndDisplay('data/program.json');
        }
      );

      // Side nav events
      var navLinks = document.querySelectorAll('.mdl-navigation__link');
      navLinks.forEach(function(item) {
        item.addEventListener(
          'click',
          function(e) {
            e.preventDefault();
            var href = e.target.getAttribute('href');
            if (href === document.location.pathname) {
              self.hideSideNav();
            } else {
              self.locationBar.update(href, {trigger: true});
            }
          }
        );
      });

      document.addEventListener(
        'partial-fetched-and-loaded:partials/home.html',
        function() {
          // Add events to tabs when loaded
          // We use a different selector
          // from fetchUrlAndDisplay to avoid infinite loops
          var tabLinks = document.querySelectorAll(
            'a.mdl-tabs__tab .mdl-tabs__ripple-container'
          );
          tabLinks.forEach(function(item) {
            item.addEventListener(
              'click',
              function(e) {
                var href = e.target.parentElement.getAttribute('href');
                href = href.replace('#', '');
                href = href.replace('anyos', '');
                self.locationBar.update('/' + href, {trigger: true});
              }
            );
          });
          console.log('[Main] Events attached to tabs');
        }
      );

      // Init locationBar
      self.locationBar.start({
        pushState: true
      });
    };

    this.clickSelectedTab = function() {
      if (self.selectorToClick) {
        document.querySelector(self.selectorToClick).click();
        document.querySelector('.mdl-tabs').scrollIntoView();
        self.selectorToClick = null;
      }
    };

    this.hideSideNav = function() {
      // Hide loader
      document.querySelector('.loader').style.display = 'none';
      // Hide side nav
      var layoutObfuscator =
        document.querySelector('.mdl-layout__obfuscator.is-visible');
      if (layoutObfuscator) {
        layoutObfuscator.click();
      }
    };

    this.fetchUrlAndDisplay = function(url) {
      // No he encontrado forma de pasar params a una Promise
      // Avoid reloading the same url again
      if (self.loadedUrl === url) {
        console.log('[Main] ' + url + ' already in DOM');
        self.hideSideNav();

        // Click the selected tab
        self.clickSelectedTab();

        // Dispatch the event
        document.dispatchEvent(
          new CustomEvent('partial-loaded:' + url)
        );
        document.dispatchEvent(
          new CustomEvent('partial-not-fetched-and-loaded:' + url)
        );

        return;
      }
      self.loadedUrl = url;
      self.makeRequest({
        method: 'GET',
        url: url
      })
        .then(function(response) {
          console.log('[Main] ' + url + ' fetched');
          // Dispatch events
          document.dispatchEvent(new CustomEvent('partial-fetched'));
          document.dispatchEvent(new CustomEvent('partial-fetched:' + url));

          document.querySelector('.mdl-layout__content').innerHTML = response;
          console.log('[Main] ' + url + ' loaded into DOM');

          // register newly added elements to DOM
          window.componentHandler.upgradeAllRegistered();
          // MaterialLayout.prototype.init();

          self.hideSideNav();

          // Click the selected tab
          self.clickSelectedTab();

          // Dispatch events
          document.dispatchEvent(
            new CustomEvent('partial-loaded')
          );
          document.dispatchEvent(
            new CustomEvent('partial-loaded:' + url)
          );
          document.dispatchEvent(
            new CustomEvent('partial-fetched-and-loaded')
          );
          document.dispatchEvent(
            new CustomEvent('partial-fetched-and-loaded:' + url)
          );

          return true;
        })
        .catch(function(err) {
          console.log('[Main] error fetching ' + url, err);
        });
    };

    this.fetchProgramAndDisplay = function(url) {
      // Check if program data is already in DOM
      if (document.querySelector('.program-list li')) {
        console.log('[Main] ' + url + ' already in DOM');
        return;
      }

      self.makeRequest({
        method: 'GET',
        url: url
      })
        .then(function(response) {
          var json = JSON.parse(response);
          console.log('[Main] ' + url + ' fetched');
          var template;
          for (var i = 0; i - json.length; i++) {
            template = document.querySelector('template').content;
            template.querySelector('.title').textContent =
              json[i].title;
            // template.querySelector('.description').textContent =
            // json[i].description;
            template.querySelector('.timestart').textContent =
              json[i].timestart;
            template.querySelector('.length').textContent =
              json[i].length + ' minutos / ';
            template.querySelector('.venue').textContent =
              json[i].venue;
            template.querySelector('.speaker').textContent =
              json[i].speaker;
            if (json[i].icon === undefined) {
              template.querySelector('.icon').src = '';
            } else {
              template.querySelector('.icon').src =
                json[i].icon;
            }
            template.querySelector('.mdl-switch').setAttribute(
              'for',
              'list-switch-' + json[i].id
            );
            template.querySelector('.mdl-switch__input').setAttribute(
              'id',
              'list-switch-' + json[i].id
            );

            if (json[i].icon === undefined) {
              template.querySelector('.mdl-chip').className += ' hidden';
            } else {
              template.querySelector('.mdl-chip').className =
                'mdl-chip mdl-chip--contact';
            }

            if (json[i].length === undefined) {
              template.querySelector('.length').className += ' hidden';
            } else {
              template.querySelector('.length').className = 'length';
            }

            document.querySelector('.program-list').appendChild(
              document.importNode(template, true)
            );
          }
          console.log('[Main] ' + url + ' loaded into DOM');

          // register newly added elements to DOM
          window.componentHandler.upgradeAllRegistered();

          // Dispatch the event
          document.dispatchEvent(new CustomEvent('json-loaded'));
        })
        .catch(function(err) {
          console.log(err);
        });
    };

    /*
     * Promisified version of XHR
     * @see http://stackoverflow.com/questions/30008114/how-do-i-promisify-native-xhr
     * @param options
     */
    this.makeRequest = function(options) {
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(options.method, options.url);
        xhr.onload = function() {
          if (this.status === 200) {
            resolve(xhr.response);
          } else {
            reject({
              status: this.status,
              statusText: xhr.statusText
            });
          }
        };
        xhr.onerror = function() {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        };
        if (options.headers) {
          Object.keys(options.headers).forEach(function(key) {
            xhr.setRequestHeader(key, options.headers[key]);
          });
        }
        var params = options.params;
        // We'll need to stringify if we've been given an object
        // If we have a string, this is skipped.
        if (params && typeof params === 'object') {
          params = Object.keys(params).map(function(key) {
            return encodeURIComponent(key) + '=' +
              encodeURIComponent(params[key]);
          }).join('&');
        }
        xhr.send(params);
      });
    };
  }

  var openBikoPWA = new OpenBikoPWA();
  openBikoPWA.init();
})();
