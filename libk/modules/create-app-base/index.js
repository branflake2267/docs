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
      Utils        = require('../shared/Utils'),
      Beautify     = require('js-beautify').js_beautify,
      Fs           = require('fs-extra'),
      Path         = require('path');

class AppBase extends SourceGuides {
    constructor (options) {
        super(options);
        //this.log(`Create 'AppBase' instance`, 'info');

        let o = this.options,
            product    = o.product,
            version    = o.version,
            //majorVer   = this.apiVersion.charAt(),
            majorVer   = version.charAt(),
            prodObj    = o.products[product],
            toolkitObj = prodObj.toolkit && prodObj.toolkit[majorVer],
            toolkits   = toolkitObj ? toolkitObj.toolkits : false,
            toolkit    = o.toolkit || (toolkitObj && toolkitObj.defaultToolkit) || 'api';

        o.prodVerMeta   = {
            majorVer    : majorVer,
            prodObj     : prodObj,
            hasApi      : prodObj.hasApi,
            hasVersions : prodObj.hasVersions,
            hasToolkits : !!(toolkits && toolkits.length > 1),
            toolkits    : toolkits,
            toolkit     : toolkit,
            hasGuides   : prodObj.hasGuides !== false,
            title       : prodObj.title
        };
    }

    /**
     * Returns an array of this module's file name along with the file names of all 
     * ancestor modules
     * @return {String[]} This module's file name preceded by its ancestors'.
     */
    get parentChain () {
        return super.parentChain.concat([Path.parse(__dirname).base]);
    }

    /**
     * Returns the version passed by the CLI build command or the `currentVersion` from 
     * the config file if there was no version passed initially
     * @return {String} The version number for the current product
     */
    get apiVersion () {
        let ver = this._apiVer;

        if (!ver) {
            let options = this.options;

            ver = this._apiVer = options.version || options.currentVersion;
        }

        return ver;
    }

    /**
     * Returns the product passed by the CLI build command
     * @return {String} The product to generate the API output for
     */
    get apiProduct () {
        let prod = this._apiProd;

        if (!prod) {
            let options = this.options;

            prod = this._apiProd = options.product;
        }

        return prod;
    }

    /**
     * Default entry point for this module
     */
    run () {
        //this.log(`Begin 'AppBase.run'`, 'info');
        let dt = new Date();
        return this.runApi()
        .then(this.outputApiSearch.bind(this))
        .then(this.processGuides.bind(this))
        .then(this.outputProductMenu.bind(this))
        .then(() => {
            console.log('ALL TOLD:', this.getElapsed(dt));
            this.concludeBuild();
        })
        .catch(this.error.bind(this));
    }

