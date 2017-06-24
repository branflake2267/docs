/* jshint node: true */
'use strict';

const SourceApi = require('../source-api'),
      _         = require('lodash'),
      Utils     = require('../shared/Utils');

class DiffBase extends SourceApi {
    constructor (options) {
        super(options);
    }
    
    /**
     * Returns the categories to be sorted in the diff output
     * @return {String[]} The array of all class / member category types
     */
    get typeCategories () {
        return this.options.typeCategories;
    }
    
    /**
     * Returns the properties of a class that should be considered in the diff
     * @return {String[]} The array of eligible class properties to diff against
     */
    get classProps () {
        const { classProps, skipClassProps } = this.options;
        
        return _.differenceWith(classProps, skipClassProps, _.isEqual);
    }
    
    /**
     * Returns the properties of members / params that should be considered in the diff
     * @return {String[]} The array of eligible member properties to diff against
     */
    get memberProps () {
        const { memberProps, skipMemberProps } = this.options;
        
        return _.differenceWith(memberProps, skipMemberProps, _.isEqual);
    }
    
    /**
     * The target (the one that shows that things were added if not in the 
     * {@link #diffSourceProduct}).  This will be `product` passed in the CLI options 
     * unless a param of `diffTarget` is passed
     * @return {String} The product to diff
     */
    get diffTargetProduct () {
        //if (!this._diffTargetProduct) {
            const { options } = this;
            
            return options.diffTargetProduct || options.product;
        //}
        
        //return this._diffTargetProduct;
    }
    
    /**
     * Sets the target product to be diffed
     * @return {String} The target product to diff
     */
    set diffTargetProduct (product) {
        //this._diffTargetProduct = product;
        this.options.diffTargetProduct = product;
    }
    
    /**
     * The source product to diff from.  Will be the `product` passed in the CLI options 
     * unless a param of `--diffSource` is passed
     * @return {String} The product to diff from
     */
    get diffSourceProduct () {
        //if (!this._diffSourceProduct) {
            const { options } = this;
            
        return options.diffSourceProduct || this.diffTargetProduct;
        //}
        
        //return this._diffSourceProduct;
    }
    
    /**
     * Sets the source product to be diffed
     * @return {String} The source product to diff
     */
    set diffSourceProduct (product) {
        //this._diffSourceProduct = product;
        this.options.diffSourceProduct = product;
    }
    
    /**
     * The target version of the {@link #diffTargetProduct} (the one that shows that 
     * things were added if not in the {@link #diffSourceProduct}).  This will be 
     * `version` passed in the CLI options unless a param of `--diffTargetVersion` is 
     * passed
     * @return {String} The product version to diff
     */
    get diffTargetVersion () {
        //if (!this._diffTargetVersion) {
            const { options } = this;
            
            return options.diffTargetVersion || options.version;
        //}
        
        //return this._diffTargetVersion;
    }
    
    /**
     * Sets the target product version to be diffed
     * @return {String} The target version to diff
     */
    set diffTargetVersion (version) {
        //this._diffTargetVersion = version;
        this.options.diffTargetVersion = version;
    }
    
    /**
     * The source product version to diff from.  It will be the version before 
     * {@link diffTargetVersion} unless the param `--diffSourceVersion` is passed
     * @return {String} The product version to diff from
     */
    get diffSourceVersion () {
        //if (!this._diffSourceVersion) {
            const { options }   = this,
                  sourceVersion = options.diffSourceVersion;
            let   diff;
            
            if (sourceVersion) {
                diff = sourceVersion;
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
                    diff = previous;
                }
            }
        //}
        
        return diff;
    }
    
    /**
     * Sets the target product version to be diffed
     * @return {String} The target version to diff
     */
    set diffSourceVersion (version) {
        //this._diffSourceVersion = version;
        this.options.diffSourceVersion = version;
    }
    
    /**
     * Returns the directory where diffs will be output
     * @return {String} The diff output directory
     */
    get diffOutputDir () {
        //if (!this._diffOutputPath) {
            const { options }                   = this,
                  { diffOutputDir, outputDir } = options,
                  obj                           = {
                      outputDir : outputDir,
                      product   : this.diffTargetProduct
                  };
                  
            return Utils.format(diffOutputDir, obj);
        //}

        //return this._diffOutputPath;
    }
    
    /**
     * Returns the diff file name from the target and source products / versions
     * @return {String} The assembled file name
     */
    get diffFileName () {
        const {
            diffSourceProduct,
            diffSourceVersion,
            diffTargetProduct,
            diffTargetVersion,
            apiDirName
        } = this;
        
        return `${diffSourceProduct}-${diffSourceVersion}-to-${diffTargetProduct}-${diffTargetVersion}-${apiDirName}`;
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
     * Returns the normalized product name.
     * i.e. some links have the product name of ext, but most everywhere in the docs we're referring to Ext JS as 'extjs'
     *
     *     console.log(this.getProduct('ext')); // returns 'extjs'
     * @param {String} prod The product name to normalized
     * @return {String} The normalized product name or `null` if not found
     */
    getProduct (prod) {
        prod = prod || this.diffTargetProduct;
        return this.options.normalizedProductList[prod];
    }
}

module.exports = DiffBase;