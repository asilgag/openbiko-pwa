/**
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

"use strict";

// This gulpfile makes use of new JavaScript features.
// Babel handles this without us having to do anything. It just works.
// You can read more about the new JavaScript features here:
// https://babeljs.io/docs/learn-es2015/

import path from "path";
import gulp from "gulp";
import concat from "gulp-concat";
import rename from "gulp-rename";
import uglify from "gulp-uglify";
import del from "del";
import modRewrite from "connect-modrewrite";
//import browserSync from "browser-sync";
import swPrecache from "sw-precache";
import inlinesource from "gulp-inline-source";
import cssBase64 from "gulp-css-base64";
import fs from "fs";
import realFavicon from "gulp-real-favicon";
import gulpLoadPlugins from "gulp-load-plugins";
import { output as pagespeedVendor } from "psi";
import pkg from "./package.json";
import through2 from "through2";
import browserify from "browserify";

const browserSync = require("browser-sync").create();
const sass = require("gulp-sass")(require("sass"));
const squoosh = require("gulp-libsquoosh");

const $ = gulpLoadPlugins();

// Lint JavaScript
export const lint = () => {
  gulp.src(["app/scripts/**/*.js"]).pipe($.eslint()).pipe($.eslint.format());
};

// Optimize images
export const images = () => {
  return gulp
    .src("app/images/**/*")
    .pipe(squoosh())
    .pipe(gulp.dest("dist/images"))
    .pipe($.size({ title: "images" }));
};

// Copy all files at the root level (app)
export const copy = () => {
  return gulp
    .src(
      [
        "app/*",
        "app/**/*.json",
        "!app/*.html",
        "node_modules/apache-server-configs/dist/.htaccess",
      ],
      {
        dot: true,
      }
    )
    .pipe(gulp.dest("dist"))
    .pipe($.size({ title: "copy" }));
};

// Compile and automatically prefix stylesheets
export const styles = () => {
  const AUTOPREFIXER_BROWSERS = [
    "ie >= 10",
    "ie_mob >= 10",
    "ff >= 30",
    "chrome >= 34",
    "safari >= 7",
    "opera >= 23",
    "ios >= 7",
    "android >= 4.4",
    "bb >= 10",
  ];

  // For best performance, don't add Sass partials to `gulp.src`
  return (
    gulp
      .src(["app/styles/**/*.scss", "app/styles/**/*.css"])
      .pipe($.newer(".tmp/styles"))
      .pipe($.sourcemaps.init())
      .pipe(
        sass({
          precision: 10,
        }).on("error", sass.logError)
      )
      .pipe(cssBase64({ extensionsAllowed: [".woff2"] }))
      .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
      .pipe(gulp.dest(".tmp/styles"))
      // Concatenate and minify styles
      .pipe($.if("*.css", $.cssnano()))
      .pipe($.size({ title: "styles" }))
      .pipe($.sourcemaps.write("./"))
      .pipe(gulp.dest("dist/styles"))
  );
};

//script paths

export const browserify2 = () => {
  glob("./app/scripts/**/*.js", {}, function (files) {
    var b = browserify();
    files.forEach(function (file) {
      b.add(file);
    });

    b.bundle().pipe(source("output.js")).pipe(gulp.dest("dist/scripts"));

    cb();
  });
};

var jsFiles = "./app/scripts/**/*.js",
  jsDest = "dist/scripts";

export const scripts = () => {
  return gulp
    .src(jsFiles)
    .pipe(
      through2.obj(function (file, enc, next) {
        browserify(file.path).bundle(function (err, res) {
          if (err) {
            return next(err);
          }

          file.contents = res;
          next(null, file);
        });
      })
    )
    .pipe(concat("main.js"))
    .pipe(gulp.dest(jsDest))
    .pipe(rename("main.min.js"))
    .pipe(uglify())
    .pipe(gulp.dest(jsDest));
};

// Concatenate and minify JavaScript. Optionally transpiles ES2015 code to ES5.
// to enable ES2015 support remove the line `"only": "gulpfile.babel.js",` in the
// `.babelrc` file.
export const scriptsOld = () => {
  gulp
    .src([
      // Note: Since we are not using useref in the scripts build pipeline,
      //       you need to explicitly list your scripts here in the right order
      //       to be correctly concatenated
      "./app/scripts/app-shell.js",
      "./app/scripts/sw/sw-init.js",
      "./app/scripts/main.js",
    ])
    .pipe($.newer(".tmp/scripts"))
    // .pipe(
    //   through2.obj(function (file, enc, next) {
    //     browserify(file.path)
    //       .transform("stripify")
    //       .bundle(function (err, res) {
    //         // assumes file.contents is a Buffer
    //         file.contents = res;
    //         next(null, file);
    //       });
    //   })
    // )
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(".tmp/scripts"))
    .pipe($.concat("main.min.js"))
    // Output files
    .pipe($.size({ title: "scripts" }))
    .pipe($.sourcemaps.write("."))
    .pipe(gulp.dest("dist/scripts"));
};

