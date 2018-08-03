/* jshint node: true */
'use strict';

const SourceApi = require('../source-api'),
      _         = require('lodash'),
      Utils     = require('../shared/Utils'),
      Path      = require('path');

class DiffBase extends SourceApi {
    constructor (options) {
        const { product, diffTarget, version, diffTargetVersion } = options;
        
        if (!product && diffTarget) {
            options.product = diffTarget;
        }
        if (!version && diffTargetVersion) {
            options.version = diffTargetVersion;
        }
        
        super(options);
    }
    
    /**
     * The command to use when building the doxi files for diffing
     * @return {String} The doxi build command
     */
    get doxiBuildCommand () {
        return this.options.doxiBuild || 'all-classes';
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
        const { options } = this;
        
        return options.diffTargetProduct || options.product;
    }
    
    /**
     * Sets the target product to be diffed
     * @return {String} The target product to diff
     */
    set diffTargetProduct (product) {
        this.options.diffTargetProduct = product;
    }
    
    /**
     * The source product to diff from.  Will be the `product` passed in the CLI options 
     * unless a param of `--diffSource` is passed or unless there is a sourceProduct 
     * configured in the `projectDefaults`
     * @return {String} The product to diff from
     */
    get diffSourceProduct () {
        const { options } = this;
            
        return options.diffSourceProduct || this.diffTargetProduct;
    }
    
    /**
     * Sets the source product to be diffed
     * @return {String} The source product to diff
     */
    set diffSourceProduct (product) {
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
        const { options } = this;
        
        return options.diffTargetVersion || options.version;
    }
    
    /**
     * Sets the target product version to be diffed
     * @return {String} The target version to diff
     */
    set diffTargetVersion (version) {
        this.options.diffTargetVersion = version;
    }
    
    /**
     * The source product version to diff from.  It will be the version before 
     * {@link diffTargetVersion} unless the param `--diffSourceVersion` is passed or 
     * unless there is a sourceProduct / version configured in the `projectDefaults`
     * @return {String} The product version to diff from
     */
    get diffSourceVersion () {
        const {
                  options,
                  diffTargetVersion,
                  diffTargetProduct
              }             = this,
              { products }  = options,
              { sourceVer } = products[diffTargetProduct];
        let   sourceVersion = options.diffSourceVersion,
              diff;
        
        // if the config file has a source version map
        if (sourceVer) {
            const sourceVerNumber = sourceVer[diffTargetVersion];
            
            // if a source version wasn't passed in initially and we have a source 
            // version mapped against the target version then use that version as the 
            // source version
            if (!sourceVersion && sourceVerNumber) {
                sourceVersion = sourceVerNumber;
            }
        }
        
        if (sourceVersion) {
            diff = sourceVersion;
        } else {
            const target        = this.diffTargetProduct,
                  sourceProduct = options.products[target],
                  exceptions    = options.buildExceptions[target] || [],
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
        
        return diff;
    }
    
    /**
     * Sets the target product version to be diffed
     * @return {String} The target version to diff
     */
    set diffSourceVersion (version) {
        this.options.diffSourceVersion = version;
    }
    
    /**
     * Returns the directory where diffs will be output
     * @return {String} The diff output directory
     */
    get diffOutputDir () {
        const { options } = this,
              {
                  diffOutputDir,
                  outputDir
              }   = options,
              obj = {
                  outputDir : outputDir,
                  product   : this.diffTargetProduct
              };
                
        return Utils.format(diffOutputDir, obj);
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
            apiDirName,
            options
        }                = this,
        { diffFileName } = options;
        
        if (diffFileName) {
            return diffFileName;
        }
        
        return `${diffSourceProduct}-${diffSourceVersion}-to-${diffTargetProduct}-${diffTargetVersion}-${apiDirName}`;
    }
    
    /**
     * Returns the current diff process (needs to be set before the diff logic knows 
     * which action is happening as doxi is processing files for a given product / 
     * version)
     * @return {String} Either 'target' or 'source'
     */
    get diffProcess () {
        return this._diffProcessing || 'Target';
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
     * being processed (or will return the `sourceProduct` value from the 
     * `projectDefaults` if configured)
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
    
    /**
     * Returns the output path string passed from the CLI options if available or the
     * joined `diffOutputDir` and `diffFileName`.  The path will then be suffixed with
     * the `extension` param.
     * @param {String} extension The file extension to append.  Defaults to 'md'
     * @return {String} The full diff output path
     */
    getDiffOutputPath (extension = 'md') {
        var outputDiffDir = this.options._myRoot + "/build/diff";
       
        console.log("Diff Output Path=" + outputDiffDir)

        const { diffFileName } = this;
            
        return Path.join(outputDiffDir, `${diffFileName}.${extension}`);
    }
    
    /**
     * Strips \n instances from the ends of the passed string
     * @param {String} str The string to trim
     * @return {String} The trimmed string
     */
    trimNewlines (str) {
        return str.replace(/^(?:\n)+|(?:\n)+$/g, '');
    }
}

module.exports = DiffBase;