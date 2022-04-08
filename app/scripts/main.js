/* eslint-env browser */

/*
Ha cambiado la forma de empaquetar los ficheros, por
lo que no se respeta el orden que le marcas. Por eso
tenemos que poner los datos de notificactions.js dentro
de main.js
*/

import LocationBar from "location-bar";

(function () {
  "use strict";

  /** Push notifications */
  function OpenBikoPWANotifications() {
    var self = this;

    this.publicKey =
      "BLEGxt3sC7PRoIfiQeNl3AkUtgkGxqi7USTZJ" +
      "cnsTCdiSiIqsGGQqzoh53IkJ_ytLOvbJcffX3layO7rHRlXqjE";

    this.applicationServerKey = null;

    this.subscription = null;

    // Process send auto notifications
    this.sendAutoNotificationLink = document.querySelector(
      ".send-auto-notification"
    );
    self.sendAutoNotificationLink.addEventListener("click", function () {
      self.registration.showNotification("Notificación auto generada", {
        body: "Biko Open Space",
        icon: "/images/app-shell/master-icon.png",
        badge: "/images/app-shell/master-icon.badge.png",
      });
    });

    this.init = function () {
      console.log("[Notifications] Service started");

      self.applicationServerKey = self.urlB64ToUint8Array(self.publicKey);

      if (self.arePushNotificationsAvailable()) {
        document.addEventListener("service-worker-registered", function () {
          // Check if program switches have been loaded,
          // and process them or wait for an event
          var switchInputs = document.querySelectorAll(".mdl-switch__input");
          if (switchInputs && switchInputs.length > 0) {
            console.log("[Notifications] Switch inputs present");
            self.initializeState();
          } else {
            console.log(
              "[Notifications] Switch inputs not present. " +
                'Waiting until "json-loaded" event is fired...'
            );
          }
          // Attach this event outside above if-else, to ensure it is always
          // catched. Otherwise, the previous "else" is not always executed,
          // thus leading to not always calling self.initializeState()
          document.addEventListener("json-loaded", self.initializeState);

          window.addEventListener("offline", function () {
            console.log("[Notifications] Offline event captured");
            self.hideSwitches();
            self.showSnackBar("Sin conexión. Notificaciones desactivadas");
          });

          window.addEventListener("online", function () {
            console.log("[Notifications] Online event captured");
            self.showSwitches();
            self.showSnackBar("De nuevo online. Notificaciones restauradas");
          });
        });
      }
    };

    this.initializeState = function () {
      console.log("[Notifications] UI state initialization started");
      /* We need the service worker registration to check for a subscription */
      navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        self.registration = serviceWorkerRegistration;
        /* Do we already have a push message subscription? */
        serviceWorkerRegistration.pushManager
          .getSubscription()
          .then(
            function (subscription) {
              console.log("[Notifications] pushManager response received");
              self.subscription = subscription;

              /* Show auto notification link */
              self.showAutoNotificationLink();

              /* Propagate data from server if device is already suscribed */
              if (self.subscription) {
                self.propagateDataFromServer();
              } else {
                console.log(
                  "[Notifications] pushManager subscription " +
                    "not present: no data will be loaded from server."
                );
              }

              /* Add click events before showing switches */
              document
                .querySelectorAll(".mdl-switch__input")
                .forEach(function (item) {
                  /* Add events to switch inputs */
                  item.addEventListener("click", self.processSwitchClick);
                });

              /* Show switches if online mode detected */
              if (navigator.onLine) {
                console.log(
                  "[Notifications] Online mode detected. navigator.onLine:",
                  navigator.onLine
                );
                self.showSwitches();
              } else {
                console.log(
                  "[Notifications] Offline mode detected. navigator.onLine:",
                  navigator.onLine
                );
                self.hideSwitches();
              }
            },
            (err) => {
              console.warn(
                "[Notifications] Error during " + "getSubscription()",
                err
              );
            }
          )
          .catch(function (err) {
            console.warn(
              "[Notifications] Error during " + "getSubscription()",
              err
            );
          });
      });
      console.log("[Notifications] UI state initialization completed");
    };

    this.arePushNotificationsAvailable = function () {
      // Are service workers supported?
      if (!("ServiceWorkerRegistration" in window)) {
        console.warn("[Notifications] Service Workers aren't supported.");
        self.showSnackBar("Notificaciones Web Push no soportadas", 5000);
        return false;
      }

      // Are Notifications supported in the service worker?
      if (!("showNotification" in ServiceWorkerRegistration.prototype)) {
        console.warn("[Notifications] Notifications aren't supported.");
        self.showSnackBar("Notificaciones Web Push no soportadas");
        return false;
      }

      // Check the current Notification permission.
      // If its denied, it's a permanent block until the
      // user changes the permission
      /*       if (Notification.permission === 'denied') {
        console.warn('[Notifications] The user has blocked notifications.');
        self.showSnackBar('Has bloqueado las notificaciones. ' +
          'Actívalas para recibir nuestros avisos');
        return false;
      } */

      // Check if push messaging is supported
      if (!("PushManager" in window)) {
        console.warn("[Notifications] Push messaging isn't supported.");
        self.showSnackBar("Mensajes push no soportados");
        return false;
      }
      console.log("[Notifications] Push notifications supported");
      // self.showSnackBar('Notificaciones Web Push soportadas');

      return true;
    };

    this.showAutoNotificationLink = function () {
      if (
        Notification.permission === "granted" &&
        self.sendAutoNotificationLink.classList.contains("hidden")
      ) {
        self.sendAutoNotificationLink.classList.remove("hidden");
        console.log("[Notifications] auto notification link displayed");
      }
    };

    this.propagateDataFromServer = function () {
      console.log(
        "[Notifications] pushManager subscription is present: ",
        JSON.stringify(self.subscription)
      );

      var url = "https://openbiko.duckdns.org/get-events.json";
      fetch(url, {
        method: "post",
        mode: "cors",
        body: JSON.stringify(self.subscription),
      }).then(function (response) {
        if (response.status === 200) {
          response.json().then(function (subscriptionValues) {
            console.log(
              "[Notifications] data fetched from " + url + ":",
              subscriptionValues
            );
            var switchInputs = document.querySelectorAll(".mdl-switch__input");
            var itemId;
            switchInputs.forEach(function (item) {
              itemId = parseInt(item.id.replace("list-switch-", ""), 10);
              if (subscriptionValues.indexOf(itemId) > -1) {
                self.checkSwitch(item);
              } else {
                self.uncheckSwitch(item);
              }
            });
          });
        }
      });
    };

    this.processSwitchClick = function (event) {
      navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        console.log("[Notifications] Trying to subscribe device...");
        // Do we already have a push message subscription?
        serviceWorkerRegistration.pushManager
          .subscribe({
            userVisibleOnly: true,
            applicationServerKey: self.applicationServerKey,
          })
          .then(function (subscription) {
            if (self.subscription) {
              console.log("[Notifications] Device previously suscribed");
            } else {
              console.log(
                "[Notifications] Device suscribed " + "for the first time"
              );
              self.showSnackBar("Notificaciones activadas correctamente");
            }
            // Show auto notification link
            self.showAutoNotificationLink();

            self.subscription = subscription;
            self.saveDataToServer(event.target);
          })
          .catch(function (err) {
            console.log("[Notifications] Failed to subscribe device: ", err);
            self.showSnackBar("No has aceptado recibir notificaciones");
            self.subscription = null;
            self.uncheckSwitch(event.target);
          });
      });
    };

    this.saveDataToServer = function (switchItem) {
      var switchInputs = document.querySelectorAll(".mdl-switch__input");
      var switchInputsArray = [];
      switchInputs.forEach(function (item) {
        var itemId;
        if (item.checked) {
          itemId = parseInt(item.id.replace("list-switch-", ""), 10);
          switchInputsArray.push(itemId);
        }
      });

      var dataToSave = {
        events: switchInputsArray,
        subscription: self.subscription,
      };

      var url = "https://openbiko.duckdns.org/set-events";
      fetch(url, {
        method: "post",
        mode: "cors",
        body: JSON.stringify(dataToSave),
      }).then(function (response) {
        if (response.status === 200) {
          // Show snackbar
          self.showSnackBar("Preferencia guardada correctamente", 800);
          console.log(
            "[Notifications] Data saved into " + url + ":",
            JSON.stringify(dataToSave)
          );
        } else {
          // This check evaluates the original state, not the current one,
          // thus resetting switch to its original state
          if (switchItem.getAttribute("checked") === "checked") {
            // Check checkbox
            self.checkSwitch(switchItem);
          } else {
            // Uncheck checkbox
            self.uncheckSwitch(switchItem);
          }

          // Show snackbar
          self.showSnackBar("Error guardando preferencia!", 800);
        }
      });
    };

    this.showSwitches = function () {
      document.querySelectorAll(".mdl-switch__input").forEach(function (item) {
        item.parentElement.classList.remove("hidden");
      });
      console.log("[Notifications] UI state: switch inputs displayed");
    };

    this.hideSwitches = function () {
      document.querySelectorAll(".mdl-switch__input").forEach(function (item) {
        item.parentElement.classList.add("hidden");
      });
      console.log("[Notifications] UI state: switch inputs hidden");
    };

    this.checkSwitch = function (switchElement) {
      switchElement.setAttribute("checked", "checked");
      switchElement.parentElement.classList.add("is-checked");
    };

    this.uncheckSwitch = function (switchElement) {
      switchElement.removeAttribute("checked");
      switchElement.parentElement.classList.remove("is-checked");
    };

    // Show snackbar
    this.showSnackBar = function (message, timeout) {
      window.componentHandler.upgradeAllRegistered();
      var snackbarContainer = document.getElementById("snackbar");
      snackbarContainer.MaterialSnackbar.showSnackbar({
        message: message,
        timeout: timeout || 2000,
        actionHandler: function () {
          var snackBar = document.querySelector("#snackbar");
          snackBar.classList.remove("mdl-snackbar--active");
        },
        actionText: "OK",
      });
    };

    this.urlB64ToUint8Array = function (base64String) {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };
  }

  var openBikoPWANotifications = new OpenBikoPWANotifications();
  openBikoPWANotifications.init();
})();

