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
  Utils = require('../shared/Utils'),
  Fs = require('fs-extra'),
  Path = require('path'),
  Chalk = require('chalk'),
  StringSimilarity = require('string-similarity'),
  Diff = require('../create-diff'),
  _ = require('lodash'),
  Zipdir = require('zip-dir'),
  CompareVersions = require('compare-versions');

var beautify_js = require('js-beautify');
var beautify_css = require('js-beautify').css;
var beautify_html = require('js-beautify').html;

const cheerio = require('cheerio');
const JSON5 = require('json5')
const Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();


class AppBase extends SourceGuides {
  constructor(options) {
    super(options);
  }

  /**
   * Returns an array of this module's file name along with the file names of all
   * ancestor modules
   * @return {String[]} This module's file name preceded by its ancestors'.
   */
  get parentChain() {
    return super.parentChain.concat([Path.parse(__dirname).base]);
  }

  /**
   * Default entry point for this module
   */
  run() {


    console.log("appBase.run() Started.")
    return this.doRunApi()
      .then(this.outputApiSearch.bind(this))
      .then(this.processGuides.bind(this))
      .then(this.outputProductMenu.bind(this))
      .then(() => {
        console.log("appBase.run() Completed.")
      })
      .catch((e) => {
        console.log("error=", e);
      }); // this.error.bind(this)
  }

  /**
   * Run the api processor (for the toolkit stipulated in the options or against
   * each toolkit - if applicable)
   */
  doRunApi() {
    return new Promise(async (resolve) => {
      console.log(`doRunApi: Start 'AppBase.doRunApi'...`);

      let meta = this.options.prodVerMeta;
      let hasApi = meta.hasApi;
      let toolkitList = Utils.from(meta.hasToolkits ? (this.options.toolkit || meta.toolkits) : false);

      // debugging
      //toolkitList = ['modern'];

      if (!hasApi) {
        console.log("doRunApi: SKIP: running api... hasApi=" + hasApi);
        return resolve();
      }

      // awaiting in a foreach loop won't work here. 
      for (var i = 0; i < toolkitList.length; i++) {
        console.log("doRunApi: process toolkit=" + toolkitList[i]);
        await this.prepareApiSource(toolkitList[i]);
      }

      console.log("doRunApi: Completed.");

      resolve();
    });
  }

  /**
   * Create the diff files for all eligible versions (see {@link #diffableVersions})
   * for the current product
   */
  // TODO create entry point for this
  createDiffs() {
    const {
      apiProduct,
      diffableVersions,
      options
    } = this,
      memoVersion = options.version,
      args = _.cloneDeep(options._args),
      tempDiff = new Diff(Object.assign(args, {
        product: apiProduct,
        _myRoot: options._myRoot
      }));

    // creates all of the doxi files used in the diff process for each version
    tempDiff.createDoxiFiles();

    // loop over all diffable versions (minus the last version in the list since it 
    // won't have a previous version to diff against) and create the diff output
    _.dropRight(diffableVersions).forEach(version => {
      const toolkits = this.getToolkits(apiProduct, version),
        toolkitList = toolkits || ['api'];

      this.options.version = version;
      toolkitList.forEach(toolkit => {
        const args = _.cloneDeep(options._args),
          diff = new Diff(Object.assign(args, {
            diffTargetProduct: apiProduct,
            diffTargetVersion: version,
            toolkit: toolkit,
            forceDoxi: false,
            syncRemote: false,
            _myRoot: options._myRoot
          }));

        diff.doRun('outputRaw');
      });
    });

    this.options.version = memoVersion;
  }

