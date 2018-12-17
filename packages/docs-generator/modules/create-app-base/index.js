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

const SourceGuides     = require('../source-guides'),
      Utils            = require('../shared/Utils'),
      Beautify         = require('js-beautify').js_beautify,
      Fs               = require('fs-extra'),
      Path             = require('path'),
      Chalk            = require('chalk'),
      StringSimilarity = require('string-similarity'),
      Diff             = require('../create-diff'),
      _                = require('lodash'),
      Zipdir           = require('zip-dir'),
      CompareVersions = require('compare-versions');

class AppBase extends SourceGuides {
    constructor (options) {
        super(options);
        //this.log(`Create 'AppBase' instance`, 'info');
    }

    /**
     * Returns an array of this module's file name along with the file names of all
     * ancestor modules
     * @return {String[]} This module's file name preceded by its ancestors'.
     */
    get parentChain () {
        return super.parentChain.concat([ Path.parse(__dirname).base ]);
    }

    /**
     * Default entry point for this module
     */
    run () {
        //this.log(`Begin 'AppBase.run'`, 'info');
        
        if (!this.options.skipCreateDiffs) {
            // TODO 
            //this.createDiffs();
        }
        
        return this.doRunApi()
        .then(this.outputApiSearch.bind(this))
        .then(this.processGuides.bind(this))
        .then(this.outputProductMenu.bind(this))
        .then(this.outputOfflineDocs.bind(this))
        .catch(this.error.bind(this));
    }

    /**
     * Run the api processor (for the toolkit stipulated in the options or against
     * each toolkit - if applicable)
     */
    // TODO remove events in favor of promises
    doRunApi (action = 'prepareApiSource') {
        //this.log(`Begin 'AppBase.doRunApi'`, 'info');
        let options     = this.options,
            meta        = this.options.prodVerMeta,
            hasApi      = meta.hasApi,
            toolkitList = Utils.from(
                meta.hasToolkits ?
                    (options.toolkit || meta.toolkits) :
                    false
            );

        if (!hasApi) {
            return Promise.resolve();
        }

        return toolkitList.reduce((sequence, tk) => {
            return sequence.then(() => {
                this.options.toolkit = tk;
                return this[action]();
            });
        }, Promise.resolve())
        .catch(this.error.bind(this));

        this.log("doRunApi: finished");
    }
    
    /**
     * Create the diff files for all eligible versions (see {@link #diffableVersions})
     * for the current product
     */
    createDiffs () {
        const {
                  apiProduct,
                  diffableVersions,
                  options
              }             = this,
              memoVersion   = options.version,
              args          = _.cloneDeep(options._args),
              tempDiff      = new Diff(Object.assign(args, {
                  product : apiProduct,
                  _myRoot : options._myRoot
              }));
        
        // creates all of the doxi files used in the diff process for each version
        tempDiff.createDoxiFiles();
        
        // loop over all diffable versions (minus the last version in the list since it 
        // won't have a previous version to diff against) and create the diff output
        _.dropRight(diffableVersions).forEach(version => {
            const toolkits    = this.getToolkits(apiProduct, version),
                  toolkitList = toolkits || [ 'api' ];
            
            this.options.version = version;
            toolkitList.forEach(toolkit => {
                const args = _.cloneDeep(options._args),
                      diff = new Diff(Object.assign(args, {
                          diffTargetProduct : apiProduct,
                          diffTargetVersion : version,
                          toolkit           : toolkit,
                          forceDoxi         : false,
                          syncRemote        : false,
                          _myRoot           : options._myRoot
                      }));
                
                diff.doRun('outputRaw');
            });
        });
        
        this.options.version = memoVersion;
    }

    /**
     * Run the guide processor (if the product has guides)
     */
    runGuides () {
        //this.log(`Begin 'AppBase.runGuides'`, 'info');
        return this.processGuides()
        .then(() => {
            this.concludeBuild();
        })
        .catch(this.error.bind(this));
    }

