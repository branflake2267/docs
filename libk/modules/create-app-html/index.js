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

const AppBase = require('../create-app-base'),
      Utils   = require('../shared/Utils');

class HtmlApp extends AppBase {
    constructor (options) {
        super(options);
    }

    run () {
        let me = this,
            dt = new Date();
        //super.run();

        // TODO this seems like this could be hoisted up to app-base: all of the processing of the source collection, that is
        let options = this.options,
            meta    = options.prodVerMeta;

        this.toolkitList = Utils.from(
            meta.hasToolkits ?
            (options.toolkit || meta.toolkit) :
            false
        );

        if (meta.hasApi) {
            this.emitter.on('apiProcessed', function () {
                setTimeout(function () { // had memory issues before deferring the runApi to allow for garbage collection
                    me.runApi();
                }, 10);
            });

            this.runApi();
        } else {
            // TODO prolly move this to the source-api module as a method call: apiDone() or something that emits the event
            this.emitter.emit('apiDone');
        }

        if (meta.hasGuides) {
            this.emitter.on('apiDone', function () {
                me.runGuides();
            });
        }
        // TODO process the output HTML files here in the create-app-html class (maybe by overriding the output method in source-api)
        console.log('PROCESS ALL OF THE SOURCE FILES TO ');
    }

    runApi () {
        let tk = this.options.toolkit = this.toolkitList.shift();

        if (tk) {
            this.prepareApiSource();
        } else {
            // TODO prolly move this to the source-api module as a method call: apiDone() or something that emits the event
            this.emitter.emit('apiDone');
        }
    }

    runGuides () {
        if (this.options.prodVerMeta.hasGuides) {
            this.processGuides();
        }
    }
}

module.exports = HtmlApp;
