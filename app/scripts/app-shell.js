/* eslint-env browser */
(function() {
  'use strict';
/*
  var remoteStyles = [
    'http://fonts.googleapis.com/css?family=Roboto:300,400,500,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://code.getmdl.io/1.2.1/material.red-blue.min.css',
    'styles/main.css'
  ];

  // Asynchronously load CSS with a Request Animation Frame
  // For older browser support see this for a simple shim
  // http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimationFrame(function() {
    var elementToInsertLinkBefore = document.getElementsByTagName('script')[0];
    for (var i = 0; i < remoteStyles.length; i++) {
      var linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.media = 'all';
      linkElement.href = remoteStyles[i];

      elementToInsertLinkBefore.parentNode.insertBefore(
        linkElement,
        elementToInsertLinkBefore
      );
    }
  });
*/

  // Share links
  var goToLink = function(e) {
    e.preventDefault();
    var title = encodeURIComponent(document.title);
    var url = encodeURIComponent(document.location.href);
    var link = this.getAttribute('data-link');
    link = link.replace('{title}', title).replace('{url}', url);
    document.location.href = link;
  };

  var shareLinks = document.querySelectorAll('#share-menu .mdl-chip');
  for (var i = 0; i < shareLinks.length; i++) {
    shareLinks[i].addEventListener('click', goToLink);
  }

  // Show app-shell share menu again
  var shareButton = document.getElementById('share');
  shareButton.addEventListener('click', function() {
    var shareMenu = document.getElementById('share-menu');
    shareMenu.style.cssText = 'display.block !important';
  });

  document.getElementById('snackbar').style.display = 'block';
})();
