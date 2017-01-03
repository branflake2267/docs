'use strict';

/**
 * Gather up metadata about this run for the passed product / version
 *  - decorate this instance with things like hasApi, hasGuides, toolkits, etc.
 * See what the product / version needs (i.e. toolkits or guides or no api or just what)
 * loop over each needed thing and call the necessary 'source' module
 *  - So, would make classic source and modern source and guides for ext 6
 *  - need a way to opt in and out of guides since they are not in the public SDK (? a way to point to your own guides folder)
 * Output all of the applicable guide HTML files
 *  - loop over the prepared guide files
 * ? Create the product / version landing page
 */

const AppBase = require('../create-app-base');

class ExtApp extends AppBase {
    constructor (options) {
        super(options);
    }

    run () {

    }
}

module.exports = ExtApp;
