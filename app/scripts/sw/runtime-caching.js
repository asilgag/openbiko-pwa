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
/* eslint-env worker */
// global.toolbox is defined in a different script, sw-toolbox.js, which is part of the
// https://github.com/GoogleChrome/sw-toolbox project.
// That sw-toolbox.js script must be executed first, so it needs to be listed before this in the
// importScripts() call that the parent service worker makes.
(function(global) {
  'use strict';

  // See https://github.com/GoogleChrome/sw-toolbox/blob/6e8242dc328d1f1cfba624269653724b26fa94f1/README.md#toolboxroutergeturlpattern-handler-options
  // and https://github.com/GoogleChrome/sw-toolbox/blob/6e8242dc328d1f1cfba624269653724b26fa94f1/README.md#toolboxfastest
  // for more details on how this handler is defined and what the toolbox.fastest strategy does.

  // Cache all external assets from googleapis, gstatic, etc
  global.toolbox.router.get('/(.*)', global.toolbox.fastest, {
    origin: /\.(?:googleapis|gstatic|getmdl)\.(com|io)$/
  });

  // Al ser una SPA, hay que definir las urls virtuales que también tenemos que precachear
  global.toolbox.precache(
    [
      '/',
      '/index.html',
      '/hace-10-anyos',
      '/faq'
    ]
  );

  // BUG: toolbox se basa en el primer "origin" de arriba para buscar en su cache,
  // de modo que las urls definidas en toolbox.precache() sí que son cacheadas
  // pero luego no son servidas.
  // Hay dos soluciones posibles:
  // 1) No definir ningún origin y cachear todos los recursos externos sin control
  // (útil en la mayoría de los casos pero problemático con Analytics)
  // 2) Definir varios toolbox.router.get() por cada url que pongamos en toolbox.precache()
  // Me decanto por esta segunda opción para tenerla como referencia para el futuro
  global.toolbox.router.get('/', global.toolbox.fastest, {
    origin: /\.(?:firebaseapp)\.(com)$/
  });
  global.toolbox.router.get('/index.html', global.toolbox.fastest, {
    origin: /\.(?:firebaseapp)\.(com)$/
  });
  global.toolbox.router.get('/hace-10-anyos', global.toolbox.fastest, {
    origin: /\.(?:firebaseapp)\.(com)$/
  });
  global.toolbox.router.get('/faq', global.toolbox.fastest, {
    origin: /\.(?:firebaseapp)\.(com)$/
  });
})(self);
