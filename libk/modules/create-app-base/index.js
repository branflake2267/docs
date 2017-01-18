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
        /*let me = this,
            dt = new Date();

        let options = this.options,
            meta    = options.prodVerMeta;

        // create a toolkit list to run the api processor with
        this.toolkitList = Utils.from(
            meta.hasToolkits ?
            (options.toolkit || meta.toolkit) :
            false
        );

        // if the produce has API docs process them
        if (meta.hasApi) {
            // once the api docs have been processed run the api processor again
            // each time it's run a toolkit is processed (as applicable)
            this.emitter.on('apiProcessed', function () {
                setTimeout(function () { // had memory issues before deferring the runApi to allow for garbage collection
                    me.runApi();
                }, 10);
            });

            this.runApi();
        } else {
            // if no api docs then notify that the api portion is complete
            // TODO prolly move this to the source-api module as a method call: apiDone() or something that emits the event
            this.emitter.emit('apiDone');
        }

        // once the api portion is processed then process the guides (if applicable)
        if (meta.hasGuides) {
            this.emitter.on('apiDone', function () {
                me.runGuides();
            });
        }

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
        /*
        // set the toolkit for the current api docs processor run (and pop it out of the 
        // toolkits array so it's not processed on the next run)
        let tk = this.options.toolkit = this.toolkitList.shift();

        // if there is a toolkit to process, process the api docs (using the toolkit)
        if (tk) {
            this.prepareApiSource();
        // else notify that the api processing is done
        } else {
            // TODO prolly move this to the source-api module as a method call: apiDone() or something that emits the event
            this.emitter.emit('apiDone');
        }*/
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
