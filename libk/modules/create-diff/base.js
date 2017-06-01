/* jshint node: true */
'use strict';

const SourceApi = require('../source-api'),
      _         = require('lodash');

class DiffBase extends SourceApi {
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
    
    /**
     * Array of all possible categories and their labels
     * @return {Object[]} Array of objects of all categories and their start-cased labels
     */
    get categories () {
        if (!this._categories) {
            let list = ['configs', 'properties', 'property', 'static-properties', 
            'methods', 'method', 'static-methods', 'events', 'event', 'vars'];
            
            this._categories = this.setNameAndLabel(list);
        }
        
        return this._categories;
    }
    
    /**
     * Array of all possible class / member attributes
     * @return {Object[]} Array of objects of all props and their start-cased labels
     */
    get classProps () {
        if (!this._classProps) {
            let list = ['alias', 'alternateClassNames', 'extends', 'mixins', 'uses', 
            'singleton', 'access', 'requires'];
            
            this._categories = this.setNameAndLabel(list);
        }
        
        return this._classProps;
    }
    
    /**
     * The target (the one that shows that things were added if not in the 
     * {@link #diffSourceProduct}).  This will be `product` passed in the CLI options 
     * unless a param of `diffTarget` is passed
     * @return {String} The product to diff
     */
    get diffTargetProduct () {
        if (!this._diffTargetProduct) {
            let options = this.options;
            
            this._diffTargetProduct = options.diffTarget || options.product;
        }
        
        return this._diffTargetProduct;
    }
    
    /**
     * The source product to diff from.  Will be the `product` passed in the CLI options 
     * unless a param of `--diffSource` is passed
     * @return {String} The product to diff from
     */
    get diffSourceProduct () {
        if (!this._diffSourceProduct) {
            let options = this.options;
            
            this._diffSourceProduct = options.diffSource || options.product;
        }
        
        return this._diffSourceProduct;
    }
    
    /**
     * The target version of the {@link #diffTargetProduct} (the one that shows that 
     * things were added if not in the {@link #diffSourceProduct}).  This will be 
     * `version` passed in the CLI options unless a param of `--diffTargetVersion` is 
     * passed
     * @return {String} The product version to diff
     */
    get diffTargetVersion () {
        if (!this._diffTargetVersion) {
            let options = this.options;
            
            this._diffTargetVersion = options.diffTargetVersion || options.version;
        }
        
        return this._diffTargetVersion;
    }
    
    /**
     * The source product version to diff from.  It will be the version before 
     * {@link diffTargetVersion} unless the param `--diffSourceVersion` is passed
     * @return {String} The product version to diff from
     */
    get diffSourceVersion () {
        if (!this._diffSourceVersion) {
            let options = this.options,
                sourceVersion = options.diffSourceVersion;
            
            if (sourceVersion) {
                this._diffSourceVersion = sourceVersion;
            } else {
                let target        = this.diffTargetProduct,
                    sourceProduct = options.products[target],
                    exceptions    = options.buildExceptions[target],
                    versions      = sourceProduct.productMenu,
                    targetVersion = this.diffTargetVersion,
                    idx           = versions && versions.indexOf(targetVersion),
                    previous      = idx !== -1 && versions[idx + 1];
                
                if (previous && exceptions.indexOf(previous) > -1) {
                    this.error(`A version prior to ${targetVersion} could not 
                        automatically be determined.  Please supply the source version 
                        using the --diffSourceVersion flag`);
                    process.exit();
                } else {
                    this._diffSourceVersion = previous;
                }
            }
        }
        
        return this._diffSourceVersion;
    }
    
    /**
     * Iterates over an array of strings and sets the name + label on an object using the
     * lowercase string of each item in the array as the 'name' and a start-cased version 
     * of the name as the 'label'
     * 
     * i.e. An `arr` of ['configs', 'static-methods'] returns:
     * 
     *     [{
     *         name  : 'configs',
     *         label : 'Configs'
     *     }, {
     *         name  : 'static-methods',
     *         label : 'Static Methods'
     *     }]
     * 
     * Used by {@link #categories} and {@link #classProps}
     * 
     * @param {String[]} arr The array of strings to process
     * @return {Object[]} The array name / label object pairs for each string item in 
     * `arr`
     */
    setNameAndLabel (arr) {
        return arr.map(string => {
            return {
                name  : string,
                label : _.startCase(string)
            };
        });
    }
}

module.exports = DiffBase;