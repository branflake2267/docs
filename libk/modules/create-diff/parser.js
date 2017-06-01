/* jshint node: true */
'use strict';

const DiffBase = require('./base.js');

class Parser extends DiffBase {
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
    
    get targetFile () {
        //newAllClasses  = JSON.parse(fs.readFileSync(options.newFile, 'utf8')).global.items,
        //oldAllClasses  = JSON.parse(fs.readFileSync(options.oldFile, 'utf8')).global.items,
        
        // check to see if the target file is cached and if not see if it's on disk
        // if not on disk run doxi for the target product and version
        // read the file and cache it
        // finally return the cached doxi object
    }
    
    get diff () {
        if (!this._diff) {
            let {targetFile, sourceFile} = this;
        }
        
        return this._diff;
    }
}

module.exports = Parser;