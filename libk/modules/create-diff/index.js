/* jshint node: true */
'use strict';

const Parser = require('./parser.js'),
      Utils  = require('../shared/Utils');

class Diff extends Parser {
    constructor (options) {
        super(options);

        /*this.summary                = {};
        this.includeDebugOutput     = options['include-debug-output'];
        this.includeVerboseSummary  = options['verbose-summary'];
        this.countMasterKey         = 'all';
        this.countTypes             = ['all', 'private', 'deprecated'];
        this.outputOptions = {
            private     : options['include-private'],
            deprecated  : options['include-deprecated'],
            class       : options['include-class-details']
        };*/
    }
    
    run () {
        //let diff = this.diff;
        let options     = this.options,
            meta        = this.options.prodVerMeta,
            hasApi      = meta.hasApi,
            toolkitList = Utils.from(
                meta.hasToolkits ?
                    (options.toolkit || meta.toolkits) :
                    false
            );

        // check to see if the product has an api to diff
        if (!hasApi) {
            this.error(`${options.product} does not have an API to diff`);
            return;
        }

        // create the diff for all eligible toolkits
        toolkitList.forEach(toolkit => {
            this.options.toolkit = toolkit;
            let diff = this.diff;
        });
    }
}

module.exports = Diff;