    /**
     * Creates the product menu from the products config file
     * @return {Object[]} The product tree array
     */
    getProductMenu () {
        let options          = this.options,
            // this is an array of keys found on the array of product defaults in the
            // config file in the order the products should be displayed in the UI
            includedProducts = options.productMenu || [],
            products         = options.products,
            len              = includedProducts.length,
            i                = 0,
            prodTree         = [];

        // loop over the product names and add each product as a node in the prodTree
        // array with each version added as child nodes
        for (; i < len; i++) {
            let name    = includedProducts[i],
                product = products[name],
                title   = product.title,
                menu    = product.productMenu;

            // if the specified product has a productMenu value
            if (menu) {
                // create the product node
                let node = {
                    text     : title,
                    product  : name,
                    children : []
                };

                // now add child items to it
                // starting with the product name itself if the value of productMenu is
                // just `true` -vs- a list of version numbers
                if (menu === true) {
                    node.children.push({
                        text : title,
                        path : name
                    });
                } else {
                    // else we'll loop over the list of product versions to include in
                    // the product menu
                    let verLength = menu.length,
                        j         = 0;

                    for (; j < verLength; j++) {
                        let ver         = menu[j],
                            verIsObject = Utils.isObject(ver),
                            text        = verIsObject ? ver.text : ver;

                        // the version could be a string or could be an object with a
                        // text property as the text to display
                        node.children.push({
                            text : text,
                            // optionally, a static link may be included in the object
                            // form
                            link : ver.link,
                            path : `${name}/${text}`
                        });
                    }
                }

                prodTree.push(node);
            }
        }

        return prodTree;
    }