    /**
     * Run the api processor (for the toolkit stipulated in the options or against 
     * each toolkit - if applicable)
     */
    // TODO remove events in favor of promises
    runApi () {
        //this.log(`Begin 'AppBase.runApi'`, 'info');
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
                return this.prepareApiSource();
            });
        }, Promise.resolve())
        .catch(this.error.bind(this));
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
     * Creates the product menu from the 
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
                        text : title
                    });
                } else {
                    // else we'll loop over the list of product versions to include in 
                    // the product menu
                    let verLength = menu.length,
                        j         = 0;

                    for (; j < verLength; j++) {
                        let ver         = menu[j],
                            verIsObject = Utils.isObject(ver);

                        // the version could be a string or could be an object with a 
                        // text property as the text to display
                        node.children.push({
                            text : verIsObject ? ver.text : ver,
                            // optionally, a static link may be included in the object 
                            // form
                            link : ver.link
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
        html = html.replace(/\[{2}([a-z0-9.]+):([a-z0-9._\-#]+)\s?([a-z$\/'.()[\]\\_-\s]*)\]{2}/gim, (match, productVer, link, text) => {
            let options       = this.options,
                prodVerMeta   = options.prodVerMeta,
                hasHash       = link.indexOf('#'),
                hasDash       = link.indexOf('-'),
                canSplit      = !!(hasHash > -1 || hasDash > -1),
                splitIndex    = (hasHash > -1) ? hasHash                  : hasDash,
                className     = canSplit ? link.substring(0, splitIndex)  : link,
                hash          = canSplit ? link.substring(splitIndex + 1) : null,
                prodDelimiter = productVer.indexOf('-'),
                hasVersion    = prodDelimiter > -1,
                product       = hasVersion ? productVer.substring(0, prodDelimiter) : productVer,
                version       = hasVersion ? productVer.substr(prodDelimiter + 1)   : false,
                toolkit       = (product === 'classic' || product === 'modern') ? product : false,
                memberName;

            product = this.getProduct(product);
            version = version || this.options.version;
            toolkit = toolkit || prodVerMeta.toolkit || 'api';
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

            if (match === '[[modern:Ext.tab.Panel tabpanel]]') {
                //console.log(match, productVer, link, text);
                //console.log(product, version, toolkit, text);
                //console.log(product, version, toolkit, className, memberName, text, data);
            }

            return this.createGuideLink(product, version, toolkit, className, memberName, text, data);
        });

        return html;
    }

    /**
     * Decorate @example blocks so that they can operate as inline fiddle examples
     * @param {String} html The guide body HTML
     * @return {String} The decorated guide body HTML
     */
    decorateExamples (html) {
        let fiddleWrap = `<div class="da-inline-code-wrap da-inline-code-wrap-fiddle invisible example-collapse-target relative mv3 overflow-hidden pb4" id="{2}" data-fiddle-meta='{1}'>
                    <div class="da-inline-fiddle-nav relative bg-near-white ba b--black-05">
                        <div class="code-controls dib bg-transparent ma0 near-black pt2 b relative overflow-visible">
                            <span class="collapse-tool fa fa-caret-up mr2 bg-transparent lh-copy f4 ph2 mb2 ml2 relative br2 b pointer v-mid z-0 dark-gray"></span>
                            <span class="expand-tool fa fa-caret-down mr2 bg-transparent lh-copy f4 ph1 ml2 relative br2 b pointer v-mid z-1 dark-gray dn"></span>
                            <span class="expand-code dark-gray b lh-copy f6 v-mid dn">Expand Code</span>
                        </div>
                        <span class="da-inline-fiddle-nav-code da-inline-fiddle-nav-active pv2 ph3 tracked f6 ba b--black-20 bg-white-50 blue">
                            <span class="fa fa-code f5"></span>
                            Code
                        </span><!--
                        --><span class="da-inline-fiddle-nav-fiddle blue bg-near-white pv2 ph3 tracked pointer bl bt br b--black-20 f6">
                            <span class="fiddle-icon-wrap overflow-hidden relative dib v-mid w1 h1">
                                <span class="fa fa-play-circle f5 absolute left-0 top-0">
                                </span><span class="fa fa-refresh f5 absolute left-0"></span>
                            </span>
                            Run
                        </span>
                        <span class="icon-btn fiddle-code-beautify tooltip tooltip-tr-br bg-blue white relative dib br2 pointer pa1 ml3" data-beautify="Beautify Code">
                            <i class="fa fa-indent"></i>
                            <div class="callout callout-b"></div>
                        </span>
                    </div>
                    <div id="{3}" class="ace-ct ba b--black-20 z-0">{0}</div>
                </div>`,
            out         = html,
            options     = this.options,
            production  = options.production,
            prodObj     = this.options.prodVerMeta.prodObj,
            hasApi      = prodObj.hasApi,
            hasVersions = prodObj.hasVersions,
            version     = hasVersions && options.version,
            toolkit     = hasApi && options.toolkit;

        let fidMeta = {
                framework: prodObj.title, // either "Ext JS" or "Sencha Touch" as required by Fiddle
                version: version,
                toolkit: toolkit,
                theme: toolkit ? (prodObj.theme && prodObj.theme[version] && prodObj.theme[version][toolkit]) : (prodObj.theme && prodObj.theme[version]) || 'neptune'
            },
            keyedRe      = /(\w+) = ([\w.]+)/i,
            frameworkMap = {
                extjs : 'Ext JS',
                ext   : 'Ext JS',
                touch : 'Sencha Touch'
            };

        // decorates @example blocks as inline fiddles
        out = html.replace(/(?:<pre><code>(?:@example(?::)?(.*?)\n))((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, (match, meta, code) => {
            meta = meta.trim();
            code = code.trim();
            if (production) {
                code = Beautify(code);
            }

            if (meta && meta.length) {
                fidMeta = Object.assign({}, fidMeta);
                if (meta.includes(' ') && meta.includes('=')) {
                    // should be formatted with space-separated key=value pairs
                    // e.g.: toolkit=modern
                    meta = meta.split(' ');

                    meta.forEach(function(option) {
                        let optionMatch = option.match(keyedRe);
                        
                        let key = optionMatch[1],
                            val = optionMatch[2],
                            mapped = frameworkMap[val];

                        meta[key] = (key === 'framework' && mapped) ? mapped : val;
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

            let fiddleId = this.uniqueId,
                aceCtId  = this.uniqueId,
                metaObj  = JSON.stringify(fidMeta);

            return Utils.format(fiddleWrap, code, metaObj, fiddleId, aceCtId);
        });

        out = out.replace(/(?:<pre><code>)((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, (match, code) => {
            if (production) {
                code = Beautify(code);
            }
            return `<pre><code class="language-javascript">${code}</code></pre>`;
        });

        return out;
    }
}

module.exports = AppBase;
