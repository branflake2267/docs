/* jshint node: true */
'use strict';

/**
 * Gather up metadata about this run for the passed product / version
 *  - decorate this instance with things like hasApi, hasGuides, toolkits, etc.
 * See what the product / version needs (i.e. toolkits or guides or no api or just what)
 * loop over each needed thing and call the necessary 'source' module
 *  - So, would make classic source and modern source and guides for ext 6
 *  - need a way to opt in and out of guides since they are not in the public SDK (? a way to point to your own guides folder)
 * Output all of the applicable HTML files
 *  - loop over the prepared api files
 *  - loop over the prepared guide files
 * Create the product / version landing page
 */

const HtmlApp    = require('../create-app-html'),
      Path       = require('path'),
      Handlebars = require('handlebars'),
      Fs         = require('fs-extra'),
      UglifyJS   = require("uglify-js"),
      CleanCSS   = require('clean-css');

class ExtReactHtmlApp extends HtmlApp {
    constructor (options) {
        super(options);

        this.options.prodVerMeta.toolkit = 'modern';
    }

    /**
     * Default entry point for this module
     */
    run () {
        super.run();

        // TODO create a product home page
        // TODO create a Landing page class (if a CLI param is passed - or can be called directly, of course)
    }

    /**
     * Returns the Ext JS version associated with the Reactor version currently being
     * built
     * @return {String} The Ext JS version number for the current Reactor build
     */
    get apiVersion () {
        let ver = this._apiVer;

        if (!ver) {
            let options = this.options,
                rextVersion = options.version || options.currentVersion;

            ver = this._apiVer = options.products.extreact.extjsVer[rextVersion];
        }

        return ver;
    }

    /**
     * Returns the `extjs` product name used for processing the API output
     * @return {String} The `extjs` product name
     */
    get apiProduct () {
        let prod = this._apiProd;

        if (!prod) {
            prod = this._apiProd = 'extjs';
        }

        return prod;
    }

    /**
     * Returns the name of the doxi config file name to use when parsing the SDK.  Uses
     * the product of 'extjs', version associated with the currently building version of 
     * Rext JS (from the projectDefaults.json file), and toolkit currently being acted on.
     * @return {String} The doxi config file name
     */
    /*get doxiCfgFileName () {
        let options = this.options,
            version = this.apiVersion,
            toolkit = 'modern';

        return version + '-' + toolkit + '.doxi.json';
    }*/
}

module.exports = ExtReactHtmlApp;
