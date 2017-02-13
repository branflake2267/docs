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

        let o = this.options,
            product    = o.product,
            version    = o.version,
            majorVer   = this.apiVersion.charAt(),
            prodObj    = o.products[product],
            toolkitObj = prodObj.toolkit && prodObj.toolkit[majorVer],
            toolkits   = toolkitObj ? toolkitObj.toolkits : false,
            toolkit    = o.toolkit || (toolkitObj && toolkitObj.defaultToolkit) || 'api';

        o.prodVerMeta   = {
            majorVer    : majorVer,
            prodObj     : prodObj,
            hasApi      : prodObj.hasApi,
            hasVersions : prodObj.hasVersions,
            hasToolkits : toolkits && toolkits.length > 1,
            toolkits    : toolkits,
            toolkit     : toolkit,
            hasGuides   : prodObj.hasGuides !== false
        };
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
    // TODO wire up promises instead of events for app flow control
    run () {
        // TODO process the output HTML files here in the create-app-html class (maybe by overriding the output method in source-api)
        //console.log('PROCESS ALL OF THE SOURCE FILES TO ');
        let dt = new Date();
        this.runApi()
        .then(this.outputApiSearch.bind(this))
        .then(this.processGuides.bind(this))
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
        }, Promise.resolve());
    }

    /**
     * Run the guide processor (if the product has guides)
     */
    runGuides () {
        return this.processGuides()
        .then(() => {
            this.concludeBuild();
        })
        .catch(this.error.bind(this));
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
    parseApiLinks (html, data) {
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

            return this.createApiLink(product, version, toolkit, className, memberName, text, data);
        });

        return html;
    }

    /**
     * Decorate @example blocks so that they can operate as inline fiddle examples
     * @param {String} html The guide body HTML
     * @return {String} The decorated guide body HTML
     */
    decorateExamples (html) {
        //let fiddleWrap = '<div class="da-inline-code-wrap da-inline-code-wrap-fiddle invisible example-collapse-target" id="{2}" data-fiddle-meta=\'{3}\'>' +
        let fiddleWrap = `<div class="da-inline-code-wrap da-inline-code-wrap-fiddle invisible example-collapse-target relative mv3 overflow-hidden pb4" data-fiddle-meta='{1}'>
                    <div class="da-inline-fiddle-nav relative bg-near-white ba b--light-gray">
                        <div class="code-controls dib bg-transparent ma0 near-black pt2 b relative overflow-visible">
                            <span class="collapse-tool fa fa-caret-up mr2 bg-transparent lh-copy f3 ph2 relative br2 b pointer v-mid z-1 dark-gray"></span>
                            <span class="expand-tool fa fa-caret-down mr2 bg-transparent lh-copy f3 ph2 relative br2 b pointer v-mid z-1 dark-gray dn"></span>
                            <span class="expand-code dark-gray b lh-copy f6 dn">Expand Code</span>
                        </div>
                        <span class="da-inline-fiddle-nav-code da-inline-fiddle-nav-active pa2 tracked f6">
                            <span class="fa fa-code"></span>
                            Code
                        </span><!--
                        --><span class="da-inline-fiddle-nav-fiddle blue bg-near-white pa2 tracked pointer bl bt br b--gray f6">
                            <span class="fiddle-icon-wrap overflow-hidden relative dib v-mid">
                                <span class="fa fa-play-circle blue">
                                </span><span class="fa fa-refresh blue dn"></span>
                            </span>
                            Run
                        </span>
                        <span class="fiddle-code-beautify tooltip tooltip-tr-br fa fa-indent bg-blue white relative dib br2 pointer pa1 ml3" data-beautify="Beautify Code"><div class="callout callout-b"></div></span>
                    </div>
                    <div class="ace-ct ba b--light-gray z-0">{0}</div>
                </div>`,
            out = html,
            options = this.options,
            prodObj = this.options.prodVerMeta.prodObj,
            hasApi  = prodObj.hasApi,
            version = hasApi && options.toolkit,
            toolkit = hasApi && options.toolkit;

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
        out = html.replace(/(?:<pre><code>(?:@example(?::)?(.*?)\n))((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, function (match, meta, code) {
            meta = meta.trim();
            code = code.trim();

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
                } else {
                    // should be formatted like: framework-fullVersion-theme-toolkit
                    // e.g.: extjs-6.0.2-neptune-classic
                    let parts = meta.split('-');

                    fidMeta.framework = frameworkMap[parts[0]];
                    fidMeta.version   = parts[1];
                    fidMeta.theme     = parts[2];
                    fidMeta.toolkit   = parts[3];
                }
            }

            return Utils.format(fiddleWrap, code, JSON.stringify(fidMeta));
        });

        out = out.replace(/(?:<pre><code>)((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, function (match, code) {
            return `<pre><code class="language-javascript">${code}</code></pre>`;
        });

        return out;
    }
}

module.exports = AppBase;
