"use strict";

import gulp from "gulp";
import concat from "gulp-concat";
import rename from "gulp-rename";
import del from "del";
import modRewrite from "connect-modrewrite";
import inlinesource from "gulp-inline-source";
import cssBase64 from "gulp-css-base64";
import fs from "fs";
import realFavicon from "gulp-real-favicon";
import gulpLoadPlugins from "gulp-load-plugins";
import through2 from "through2";
import browserify from "browserify";
const browserSync = require("browser-sync").create();
const sass = require("gulp-sass")(require("sass"));
const squoosh = require("gulp-libsquoosh");
const $ = gulpLoadPlugins();

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
var jsFiles = "./app/scripts/**/*.js",
  jsDest = "dist/scripts";

export const scripts = () => {
  return (
    gulp
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
      //.pipe(uglify())
      .pipe(gulp.dest(jsDest))
  );
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
  gulp.watch(["app/**/*.html"], gulp.series(html, browsersyncReload));
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
  browserSync.reload();
  cb();
};

// Watch files for changes & reload
gulp.task(
  "serve",
  gulp.series(copy, html, scripts, styles, images, browser, watcher)
);

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

// Build production files, the taskDefault task
gulp.task("default", gulp.series(clean, styles, scripts, images, copy, html));

// Load custom tasks from the `tasks` directory
// Run: `npm install --save-dev require-dir` from the command-line
try {
  require("require-dir")("tasks");
} catch (err) {
  console.error(err);
}
