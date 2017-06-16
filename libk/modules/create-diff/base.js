/* jshint node: true */
'use strict';

const SourceApi = require('../source-api'),
      _         = require('lodash');

class DiffBase extends SourceApi {
    constructor (options) {
        super(options);
    }
    
    /**
     * 
     */
    get typeCategories () {
        return [ 'class', 'configs', 'properties', 'static-properties', 'methods', 
        'static-methods', 'events', 'vars', 'sass-mixins' ];
    }
    
    /**
     * 
     */
    /*get categories () {
        return ['configs', 'properties', 'property', 'static-properties', 'methods', 
        'method', 'static-methods', 'events', 'event', 'vars'];
    }*/
    
    /**
     * Array of all possible categories and their labels
     * @return {Object[]} Array of objects of all categories and their start-cased labels
     */
    /*get categoriesLabels () {
        if (!this._categories) {
            let list = this.categories;
            
            this._categories = this.setNameAndLabel(list);
        }
        
        return this._categories;
    }*/
    
    /**
     * 
     */
    get classProps () {
        return [ 'alias', 'alternateClassNames', 'extends', 'mixins', 'uses', 'singleton',
         'access', 'requires' ];
    }
    
    /**
     * 
     */
    get memberProps () {
        return [ 'access', 'optional', 'value', 'accessor', 'inheritdoc', 
        'deprecatedMessage', 'removedMessage', 'hide', 'localdoc', 'preventable',
        'readonly', 'type' ];
    }
    
    /**
     * Array of all possible class / member attributes
     * @return {Object[]} Array of objects of all props and their start-cased labels
     */
    /*get classPropsLabels () {
        if (!this._classProps) {
            let list = this.classProps;
            
            this._categories = this.setNameAndLabel(list);
        }
        
        return this._classProps;
    }*/
    
    /**
     * The target (the one that shows that things were added if not in the 
     * {@link #diffSourceProduct}).  This will be `product` passed in the CLI options 
     * unless a param of `diffTarget` is passed
     * @return {String} The product to diff
     */
    get diffTargetProduct () {
        if (!this._diffTargetProduct) {
            const { options } = this;
            
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
            const { options } = this;
            
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
            const { options } = this;
            
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
            const { options }   = this,
                  sourceVersion = options.diffSourceVersion;
            
            if (sourceVersion) {
                this._diffSourceVersion = sourceVersion;
            } else {
                const target        = this.diffTargetProduct,
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
     * Returns the current diff process (needs to be set before the diff logic knows 
     * which action is happening as doxi is processing files for a given product / 
     * version)
     * @return {String} Either 'target' or 'source'
     */
    get diffProcess () {
        return this._diffProcessing;
    }
    
    /**
     * Sets the current diff process (needs to be set before the diff logic knows which 
     * action is happening as doxi is processing files for a given product / version)
     * @param {String} part Must be either 'target' or 'source'
     */
    set diffProcess (part) {
        this._diffProcessing = _.capitalize(part);
    }
    
    /**
     * Returns the proper product based on whether the target or source diff file is 
     * being processed
     * @return {String} The product to generate the API output for
     */
    get apiProduct () {
        const part = this.diffProcess;
        
        return this[`diff${part}Product`];
    }
    
    /**
     * Returns the proper version based on whether the target or source diff file is 
     * being processed
     * @return {String} The version number for the current product
     */
    get apiVersion () {
        const part = this.diffProcess;
        
        return this[`diff${part}Version`];
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
    /*setNameAndLabel (arr) {
        return arr.map(string => {
            return {
                name  : string,
                label : _.startCase(string)
            };
        });
    }*/
}

module.exports = DiffBase;