// Scan your HTML for assets & optimize them
export const html = () => {
  return (
    gulp
      .src("app/**/*.html")
      .pipe(
        $.useref({
          searchPath: "{.tmp,app}",
          noAssets: true,
        })
      )

      .pipe(
        inlinesource({
          rootpath: "dist",
        })
      )

      // Favicon markups
      .pipe(
        $.if(
          "*.html",
          realFavicon.injectFaviconMarkups(
            JSON.parse(fs.readFileSync("favicon-data.json")).favicon.html_code,
            {
              keep: [
                'link[rel="manifest"]',
                'meta[name="mobile-web-app-capable"]',
                'meta[name="apple-mobile-web-app-capable"]',
                'meta[name="apple-mobile-web-app-title"]',
                'meta[name="application-name"]',
              ],
            }
          )
        )
      )

      // Minify any HTML
      .pipe(
        $.if(
          "*.html",
          $.htmlmin({
            removeComments: true,
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeRedundantAttributes: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            removeOptionalTags: true,
          })
        )
      )

      // Output files
      .pipe($.if("*.html", $.size({ title: "html", showFiles: true })))
      .pipe(gulp.dest("dist"))
  );
};

// Clean output directory
export const clean = () => del([".tmp", "dist/*", "!dist/.git"], { dot: true });

export const watcher = () => {
  gulp.watch(["app/**/*.html"], gulp.series(browsersyncReload));
  gulp.watch(
    ["app/styles/**/*.{scss,css}"],
    gulp.series(styles, browsersyncReload)
  );
  gulp.watch(["app/scripts/**/*.js"], gulp.series(scripts, browsersyncReload));
  gulp.watch(["app/images/**/*"], gulp.series(browsersyncReload));
};

export const browser = (cb) => {
  browserSync.init({
    notify: false,
    // Customize the Browsersync console logging prefix
    logPrefix: "BIKO",
    // Allow scroll syncing across breakpoints
    scrollElementMapping: ["main", ".mdl-layout"],
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      //baseDir: [".tmp", "app"],
      baseDir: ["dist", "app"],
      middleware: [modRewrite(["!\\.\\w+$ /index.html [L]"])],
    },
    port: 3000,
  });
  cb();
};

export const browsersyncReload = (cb) => {
  browserSync.reload;
  cb();
};

// Watch files for changes & reload
gulp.task("serve", gulp.series(scripts, styles, images, browser, watcher));

// Build and serve the output from the dist build
export const serveDist = () => {
  gulp.series(taskDefault);
  browserSync({
    notify: false,
    logPrefix: "BIKO",
    // Allow scroll syncing across breakpoints
    scrollElementMapping: ["main", ".mdl-layout"],
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: ["dist"] /*,
     middleware: [
     modRewrite([
     '!\\.\\w+$ /index.html [L]'
     ])
     ]*/,
    },
    port: 3001,
  });
};

// Run PageSpeed Insights
export const pagespeed = (cb) => {
  // Update the below URL to the public URL of your site
  pagespeedVendor(
    "example.com",
    {
      strategy: "mobile",
      // By default we use the PageSpeed Insights free (no API key) tier.
      // Use a Google Developer API key if you have one: http://goo.gl/RkN0vE
      // key: 'YOUR_API_KEY'
    },
    cb
  );
};

// Copy over the scripts that are used in importScripts as part of the generateServiceSorker task.
export const copySwScripts = () => {
  return gulp
    .src([
      "node_modules/sw-toolbox/sw-toolbox.js",
      "node_modules/sw-toolbox/sw-toolbox.js.map",
      "app/scripts/sw/runtime-caching.js",
      "app/scripts/sw/sw-push.js",
    ])
    .pipe(gulp.dest("dist/scripts/sw"));
};

// See http://www.html5rocks.com/en/tutorials/service-worker/introduction/ for
// an in-depth explanation of what service workers are and why you should care.
// Generate a service worker file that will provide offline functionality for
// local resources. This should only be done for the 'dist' directory, to allow
// live reload to work as expected when serving from the 'app' directory.
export const generateServiceSorker = () => {
  gulp.series(copySwScripts);
  const rootDir = "dist";
  const filepath = path.join(rootDir, "service-worker.js");

  return swPrecache.write(filepath, {
    // Used to avoid cache conflicts when serving on localhost.
    cacheId: pkg.name || "openbiko-pwa",
    // sw-toolbox.js needs to be listed first. It sets up methods used in runtime-caching.js.
    importScripts: [
      "scripts/sw/sw-toolbox.js",
      "scripts/sw/runtime-caching.js",
      "scripts/sw/sw-push.js",
    ],
    staticFileGlobs: [
      // Add/remove glob patterns to match your directory setup.
      `${rootDir}/images/**/*`,
      `${rootDir}/partials/**/*`,
      `${rootDir}/data/**/*`,
      `${rootDir}/scripts/**/*.js`,
      `${rootDir}/styles/**/*.css`,
      `${rootDir}/*.{html,json}`,
    ],
    // Translates a static file path to the relative URL that it's served from.
    // This is '/' rather than path.sep because the paths returned from
    // glob always use '/'.
    stripPrefix: rootDir + "/",
  });
};

export const clearCache = () => {
  $.cache.clearAll();
};

// Build production files, the taskDefault task
gulp.task(
  "default",
  gulp.series(
    clean,
    styles,
    //lint,
    scripts,
    images,
    copy,
    html,
    generateServiceSorker
  )
);

// Load custom tasks from the `tasks` directory
// Run: `npm install --save-dev require-dir` from the command-line
try {
  require("require-dir")("tasks");
} catch (err) {
  console.error(err);
}
