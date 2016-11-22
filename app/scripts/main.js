/* eslint-env browser */

(function() {
  'use strict';

  /** Main app */
  function OpenBikoPWA() {
    var self = this;

    /**
     * Process click-on-target events
     */
    document.addEventListener('partial-fetched', function() {
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
        console.log('[locationBar] HOME');
        self.selectorToClick = '.mdl-tabs__tab[href="#anyos"]';
        self.fetchUrlAndDisplay('partials/home.html');
      });

      // programa
      self.locationBar.route(/^\/?programa/, function() {
        console.log('[locationBar] PROGRAMA');
        self.selectorToClick = '.mdl-tabs__tab[href="#programa"]';
        self.fetchUrlAndDisplay('partials/home.html');
      });

      // me apunto
      self.locationBar.route(/^\/?me\-apunto/, function() {
        console.log('[locationBar] ME APUNTO');
        self.selectorToClick = '.mdl-tabs__tab[href="#me-apunto"]';
        self.fetchUrlAndDisplay('partials/home.html');
      });

      // faq
      self.locationBar.route(/^\/?faq/, function() {
        console.log('[locationBar] FAQ');
        self.selectorToClick = null;
        self.fetchUrlAndDisplay('partials/faq.html');
      });

      // programa json event listener
      document.addEventListener(
        'partial-fetched-partials/home.html',
        function() {
          console.log('[locationBar] PROGRAMA > JSON');
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
        'partial-fetched-partials/home.html',
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
        // console.log('url already loaded');
        self.hideSideNav();

        // Click the selected tab
        self.clickSelectedTab();

        // Dispatch the event
        console.log('partial-shown-' + url);
        document.dispatchEvent(new CustomEvent('partial-shown-' + url));

        return true;
      }
      self.loadedUrl = url;

      fetch(url)
        .then(function(response) {
          if (response.status === 200) {
            // response.text() is a Promise
            response.text().then(function(text) {
              document.querySelector('.mdl-layout__content').innerHTML = text;

              // register newly added elements to DOM
              window.componentHandler.upgradeAllRegistered();
              // MaterialLayout.prototype.init();

              self.hideSideNav();

              // Click the selected tab
              self.clickSelectedTab();

              // Dispatch events
              document.dispatchEvent(new CustomEvent('partial-fetched'));
              document.dispatchEvent(new CustomEvent('partial-fetched-' + url));
              document.dispatchEvent(new CustomEvent('partial-shown-' + url));

              return true;
            });
          } else {
            console.log(response);
          }
        })
        .catch(function(err) {
          console.log(err);
        });
    };

    this.fetchProgramAndDisplay = function(url) {
      fetch(url)
        .then(function(response) {
          if (response.status === 200) {
            response.json().then(function(json) {
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
                  template.querySelector('.info').className += ' hidden';
                } else {
                  template.querySelector('.info').className = 'info';
                }

                document.querySelector('.program-list').appendChild(
                  document.importNode(template, true)
                );
              }
              // register newly added elements to DOM
              window.componentHandler.upgradeAllRegistered();

              // Dispatch the event
              document.dispatchEvent(new CustomEvent('json-loaded'));
            });
          }
        })
        .catch(function(err) {
          console.log(err);
        });
    };
  }

  var openBikoPWA = new OpenBikoPWA();
  openBikoPWA.init();
})();
