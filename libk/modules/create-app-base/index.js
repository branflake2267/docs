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

const SourceGuides = require('../source-guides'),
      Utils        = require('../shared/Utils');

class AppBase extends SourceGuides {
    constructor (options) {
        super(options);

        let o = options,
            product  = o.product,
            version  = o.version,
            majorVer = version.charAt(),
            prodObj  = o.products[product],
            toolkit  = prodObj.toolkit && prodObj.toolkit[majorVer];

        o.prodVerMeta   = {
            majorVer    : majorVer,
            prodObj     : prodObj,
            hasApi      : prodObj.hasApi,
            hasVersions : prodObj.hasVersions,
            hasToolkits : !!toolkit,
            toolkit     : toolkit,
            hasGuides   : prodObj.hasGuides === false ? false : true
        };
    }

    /**
     * Default entry point for this module
     */
    // TODO wire up promises instead of events for app flow control
    run () {
        // TODO process the output HTML files here in the create-app-html class (maybe by overriding the output method in source-api)
        console.log('PROCESS ALL OF THE SOURCE FILES TO ');*/

        this.runApi()
        .then(this.runGuides.bind(this));
    }

    /**
     * Run the api processor (for the toolkit stipulated in the options or against 
     * each toolkit - if applicable)
     */
    // TODO remove events in favor of promises
    runApi () {
        let options = this.options,
            meta = this.options.prodVerMeta,
            toolkitList = Utils.from(
                meta.hasToolkits ?
                (options.toolkit || meta.toolkit) :
                false
            );
        
        return toolkitList.reduce((sequence, tk) => {
            return sequence.then(() => {
                this.options.toolkit = tk;
                return this.prepareApiSource();
            });
        }, Promise.resolve());
    }

    /**
     * Run the guide processor (if the product has guides)
     */
    runGuides () {
        this.processGuides();
    }
}

module.exports = AppBase;
