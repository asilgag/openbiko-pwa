// NO USADO: SU CONTENIDO ESTA METIDO DENTRO DE main.js
/*!
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
/* eslint-env browser */
(function() {
  'use strict';

  /** Push notifications */
  function OpenBikoPWANotifications() {
    var self = this;

    this.publicKey = 'BLEGxt3sC7PRoIfiQeNl3AkUtgkGxqi7USTZJ' +
      'cnsTCdiSiIqsGGQqzoh53IkJ_ytLOvbJcffX3layO7rHRlXqjE';

    this.applicationServerKey = null;

    this.subscription = null;

    // Process send auto notifications
    this.sendAutoNotificationLink = document.querySelector(
      '.send-auto-notification'
    );
    self.sendAutoNotificationLink.addEventListener(
      'click',
      function() {
        self.registration.showNotification(
          'Notificación auto generada',
          {
            body: 'Biko Open Space',
            icon: '/images/app-shell/master-icon.png',
            badge: '/images/app-shell/master-icon.badge.png'
          }
        );
      }
    );

    this.init = function() {
      console.log('[Notifications] Service started');

      self.applicationServerKey = self.urlB64ToUint8Array(self.publicKey);

      if (self.arePushNotificationsAvailable()) {
        // TODO Evitamos los switches de momento
        return false;
        document.addEventListener(
          'service-worker-registered',
          function() {
            // Check if program switches have been loaded,
            // and process them or wait for an event
            var switchInputs = document.querySelectorAll('.mdl-switch__input');
            if (switchInputs && switchInputs.length > 0) {
              console.log('[Notifications] Switch inputs present');
              self.initializeState();
            } else {
              console.log(
                '[Notifications] Switch inputs not present. ' +
                'Waiting until "json-loaded" event is fired...'
              );
            }
            // Attach this event outside above if-else, to ensure it is always
            // catched. Otherwise, the previous "else" is not always executed,
            // thus leading to not always calling self.initializeState()
            document.addEventListener(
              'json-loaded',
              self.initializeState
            );

            window.addEventListener('offline', function() {
              console.log('[Notifications] Offline event captured');
              self.hideSwitches();
              self.showSnackBar('Sin conexión. Notificaciones desactivadas');
            });

            window.addEventListener('online', function() {
              console.log('[Notifications] Online event captured');
              self.showSwitches();
              self.showSnackBar('De nuevo online. Notificaciones restauradas');
            });
          }
        );
      }
    };

    this.initializeState = function() {
      console.log('[Notifications] UI state initialization started');
      /* We need the service worker registration to check for a subscription */
      navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
        self.registration = serviceWorkerRegistration;
        /* Do we already have a push message subscription? */
        serviceWorkerRegistration.pushManager.getSubscription()
          .then(function(subscription) {
            console.log('[Notifications] pushManager response received');
            self.subscription = subscription;

            /* Show auto notification link */
            self.showAutoNotificationLink();

            /* Propagate data from server if device is already suscribed */
            if (self.subscription) {
              self.propagateDataFromServer();
            } else {
              console.log('[Notifications] pushManager subscription ' +
                'not present: no data will be loaded from server.');
            }

            /* Add click events before showing switches */
            document.querySelectorAll('.mdl-switch__input').forEach(
              function(item) {
                /* Add events to switch inputs */
                item.addEventListener(
                  'click',
                  self.processSwitchClick
                );
              }
            );

            /* Show switches if online mode detected */
            if (navigator.onLine) {
              console.log(
                '[Notifications] Online mode detected. navigator.onLine:',
                navigator.onLine
              );
              self.showSwitches();
            } else {
              console.log(
                '[Notifications] Offline mode detected. navigator.onLine:',
                navigator.onLine
              );
              self.hideSwitches();
            }
          }, err => {
            console.warn('[Notifications] Error during ' +
              'getSubscription()', err);
          })
          .catch(function(err) {
            console.warn('[Notifications] Error during ' +
              'getSubscription()', err);
          });
      });
      console.log('[Notifications] UI state initialization completed');
    };

    this.arePushNotificationsAvailable = function() {
      // Are service workers supported?
      if (!('ServiceWorkerRegistration' in window)) {
        console.warn('[Notifications] Service Workers aren\'t supported.');
        self.showSnackBar('Notificaciones Web Push no soportadas', 5000);
        return false;
      }

      // Are Notifications supported in the service worker?
      if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
        console.warn('[Notifications] Notifications aren\'t supported.');
        self.showSnackBar('Notificaciones Web Push no soportadas');
        return false;
      }

      // Check the current Notification permission.
      // If its denied, it's a permanent block until the
      // user changes the permission
      if (Notification.permission === 'denied') {
        console.warn('[Notifications] The user has blocked notifications.');
        self.showSnackBar('Has bloqueado las notificaciones. ' +
          'Actívalas para recibir nuestros avisos');
        return false;
      }

      // Check if push messaging is supported
      if (!('PushManager' in window)) {
        console.warn('[Notifications] Push messaging isn\'t supported.');
        self.showSnackBar('Mensajes push no soportados');
        return false;
      }
      console.log('[Notifications] Push notifications supported');
      // self.showSnackBar('Notificaciones Web Push soportadas');

      return true;
    };

    this.showAutoNotificationLink = function() {
      if (Notification.permission === 'granted' &&
        self.sendAutoNotificationLink.classList.contains('hidden')) {
        self.sendAutoNotificationLink.classList.remove('hidden');
        console.log('[Notifications] auto notification link displayed');
      }
    };

    this.propagateDataFromServer = function() {
      console.log(
        '[Notifications] pushManager subscription is present: ',
        JSON.stringify(self.subscription)
      );

      var url = 'https://openbiko.duckdns.org/get-events.json';
      fetch(url, {
        method: 'post',
        mode: 'cors',
        body: JSON.stringify(self.subscription)
      }).then(function(response) {
        if (response.status === 200) {
          response.json().then(function(subscriptionValues) {
            console.log(
              '[Notifications] data fetched from ' + url + ':',
              subscriptionValues
            );
            var switchInputs = document.querySelectorAll('.mdl-switch__input');
            var itemId;
            switchInputs.forEach(function(item) {
              itemId = parseInt(item.id.replace('list-switch-', ''), 10);
              if (subscriptionValues.indexOf(itemId) > -1) {
                self.checkSwitch(item);
              } else {
                self.uncheckSwitch(item);
              }
            });
          });
        }}
      );
    };

    this.processSwitchClick = function(event) {
      navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
        console.log('[Notifications] Trying to subscribe device...');
        // Do we already have a push message subscription?
        serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: self.applicationServerKey
        })
          .then(function(subscription) {
            if (self.subscription) {
              console.log('[Notifications] Device previously suscribed');
            } else {
              console.log('[Notifications] Device suscribed ' +
                'for the first time');
              self.showSnackBar('Notificaciones activadas correctamente');
            }
            // Show auto notification link
            self.showAutoNotificationLink();

            self.subscription = subscription;
            self.saveDataToServer(event.target);
          })
          .catch(function(err) {
            console.log('[Notifications] Failed to subscribe device: ', err);
            self.showSnackBar('No has aceptado recibir notificaciones');
            self.subscription = null;
            self.uncheckSwitch(event.target);
          });
      });
    };

    this.saveDataToServer = function(switchItem) {
      var switchInputs = document.querySelectorAll('.mdl-switch__input');
      var switchInputsArray = [];
      switchInputs.forEach(function(item) {
        var itemId;
        if (item.checked) {
          itemId = parseInt(item.id.replace('list-switch-', ''), 10);
          switchInputsArray.push(itemId);
        }
      });

      var dataToSave = {
        events: switchInputsArray,
        subscription: self.subscription
      };

      var url = 'https://openbiko.duckdns.org/set-events';
      fetch(url, {
        method: 'post',
        mode: 'cors',
        body: JSON.stringify(dataToSave)
      }).then(function(response) {
        if (response.status === 200) {
          // Show snackbar
          self.showSnackBar('Preferencia guardada correctamente', 800);
          console.log(
            '[Notifications] Data saved into ' + url + ':',
            JSON.stringify(dataToSave)
          );
        } else {
          // This check evaluates the original state, not the current one,
          // thus resetting switch to its original state
          if (switchItem.getAttribute('checked') === 'checked') {
            // Check checkbox
            self.checkSwitch(switchItem);
          } else {
            // Uncheck checkbox
            self.uncheckSwitch(switchItem);
          }

          // Show snackbar
          self.showSnackBar('Error guardando preferencia!', 800);
        }}
      );
    };

    this.showSwitches = function() {
      document.querySelectorAll('.mdl-switch__input').forEach(
        function(item) {
          item.parentElement.classList.remove('hidden');
        }
      );
      console.log('[Notifications] UI state: switch inputs displayed');
    };

    this.hideSwitches = function() {
      document.querySelectorAll('.mdl-switch__input').forEach(
        function(item) {
          item.parentElement.classList.add('hidden');
        }
      );
      console.log('[Notifications] UI state: switch inputs hidden');
    };

    this.checkSwitch = function(switchElement) {
      switchElement.setAttribute('checked', 'checked');
      switchElement.parentElement.classList.add('is-checked');
    };

    this.uncheckSwitch = function(switchElement) {
      switchElement.removeAttribute('checked');
      switchElement.parentElement.classList.remove('is-checked');
    };

    // Show snackbar
    this.showSnackBar = function(message, timeout) {
      window.componentHandler.upgradeAllRegistered();
      var snackbarContainer = document.getElementById('snackbar');
      snackbarContainer.MaterialSnackbar.showSnackbar(
        {
          message: message,
          timeout: timeout || 2000,
          actionHandler: function() {
            var snackBar = document.querySelector('#snackbar');
            snackBar.classList.remove('mdl-snackbar--active');
          },
          actionText: 'OK'
        }
      );
    };

    this.urlB64ToUint8Array = function(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

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