    /**
     * Writes out the JSON needed for the product menu
     */
    outputProductMenu () {
        return new Promise((resolve, reject) => {
            let path        = Path.join(this.jsDir, 'productMenu.js'),
                productMenu = JSON.stringify(this.getProductMenu()),
                output      = `DocsApp.productMenu = ${productMenu};`;

            Fs.writeFile(path, output, 'utf8', (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    /**
     * Parse the API links found in an HTML blob.  The parser is looking for pseudo-links
     * with a syntax like: [[product-version:ClassName#memberName text]].
     *
     * Examples:
     * [[ext:Ext]] // the Ext class for the current version
     * [[ext-6.0.2:Ext]] // the Ext class for version 6.0.2
     * [[ext:Ext myExt]] // the Ext class for the current version with a display text of 'myExt'
     * [[ext-5.0.0:Ext.grid.Panel#cfg-store]] // the `store` config on the Ext.grid.Panel class in 5.0.0
     * [[ext-5.0.0:Ext.grid.Panel#cfg-store store]] // the `store` config on the Ext.grid.Panel class in 5.0.0 with display text of 'store'
     *
     * @param {String} html The HTML blob to mine for api links
     * @return {String} The HTML blob with the pseudo-links replaced with actual links
     */
    //parseApiLinks (html, data) {
    parseGuideLinks (html, data) {
        html = html.replace(/\[{2}([a-z0-9.]+):([a-z0-9!._\-#]+)\s?([a-z$\/'.()[\]\\_-\s]*)\]{2}/gim, (match, productVer, link, text) => {
            link = link.replace('!','-');

            let { options }     = this,
                exceptions      = options.buildExceptions,
                { prodVerMeta } = options,
                hasHash         = link.indexOf('#'),
                hasDash         = link.indexOf('-'),
                canSplit        = !!(hasHash > -1 || hasDash > -1),
                splitIndex      = (hasHash > -1) ? hasHash                  : hasDash,
                className       = canSplit ? link.substring(0, splitIndex)  : link,
                hash            = canSplit ? link.substring(splitIndex + 1) : null,
                prodDelimiter   = productVer.indexOf('-'),
                hasVersion      = prodDelimiter > -1,
                product         = hasVersion ? productVer.substring(0, prodDelimiter) : productVer,
                version         = hasVersion ? productVer.substr(prodDelimiter + 1)   : false,
                toolkit         = (!data.toolkit || data.toolkit === 'universal') ? (prodVerMeta.toolkit || 'api') : data.toolkit,
                memberName;

            product = this.getProduct(product);
            version = version || this.options.version;
            text    = text || className + (hash ? `#${hash}` : '');

            // catches when a link is parsable, but does not contain a valid product to
            // point to.  Throw and error and just return the originally matched string.
            if (!product) {
                this.log(`The link ${match} does not contain a valid product`, 'error');
                return match;
            }

            // warn if the member is ambiguous - doesn't have a type specified
            if (hash) {
                // get the types and add a dash as that's how the link would be
                // constructed
                let types    = this.memberTypes.map((type) => {
                    return `${type}-`;
                }).join('|'),
                    typeEval = new RegExp(`^(${types})?([a-zA-Z0-9$-_]+)`).exec(hash);

                // if no type is specified in the link throw a warning
                if (!typeEval[1]) {
                    this.log(`Ambiguous member name '${hash}'.  Consider adding a type to the URL`, 'info');
                }

                memberName = hash;
            }

            // this conditional sets the href for API docs for products / versions that
            // aren't generated by this processor (i.e. JSDuck generated docs for Touch)
            if (exceptions[product]) {
                if (exceptions[product] === true || (version && exceptions[product].includes(version))) {
                    //toolkit = '';
                    let { rootPath }  = data,
                        { outputDir } = options,
                        relPath       = Path.relative(rootPath, outputDir),
                        href          = Path.join(
                            relPath,
                            product,
                            (version || ''), (toolkit || ''), '#!', `${className}.html`
                        );

                    if (memberName) {
                        href += `-${memberName}`;
                    }
                    
                    return `<a href="./${href}">${text}</a>`;
                }
            }

            return this.createGuideLink(product, version, toolkit, className, memberName, text, data);
        });

        return html;
    }

    /**
     * Standalone method to output the offline docs
     * @return {Promise} Chainable promise
     */
    runOutputOfflineDocs () {
        let outputDir = this.outputProductDir,
            prep;

        if (this.isEmpty(outputDir)) {
            prep = this.doRunApi();
        } else {
            prep = Promise.resolve();
        }

        //prep.then(this.outputOfflineDocs.bind(this))
        //.catch(this.error.bind(this));

        return prep
        .then(this.doOutputOfflineDocs.bind(this))
        .then(() => {
            this.concludeBuild();
        })
        .catch(this.error.bind(this));
    }

    /**
     * Checks to see if options.outputOffline is true and if so run doOutputOfflineDocs.
     * Alternative, a method may call doOutputOfflineDocs directly.  See
     * {@link #runOutputOfflineDocs}.
     * @return {Promise} Chainable promise
     */
    outputOfflineDocs () {
        let options = this.options;

        if (options.outputOffline) {
            return this.doOutputOfflineDocs();
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Create a zip file of the docs output as downloadable offline docs
     * @return {Promise} Chainable promise
     */
    doOutputOfflineDocs () {
        let options = this.options,
            product = options.product,
            version = options.version ? `-${options.version.replace(/\./g, '')}` : '',
            file = `${product}${version}-docs.zip`,
            offlineDocsDir = this.offlineDocsDir,
            outputPath = Path.join(offlineDocsDir, file);

        return new Promise((resolve, reject) => {
            Fs.ensureDir(offlineDocsDir, err => {
                if (err) {
                    reject(err);
                } else {
                    Zipdir(this.outputProductDir, {
                        saveTo: outputPath
                    },
                    (err, buffer) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }

    /**
     * Decorate @example blocks so that they can operate as inline fiddle examples
     * @param {String} html The guide body HTML
     * @return {String} The decorated guide body HTML
     */
    decorateExamples (html) {
        let fiddleWrapPre = `<div class="da-inline-code-wrap da-inline-code-wrap-fiddle invisible example-collapse-target" id="{docsXFiddleId}" data-fiddle-meta='{docsXMetaObj}'>
                    <div class="da-inline-fiddle-nav">
                        <div class="code-controls">
                            <span class="collapse-tool fa fa-caret-up"></span>
                            <span class="expand-tool fa fa-caret-down"></span>
                            <span class="expand-code">Expand Code</span>
                        </div>
                        <span class="da-inline-fiddle-nav-code da-inline-fiddle-nav-active">
                            <span class="fa fa-code"></span>
                            Code
                        </span><!--
                        --><span class="da-inline-fiddle-nav-fiddle">
                            <span class="fiddle-icon-wrap">
                                <span class="fa fa-play-circle">
                                </span><span class="fa fa-refresh"></span>
                            </span>
                            Run
                        </span>
                        <span class="icon-btn fiddle-code-beautify tooltip tooltip-tr-br" data-beautify="Beautify Code">
                            <i class="fa fa-indent"></i>
                            <div class="callout callout-b"></div>
                        </span>
                        
                        <label class="example-theme-picker-label">
                            Editor Theme:
                            <select class="example-theme-picker" size="1">
                                <optgroup label="Bright">
                                    <option value="ace/theme/chrome">Chrome</option>
                                    <option value="ace/theme/clouds">Clouds</option>
                                    <option value="ace/theme/crimson_editor">Crimson Editor</option>
                                    <option value="ace/theme/dawn">Dawn</option>
                                    <option value="ace/theme/dreamweaver">Dreamweaver</option>
                                    <option value="ace/theme/eclipse">Eclipse</option>
                                    <option value="ace/theme/github">GitHub</option>
                                    <option value="ace/theme/iplastic">IPlastic</option>
                                    <option value="ace/theme/solarized_light">Solarized Light</option>
                                    <option value="ace/theme/textmate">TextMate</option>
                                    <option value="ace/theme/tomorrow">Tomorrow</option>
                                    <option value="ace/theme/xcode">XCode</option>
                                    <option value="ace/theme/kuroir">Kuroir</option>
                                    <option value="ace/theme/katzenmilch">KatzenMilch</option>
                                    <option value="ace/theme/sqlserver">SQL Server</option>
                                </optgroup>
                                <optgroup label="Dark">
                                    <option value="ace/theme/ambiance">Ambiance</option>
                                    <option value="ace/theme/chaos">Chaos</option>
                                    <option value="ace/theme/clouds_midnight">Clouds Midnight</option>
                                    <option value="ace/theme/cobalt">Cobalt</option>
                                    <option value="ace/theme/gruvbox">Gruvbox</option>
                                    <option value="ace/theme/gob">Green on Black</option>
                                    <option value="ace/theme/idle_fingers">idle Fingers</option>
                                    <option value="ace/theme/kr_theme">krTheme</option>
                                    <option value="ace/theme/merbivore">Merbivore</option>
                                    <option value="ace/theme/merbivore_soft">Merbivore Soft</option>
                                    <option value="ace/theme/mono_industrial">Mono Industrial</option>
                                    <option value="ace/theme/monokai">Monokai</option>
                                    <option value="ace/theme/pastel_on_dark">Pastel on dark</option>
                                    <option value="ace/theme/solarized_dark">Solarized Dark</option>
                                    <option value="ace/theme/terminal">Terminal</option>
                                    <option value="ace/theme/tomorrow_night">Tomorrow Night</option>
                                    <option value="ace/theme/tomorrow_night_blue">Tomorrow Night Blue</option>
                                    <option value="ace/theme/tomorrow_night_bright">Tomorrow Night Bright</option>
                                    <option value="ace/theme/tomorrow_night_eighties">Tomorrow Night 80s</option>
                                    <option value="ace/theme/twilight">Twilight</option>
                                    <option value="ace/theme/vibrant_ink">Vibrant Ink</option>
                                </optgroup>
                            </select>
                        </label>
                    </div>
                    <div id="{docsXAceCtId}" class="ace-ct">`,
            fiddleWrapClose = '</div></div>',
            out         = html,
            options     = this.options,
            production  = options.production,
            prodVerMeta = this.options.prodVerMeta,
            version     = this.apiVersion,
            prodObj     = this.options.products[this.apiProduct],
            toolkit     = options.toolkit;

        let fidMeta = {
                framework : this.options.products[this.apiProduct].title, // either "Ext JS" or "Sencha Touch" as required by Fiddle
                version   : version,
                toolkit   : toolkit,
                theme     : toolkit ? (prodObj.theme && prodObj.theme[version] && prodObj.theme[version][toolkit]) : (prodObj.theme && prodObj.theme[version]) || 'neptune'
            },
            keyedRe      = /(\w+)=([\[\w.,\]]+)/i,
            frameworkMap = {
                extjs : 'Ext JS',
                ext   : 'Ext JS',
                touch : 'Sencha Touch'
            };

        // decorates @example blocks as inline fiddles
        out = html.replace(/(?:<pre><code>(?:\s*@example(?::)?(.*?)\n))((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, (match, meta, docsXCode) => {
            meta = meta.trim();
            docsXCode = docsXCode.trim();
            
            if (meta && meta.length) {
                fidMeta = Object.assign({}, fidMeta);
                if (meta.includes('=')) {
                    // should be formatted with space-separated key=value pairs
                    // e.g.: toolkit=modern
                    meta = meta.split(' ');

                    meta.forEach(function (option) {
                        let optionMatch = option.match(keyedRe);
                        if (optionMatch != null) {
                            let key         = optionMatch[1];
                            let val         = optionMatch[2];
                            let mapped      = frameworkMap[val];
                            fidMeta[key] = (key === 'framework' && mapped) ? mapped : (val.includes('[') ? _.words(val) : val);
                        }
                    });
                } else if (meta.includes('-')) {
                    // should be formatted like: framework-fullVersion-theme-toolkit
                    // e.g.: extjs-6.0.2-neptune-classic
                    let parts = meta.split('-');

                    fidMeta.framework = frameworkMap[parts[0]];
                    fidMeta.version   = parts[1];
                    fidMeta.theme     = parts[2];
                    fidMeta.toolkit   = parts[3];
                }
            }
            
            const formattedFiddleWrapPre = Utils.format(fiddleWrapPre, {
                docsXMetaObj  : JSON.stringify(fidMeta),
                docsXFiddleId : this.uniqueId,
                docsXAceCtId  : this.uniqueId
            });
            
            return formattedFiddleWrapPre + docsXCode + fiddleWrapClose;
        });

        try {
        out = out.replace(/(?:<pre><code>)((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, (match, docsXCode) => {
            return `<pre><code class="language-javascript">${docsXCode}</code></pre>`;
        });
        } catch (e) {
            console.error("decorateExamples: Could not replace example.", e);
        }

        return out;
    }
}

module.exports = AppBase;
