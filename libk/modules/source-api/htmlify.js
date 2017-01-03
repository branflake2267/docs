'use strict';

// Worker module that turns a source SDK file into an HTML version of that file allowing
// users to view the framework source in the browser

const Highlights  = require('highlights'),
      highlighter = new Highlights(),
      Path        = require('path');

// when the worker is called
onmessage = function (ev) {
    // the file path to HTML-ify
    let path = ev.data;

    // Normalize links to sub-modules relative to this location
    path  = path.replace('../../../../docs', '../../../docs');
    path  = path.replace('../../../../localRepos', '../../../localRepos');
    path  = path.replace('../node_modules', '../../../localRepos/orion/node_modules');

    // turns the source into HTML
    highlighter.highlight({
        filePath: Path.resolve(__dirname, path)
    }, function (err, html) {
        if (err) throw err;

        // posts back the HTML-ified source + the source path
        postMessage({
            html: html,
            path: ev.data
        });
    });
};