// MAIN START
(function () {
  "use strict";

  /** Main app */
  function OpenBikoPWA() {
    var self = this;

    // Display program images when json has loaded
    document.addEventListener("json-loaded", function () {
      var jsonImages = document.querySelectorAll(".program-list img");
      for (var i = 0; i < jsonImages.length; i++) {
        jsonImages[i].style.opacity = 0;
        jsonImages[i].addEventListener("load", function (e) {
          e.target.style.opacity = 1;
          e.target.style.filter = "alpha(opacity=100)";
        });
      }
    });

    document.addEventListener("partial-loaded", function () {
      // Show mdl-layout__content
      document.querySelector(".mdl-layout__content").style.opacity = 1;

      // Display content images when partial has loaded
      var contentImages = document.querySelectorAll(".mdl-layout__content img");
      for (var x = 0; x < contentImages.length; x++) {
        contentImages[x].style.opacity = 0;
        contentImages[x].addEventListener("load", function (e) {
          e.target.style.opacity = 1;
          e.target.style.filter = "alpha(opacity=100)";
        });
      }

      // Set events for click-on-target
      var clickOnTargetLinks = document.querySelectorAll(".click-on-target");
      for (var z = 0; z < clickOnTargetLinks.length; z++) {
        clickOnTargetLinks[z].addEventListener("click", function (e) {
          var targetHref = e.target.parentElement.getAttribute("data-target");
          self.locationBar.update(targetHref, { trigger: true });
        });
      }
    });

    this.init = function () {
      self.loadedUrl = null;
      self.selectorToClick = null;

      //var LocationBar = require("location-bar");

      self.locationBar = new LocationBar();

      /*
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
       */
      self.locationBar.route(/.*/, function (path) {
        console.log("[LocationBar] captured path:", path);
        if (path.indexOf("hace-10-anyos") > -1) {
          console.log("[LocationBar] matched path /hace-10-anyos");
          self.selectorToClick = '.mdl-tabs__tab[href="#hace-10-anyos"]';
          self.fetchUrlAndDisplay("partials/home.html");
        } else if (path.indexOf("faq") > -1) {
          console.log("[LocationBar] matched path /faq");
          self.selectorToClick = '.mdl-tabs__tab[href="#faq"]';
          self.fetchUrlAndDisplay("partials/home.html");
        } else {
          console.log("[LocationBar] matched path /");
          self.selectorToClick = '.mdl-tabs__tab[href="#programa"]';
          self.fetchUrlAndDisplay("partials/home.html");
        }
      });

      // Init locationBar
      self.locationBar.start({
        pushState: true,
      });

      // programa json event listener
      document.addEventListener(
        "partial-loaded:partials/home.html",
        function () {
          self.fetchProgramAndDisplay("data/program.json");
        }
      );

      // Side nav events
      var navLinks = document.querySelectorAll(".mdl-navigation__link");
      for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener("click", self.sideNavClickEvent);
      }

      document.addEventListener(
        "partial-fetched-and-loaded:partials/home.html",
        self.attachEventsToTabs
      );
    };

    this.sideNavClickEvent = function (e) {
      e.preventDefault();
      var href = e.target.getAttribute("href");
      if (href === document.location.pathname) {
        self.hideSideNav();
      } else {
        self.locationBar.update(href, { trigger: true });
      }
    };

    this.attachEventsToTabs = function () {
      // Add events to tabs when loaded
      // We use a different selector
      // from fetchUrlAndDisplay to avoid infinite loops
      var tabLinks = document.querySelectorAll(
        "a.mdl-tabs__tab .mdl-tabs__ripple-container"
      );
      // Tengto que definir aqui la funcion del evento click, ya que
      // si lo saco a una función no funciona
      for (var i = 0; i < tabLinks.length; i++) {
        tabLinks[i].addEventListener("click", function (e) {
          var href = e.target.parentElement.getAttribute("href");
          href = href.replace("#", "");
          href = href.replace("programa", "");
          self.locationBar.update("/" + href, { trigger: true });
        });
      }
      console.log("[Main] Events attached to tabs");
    };

    this.clickSelectedTab = function () {
      if (self.selectorToClick) {
        document.querySelector(self.selectorToClick).click();
        document.querySelector(".mdl-tabs").scrollIntoView();
        self.selectorToClick = null;
      }
    };

    this.hideSideNav = function () {
      // Hide loader
      document.querySelector(".loader").style.display = "none";
      // Hide side nav
      var layoutObfuscator = document.querySelector(
        ".mdl-layout__obfuscator.is-visible"
      );
      if (layoutObfuscator) {
        layoutObfuscator.click();
      }
    };

    this.fetchUrlAndDisplay = function (url) {
      // No he encontrado forma de pasar params a una Promise
      // Avoid reloading the same url again
      if (self.loadedUrl === url) {
        console.log("[Main] " + url + " already in DOM");
        self.hideSideNav();

        // Click the selected tab
        self.clickSelectedTab();

        // Dispatch the event
        document.dispatchEvent(new CustomEvent("partial-loaded:" + url));
        document.dispatchEvent(
          new CustomEvent("partial-not-fetched-and-loaded:" + url)
        );

        return;
      }
      self.loadedUrl = url;
      self
        .makeRequest({
          method: "GET",
          url: url,
        })
        .then(function (response) {
          console.log("[Main] " + url + " fetched");
          // Dispatch events
          document.dispatchEvent(new CustomEvent("partial-fetched"));
          document.dispatchEvent(new CustomEvent("partial-fetched:" + url));

          document.querySelector(".mdl-layout__content").innerHTML = response;
          console.log("[Main] " + url + " loaded into DOM");

          // register newly added elements to DOM
          window.componentHandler.upgradeAllRegistered();
          // MaterialLayout.prototype.init();

          self.hideSideNav();

          // Click the selected tab
          self.clickSelectedTab();

          // Dispatch events
          document.dispatchEvent(new CustomEvent("partial-loaded"));
          document.dispatchEvent(new CustomEvent("partial-loaded:" + url));
          document.dispatchEvent(new CustomEvent("partial-fetched-and-loaded"));
          document.dispatchEvent(
            new CustomEvent("partial-fetched-and-loaded:" + url)
          );

          return true;
        })
        .catch(function (err) {
          console.log("[Main] error fetching " + url, err);
        });
    };

    this.fetchProgramAndDisplay = function (url) {
      // Check if program data is already in DOM
      if (document.querySelector(".program-list li")) {
        console.log("[Main] " + url + " already in DOM");
        return;
      }

      self
        .makeRequest({
          method: "GET",
          url: url,
        })
        .then(function (response) {
          var json = JSON.parse(response);
          console.log("[Main] " + url + " fetched");
          var template;
          for (var i = 0; i - json.length; i++) {
            template = document.querySelector("template").content;
            template.querySelector(".title").textContent = json[i].title;
            // template.querySelector('.description').textContent =
            // json[i].description;
            template.querySelector(".timestart").textContent =
              json[i].timestart;
            template.querySelector(".length").textContent =
              json[i].length + " minutos / ";
            template.querySelector(".venue").textContent = json[i].venue;
            template.querySelector(".speaker").textContent = json[i].speaker;
            if (json[i].icon === undefined) {
              template.querySelector(".icon").src =
                "/images/touch/android-chrome-384x384.png";
            } else {
              template.querySelector(".icon").src = json[i].icon;
            }
            template
              .querySelector(".mdl-switch")
              .setAttribute("for", "list-switch-" + json[i].id);
            template
              .querySelector(".mdl-switch__input")
              .setAttribute("id", "list-switch-" + json[i].id);

            if (json[i].speaker === undefined) {
              template.querySelector(".mdl-chip").className += " hidden";
            } else {
              template.querySelector(".mdl-chip").className = "mdl-chip";
            }

            /*           if (json[i].icon === undefined) {
              template.querySelector('.mdl-chip').className += ' hidden';
            } else {
              template.querySelector('.mdl-chip').className =
                'mdl-chip mdl-chip--contact';
            }*/

            if (json[i].length === undefined) {
              template.querySelector(".length").className += " hidden";
            } else {
              template.querySelector(".length").className = "length";
            }

            document
              .querySelector(".program-list")
              .appendChild(document.importNode(template, true));
          }
          console.log("[Main] " + url + " loaded into DOM");

          // register newly added elements to DOM
          window.componentHandler.upgradeAllRegistered();

          // Dispatch the event
          document.dispatchEvent(new CustomEvent("json-loaded"));
        })
        .catch(function (err) {
          console.log(err);
        });
    };

    /*
     * Promisified version of XHR
     * @see http://stackoverflow.com/questions/30008114/how-do-i-promisify-native-xhr
     * @param options
     */
    this.makeRequest = function (options) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(options.method, options.url);
        xhr.onload = function () {
          if (this.status === 200) {
            resolve(xhr.response);
          } else {
            reject({
              status: this.status,
              statusText: xhr.statusText,
            });
          }
        };
        xhr.onerror = function () {
          reject({
            status: this.status,
            statusText: xhr.statusText,
          });
        };
        if (options.headers) {
          Object.keys(options.headers).forEach(function (key) {
            xhr.setRequestHeader(key, options.headers[key]);
          });
        }
        var params = options.params;
        // We'll need to stringify if we've been given an object
        // If we have a string, this is skipped.
        if (params && typeof params === "object") {
          params = Object.keys(params)
            .map(function (key) {
              return (
                encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
              );
            })
            .join("&");
        }
        xhr.send(params);
      });
    };
  }

  var openBikoPWA = new OpenBikoPWA();
  openBikoPWA.init();
})();
