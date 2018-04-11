/* jshint node: true */
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

const AppBase = require('../create-app-base'),
      Path    = require('path');

class ExtApp extends AppBase {
    constructor (options) {
        super(options);
    }

    /**
     * Returns an array of this module's file name along with the file names of all 
     * ancestor modules
     * @return {String[]} This module's file name preceded by its ancestors'.
     */
    get parentChain () {
        return super.parentChain.concat([this.moduleName]);
    }

    /**
     * Returns this module's name
     */
    get moduleName () {
        return Path.parse(__dirname).base;
    }

    /**
     * Process API links using the passed product, version, class name, etc.
     * @param {String} product The product name
     * @param {String} version The version stipulated in the [[link]] or null if not
     * specified
     * @param {String} toolkit The specified toolkit or 'api'
     * @param {String} className The name of the SDK class
     * @param {String} memberName The name of the member (or member group potentially) or
     * undefined if no member was specified in the link
     * @param {String} text The text to display in the link if specified
     * @return {String} The link markup
     */
    // TODO process the api links for Ext app guides
    createApiLink(product, version, toolkit, className, memberName, text) {
        //
    }
}

module.exports = ExtApp;
