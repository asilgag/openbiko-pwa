// This file is intentionally without code.
// It's present so that service worker registration will work when serving from the 'app' directory.
// The version of service-worker.js that's present in the 'dist' directory is automatically
// generated by the 'generate-service-worker' gulp task, and contains code to precache resources.

/* eslint-env browser, serviceworker, es6 */

'use strict';

// Import push service worker in development mode
importScripts("scripts/sw/sw-push.js");