  /**
   * Run the guide processor (if the product has guides)
   */
  runGuides() {
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
  getProductMenu() {
    let options = this.options,
      // this is an array of keys found on the array of product defaults in the
      // config file in the order the products should be displayed in the UI
      includedProducts = options.productMenu || [],
      products = options.products,
      len = includedProducts.length,
      i = 0,
      prodTree = [];

    // loop over the product names and add each product as a node in the prodTree
    // array with each version added as child nodes
    for (; i < len; i++) {
      let name = includedProducts[i],
        product = products[name],
        title = product.title,
        menu = product.productMenu;

      // if the specified product has a productMenu value
      if (menu) {
        // create the product node
        let node = {
          text: title,
          product: name,
          children: []
        };

        // now add child items to it
        // starting with the product name itself if the value of productMenu is
        // just `true` -vs- a list of version numbers
        if (menu === true) {
          node.children.push({
            text: title,
            path: name
          });
        } else {
          // else we'll loop over the list of product versions to include in
          // the product menu
          let verLength = menu.length,
            j = 0;

          for (; j < verLength; j++) {
            let ver = menu[j],
              verIsObject = Utils.isObject(ver),
              text = verIsObject ? ver.text : ver;

            // the version could be a string or could be an object with a
            // text property as the text to display
            node.children.push({
              text: text,
              // optionally, a static link may be included in the object
              // form
              link: ver.link,
              path: `${name}/${text}`
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
  outputProductMenu() {
    return new Promise((resolve, reject) => {
      let path = Path.join(this.jsDir, 'productMenu.js'),
        productMenu = JSON.stringify(this.getProductMenu()),
        output = `DocsApp.productMenu = ${productMenu};`;

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
  parseGuideLinks(html, data) {
    html = html.replace(/\[{2}([a-z0-9.]+):([a-z0-9!._\-#]+)\s?([a-z$\/'.()[\]\\_-\s]*)\]{2}/gim, (match, productVer, link, text) => {
      link = link.replace('!', '-');

      let { options } = this,
        exceptions = options.buildExceptions,
        { prodVerMeta } = options,
        hasHash = link.indexOf('#'),
        hasDash = link.indexOf('-'),
        canSplit = !!(hasHash > -1 || hasDash > -1),
        splitIndex = (hasHash > -1) ? hasHash : hasDash,
        className = canSplit ? link.substring(0, splitIndex) : link,
        hash = canSplit ? link.substring(splitIndex + 1) : null,
        prodDelimiter = productVer.indexOf('-'),
        hasVersion = prodDelimiter > -1,
        product = hasVersion ? productVer.substring(0, prodDelimiter) : productVer,
        version = hasVersion ? productVer.substr(prodDelimiter + 1) : false,
        toolkit = (!data.toolkit || data.toolkit === 'universal') ? (prodVerMeta.toolkit || 'api') : data.toolkit,
        memberName;

      product = this.getProduct(product);
      version = version || this.options.version;
      text = text || className + (hash ? `#${hash}` : '');

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
        let types = this.memberTypes.map((type) => {
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
          let { rootPath } = data,
            { outputDir } = options,
            relPath = Path.relative(rootPath, outputDir),
            href = Path.join(
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
  runOutputOfflineDocs() {
    let outputDir = this.outputProductDir,
      prep;

    if (this.isEmpty(outputDir)) {
      prep = this.doRunApi();
    } else {
      prep = Promise.resolve();
    }

    // TODO remove? 
    //prep.then(this.outputOfflineDocs.bind(this)).catch(this.error.bind(this));

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
  outputOfflineDocs() {
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
  doOutputOfflineDocs() {
    let options = this.options,
      product = options.product,
      version = options.version ? `-${options.version.replace(/\./g, '')}` : '',
      file = `${product}${version}-docs.zip`,
      offlineDocsDir = this.offlineDocsDir,
      outputPath = Path.join(offlineDocsDir, file);

    console.log("doOutputOfflineDocs: Output Offline Docs outputPath=" + outputPath);

    return new Promise((resolve, reject) => {
      Fs.ensureDir(offlineDocsDir, err => {
        if (err) {
          reject(err);
        } else {
          // Just in case, remove the previous build zip
          let zipExists = Fs.pathExistsSync(outputPath);
          if (zipExists) {
            console.log("doOutputOfflineDocs: Delete existing zip file. outputPath=" + outputPath);
            Fs.removeSync(outputPath)
          }

          // zip up output directory into a zip
          Zipdir(this.options.outputDir, { saveTo: outputPath }, (err, buffer) => {
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
   * and decorate <pre/> with prettyprint.
   * @param {String} html The guide body HTML
   * @return {String} The decorated guide body HTML
   */
  decorateExamples(html) {
    let out = html;
    let version = this.apiVersion;
    let prodObj = this.options.products[this.apiProduct];
    let toolkit = this.options.toolkit;

    let fidMeta = {
      framework: this.options.products[this.apiProduct].title, // either "Ext JS" or "Sencha Touch" as required by Fiddle
      version: version,
      toolkit: toolkit,
      theme: toolkit ? (prodObj.theme && prodObj.theme[version] && prodObj.theme[version][toolkit]) : (prodObj.theme && prodObj.theme[version]) || 'neptune'
    };

    // TODO convert old examples?
    if (true) {
      out = this.decorateExamples_V2(html);

    } else { 
      let fiddleWrapPre = this._getFiddlePreWrapV1();
      let fiddleWrapClose = '</div></div>';

      // V1 format - packages=[...]
      // fiddle @example: match properties like "packages=[ext-react,charts]"
      var keyedRe = /(\w+)=([\[\w\-.,\]]+)/i,
        frameworkMap = {
          extjs: 'Ext JS',
          ext: 'Ext JS',
          touch: 'Sencha Touch'
        };

      // decorates @example blocks as inline fiddles
      out = html.replace(/(?:<pre><code>(?:\s*\@example(?::)?(.*?)\n))((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, (match, meta, docsXCode) => {
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
                let key = optionMatch[1];
                let val = optionMatch[2];
                let mapped = frameworkMap[val];
                var values = "";
                if (val.includes('[')) { // like [ext-react,charts], extract the array to values
                  val = val.replace('[', '');
                  val = val.replace(']', '');
                  if (val.includes(',')) {
                    // has multiple values
                    values = val.split(',');
                  } else {
                    // only one value
                    values = val;
                  }

                } else {
                  values = val;
                }
                fidMeta[key] = (key === 'framework' && mapped) ? mapped : values;
              }
            });
          } else if (meta.includes('-')) {
            // should be formatted like: framework-fullVersion-theme-toolkit
            // e.g.: extjs-6.0.2-neptune-classic
            let parts = meta.split('-');

            fidMeta.framework = frameworkMap[parts[0]];
            fidMeta.version = parts[1];
            fidMeta.theme = parts[2];
            fidMeta.toolkit = parts[3];
          }
        }

        const formattedFiddleWrapPre = Utils.format(fiddleWrapPre, {
          docsXMetaObj: JSON.stringify(fidMeta),
          docsXFiddleId: this.uniqueId,
          docsXAceCtId: this.uniqueId
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
    }

    return out;
  }

  /**
   * Decorates @example({...}) into to tabbed html.
   * 
   * exampleConfig.tab: index
   * exampleConfig.packages: array
   * 
   * @param {*} html 
   */
  decorateExamples_V2(html) {
    let $ = cheerio.load(html);

    // Unique list of the pre groups, grouped by `tab: #`
    let presParentMap = {};
    // All of the pres in the example html
    let presArray = [];

    // Parse pres
    let parentId;
    $('pre').each(function (index, elem) {
      let preHtml = $(this).html();
      let examples = preHtml.match(/@example/g);
      let hasExample = examples && examples.length > 0;

      // Version 2 @example({options...})
      // @example({...}) - has to have curly brackets
      let exampleRe = /@example\((.*?\{.*?\}.*?)\)/.exec(preHtml);

      let exampleReOptions;
      let exampleReOptionsDeocded;
      let exampleConfig = {};
      if (exampleRe) {
        exampleReOptions = exampleRe[1];
        exampleReOptionsDeocded = entities.decode(exampleReOptions);
        exampleConfig = JSON5.parse(exampleReOptionsDeocded);
      }

      // Parse language from lang-[language]
      if (!exampleConfig.lang) {
        let lang = /['"]lang\-(.*?)['"]/.exec(preHtml);
        if (lang && lang.length > 0) {
          exampleConfig.lang = lang[1];
        } else {
          exampleConfig.lang = 'javascript';
        }
      }

      let parsedPre = {
        parentId: null,
        id: `pre${index}`,
        index: index,
        preHtml: preHtml,
        example: hasExample,
        exampleConfig: exampleConfig,
        element: elem
      };

      if (hasExample && exampleConfig && exampleConfig.tab) {
        if (exampleConfig.tab == 1) {
          parentId = parsedPre['id'];
        }
        parsedPre['parentId'] = parentId;
        // Save to a group, for easy iteration
        presParentMap[parentId] = index;
      } 

      presArray[index] = parsedPre;
    });

    // Render the grouped pre examples into tabs
    let replacePreIndex = -1;
    let processedParsedPresId = [];
    let parentParsedPre;
    Object.keys(presParentMap).forEach((parentParsedPreId) => {
      let tabsHtml = '';
      let presHtml = '';
      presArray.forEach((parsedPre, index) => {
        // When the framework is defined, compare it with the product being rendered. 
        if (parsedPre.exampleConfig.framework && parsedPre.exampleConfig.framework.replace('-', '') != this.options.product) {
          // Framework must match the product being rendering
          // Skip adding this pre to the document
          $(parsedPre.element).remove();
          return;
        }

        // Only proccess the grouped pres
        if (parentParsedPreId === parsedPre.parentId) {
          parentParsedPre = this.findParsedPre(presArray, parentParsedPreId);

          tabsHtml += this._getTab(parsedPre);
          presHtml += this._getPreContent(parsedPre);

          // Only remove the children, not the parent
          if (parsedPre.exampleConfig.tab === 1) {
            replacePreIndex = parentParsedPre.index;
          } else {
            // Remove the pre so it's not processed again
            $(parsedPre.element).remove();
          }

          // Pre is no longer needed.
          processedParsedPresId.push(parsedPre.id);
        }
      });

      // Create the html for the tabs
      if (presHtml) {
        let newPreHtml = this._getFiddlePreWrapV2(parentParsedPre.exampleConfig.packages, tabsHtml, presHtml, replacePreIndex);
        $(parentParsedPre.element).replaceWith(newPreHtml);
      }
    });

    // Remove the processed pres
    processedParsedPresId.forEach((id) => {
      presArray = this.arrayRemove(presArray, id);
    });

    // Process the rest of the examples that weren't grouped by parent using tabs
    presArray.forEach((parsedPre) => {
      // When the framework is defined, compare it with the product being rendered. 
      if (parsedPre.exampleConfig.framework && parsedPre.exampleConfig.framework.replace('-', '') != this.options.product) {
        // Framework must match the product being rendering
        // Skip adding this pre to the document
        $(parsedPre.element).remove();
        return;
      }

      if (parsedPre.example) {
        let tabsHtml = this._getTab(parsedPre);
        let presHtml = this._getPreContent(parsedPre);
        let newPreHtml = this._getFiddlePreWrapV2(parsedPre.packages, tabsHtml, presHtml);

        // Replace the example with the transformed code
        $(parsedPre.element).replaceWith(newPreHtml);
      } else {
        // Add the prettify syntax highlighting  to all the other examples
        $(parsedPre.element).addClass('prettyprint');
      }
    });

    let newHtml = $.html();
    return newHtml;
  }

  findParsedPre(parsedPresArray, id) {
    let found = parsedPresArray.find(function (el) {
      return el.id === id;
    });
    return found;
  }

  arrayRemove(arr, id) {
    return arr.filter(function (element) {
      return element.id != id;
    });
  }


  /* @example v2 below */


  _getTab(parsedPre) {
    let index = parsedPre.index;
    let tabNumber = parsedPre.exampleConfig.tab;
    let label = 'JS';

    if (parsedPre.exampleConfig.label) {
      label = parsedPre.exampleConfig.label;
    } else if (parsedPre.exampleConfig.lang && parsedPre.exampleConfig.lang == 'html') {
      label = 'HTML';
    } else if (parsedPre.exampleConfig.lang && parsedPre.exampleConfig.lang == 'css') {
      label = 'CSS';
    } else if (parsedPre.exampleConfig.lang && parsedPre.exampleConfig.lang == 'javascript') {
      label = 'JS';
    } else if (parsedPre.exampleConfig.lang && parsedPre.exampleConfig.lang == 'typescript') {
      label = 'TS';
    } else if (parsedPre.exampleConfig.lang) {
      label = parsedPre.exampleConfig.lang.toUpperCase();
    }

    let notActiveCls = ''
    if (tabNumber > 1) {
      notActiveCls = 'da-inline-fiddle-nav-code-notactive';
    }
    let tab = `
            <span id='pre${index}-tab-${tabNumber}' contentid="pre-${index}-code-${tabNumber}" class="da-inline-fiddle-nav-code da-inline-fiddle-nav-active ${notActiveCls}">
                <span class="fa fa-code"></span>
                ${label}
            </span>`;
    return tab;
  }

  _getPreContent(parsedPre) {
    let index = parsedPre.index;
    let tabNumber = parsedPre.exampleConfig.tab;
    let preHtml = parsedPre.preHtml;
    let lang = parsedPre.exampleConfig.lang;
    if (!lang) {
      lang = 'javascript';
    }

    // Hide any with > 1 index, so tabs set visibility
    let disabledCls = '';
    if (tabNumber > 1) {
      disabledCls = 'ace-ct-disabled';
    }

    // Remove @example to \n (TODO if we want multi line example json contents)
    preHtml = preHtml.replace(/@example.*?\n/gm, '');

    let preContentDiv = `<div id="pre-${index}-code-${tabNumber}" tabid="pre${index}-tab-${tabNumber}" class="ace-ct ${disabledCls}" lang='${lang}'><pre>${preHtml}</pre></div>`;

    return preContentDiv;
  }

  _getFiddlePreWrapV2(packages, tabsHtml, presHtml) {
    let version = this.apiVersion;
    let prodObj = this.options.products[this.apiProduct];
    let toolkit = this.options.toolkit;

    if (!packages) {
      packages = [];
    }

    // TODO material for bridges
    let defaultTheme = 'neptune';

    let fidMeta = {
      framework: this.options.products[this.apiProduct].title,
      version: version,
      toolkit: toolkit,
      theme: toolkit ? (prodObj.theme && prodObj.theme[version] && prodObj.theme[version][toolkit]) : (prodObj.theme && prodObj.theme[version]) || defaultTheme,
      packages: packages
    };

    let docsXMetaObj = JSON.stringify(fidMeta);
    let docsXFiddleId = this.uniqueId;
    let wrap = `
            <div class="da-inline-code-wrap da-inline-code-wrap-fiddle invisible example-collapse-target" id="${docsXFiddleId}" data-fiddle-meta='${docsXMetaObj}'>
                <div class="da-inline-fiddle-nav">
                    <div class="code-controls">
                        <span class="collapse-tool fa fa-caret-up"></span>
                        <span class="expand-tool fa fa-caret-down"></span>
                        <span class="expand-code">Expand Code</span>
                    </div>
                    
                    <!-- Tabbar-->
                    ${tabsHtml}
                    
                    <span class="da-inline-fiddle-nav-fiddle">
                        <span class="fiddle-icon-wrap">
                            <span class="fa fa-play-circle">
                            </span><span class="fa fa-refresh"></span>
                        </span>
                        Run
                    </span>
                </div>
                
                ${presHtml}
                
            </div>`;
    return wrap;
  }

  _getFiddlePreWrapV1() {
    var wrap = `<div class="da-inline-code-wrap da-inline-code-wrap-fiddle invisible example-collapse-target" id="{docsXFiddleId}" data-fiddle-meta='{docsXMetaObj}'>
            <div class="da-inline-fiddle-nav">
                <div class="code-controls">
                    <span class="collapse-tool fa fa-caret-up"></span>
                    <span class="expand-tool fa fa-caret-down"></span>
                    <span class="expand-code">Expand Code</span>
                </div>
                
                <span class="da-inline-fiddle-nav-code da-inline-fiddle-nav-active">
                    <span class="fa fa-code"></span>
                    Code
                </span>
                
                <span class="da-inline-fiddle-nav-fiddle">
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
            </div>
            <div id="{docsXAceCtId}" class="ace-ct">`;
    return wrap;
  }

  _formatCode(html) {
    var opts = {
      "indent_size": 2
    };
    var result = beautify_html(html, opts);
    return result;
  }
}

module.exports = AppBase;
