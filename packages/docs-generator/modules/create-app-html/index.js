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

const AppBase = require('../create-app-base');
const Path = require('path');
const Utils = require('../shared/Utils');
const Fs = require('fs-extra');
const UglifyJS = require("uglify-js");
const CleanCSS = require('clean-css');
const Diff = require('../create-diff');
const _ = require('lodash');
const ImgRe = /{\s*@img(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;

class HtmlApp extends AppBase {
  constructor(options) {
    super(options);
    this.copyAssets();
  }

  /**
   * Default entry point for this module
   */
  run() {
    this.log("create-app-html: Starting...");

    super.run()
      .then(this.outputProductHomePage.bind(this))
      .then(this.outputMainLandingPage.bind(this))
      .then(this.outputMainRedirectToVersionPage.bind(this))
      .then(this.outputOfflineDocs.bind(this))
      .then(() => {
        this.log("create-app-html: Completed.");
      })
      .catch(this.error.bind(this));
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
   * Returns the public assets directory with static resources. 
   */
  get assetsSrc() {
    // where: ./lib/../public/assets
    let d = Path.join(__dirname, '../..', 'public/assets');
    return d;
  }

  /**
   * Returns this module's name
   */
  get moduleName() {
    return Path.parse(__dirname).base;
  }

  /**
   * Returns the link regular expression used when parsing API links
   * @return {Object} The API link regex instance
   */
  get linkRe() {
    if (!this._linkRe) {
      this._linkRe = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;
    }

    return this._linkRe;
  }

  /**
   * Regex test to see if the string starts with `#`
   * @return {Object} The hash regex instance
   */
  get hashStartRe() {
    if (!this._hashStartRe) {
      this._hashStartRe = /^#/;
    }

    return this._hashStartRe;
  }

  /**
   * @property
   * Get the guides output directory where all guides / guide directories will be
   * output (creating it if it does not already exist)
   * @return {String} The full path to the guides output directory
   */
  get guidesOutputDir() {
    let dir = this._guidesOutputDir;

    if (!dir) {
      dir = this._guidesOutputDir = Path.join(
        Path.resolve(
          this.options._myRoot,
          this.outputProductDir
        ),
        'guides'
      );
      // make sure the directory exists on disk and if not, create it
      if (!Fs.existsSync(dir)) {
        Fs.ensureDirSync(dir);
      }
    }

    return dir;
  }

/**
* Fetches the component class list object from disk
* @return {Object} The object of component class names : component tree location
*/
  get componentList() {
    let list = this._componentList;

    if (!list) {
      let version = this.options.version;
      let base = Path.resolve(this.options.buildConfigsDir, 'configs', 'components', this.options.product);
      let jsonPath = Path.resolve(base, "components-" + version + ".json");

      if (!Fs.pathExistsSync(jsonPath)) {
        // fallback to built in components list
        jsonPath = Path.join(__dirname, 'configs', 'components.json');
      }

      try {
        let file = Fs.readJsonSync(jsonPath);
        list = this._componentList = file.components;
      } catch (e) {
        console.error("No components.json file provided. jsonPath=" + jsonPath + " error=", e);
        //throw 'Issue with reading components.json file';
      }
    }

    return list;
  }

  /**
 * Gets the array of component class names
 * @return {String[]} The array of component names
 */
  get componentClassNames() {
    let names = this._componentClassNames;

    if (!names) {
      let list = this.componentList,
        map = this.classMap,
        classNames = Object.keys(map),
        len;

      names = this._componentClassNames = Object.keys(list);

      len = names.length;

      while (len--) {
        if (!classNames.includes(names[len])) {
          this.log(names[len] + " appears in components.json, but does not exist", 'info');
        }
      }
    }

    return names;
  }

  /**
   * Returns common metadata needed by app product home pages
   * @param {Object} data Current data hash to be applied to the page template
   * @return {Object} Hash of common current page metadata
   */
  getHomeMetaData(data) {
    let meta = this.commonMetaData,
      docsRelativePath = Path.relative(
        this.outputProductDir,
        this.options.outputDir
      );

    if (data) {
      Object.assign(meta, {
        rootPath: '',
        pageType: 'home',
        docsRootPath: `${docsRelativePath}/`
      });
    }

    return meta;
  }

  /**
   * Returns common metadata needed by the landing page
   * @param {Object} data Current data hash to be applied to the page template
   * @return {Object} Hash of common current page metadata
   */
  getLandingMetaData(data) {
    let meta = this.commonMetaData;

    if (data) {
      Object.assign(meta, {
        rootPath: '',
        pageType: 'landing',
        docsRootPath: '',
        hasApi: false,
        hasGuides: false
      });
    }

    return meta;
  }

  /**
   * Collects any file paths in the assets folders (js, css, other) using the passed
   * file name and the folder name of all ancestor module file names in the project.
   * This mechanism allows for each module to supply files overriding the logic,
   * styles, etc. from the module before it in the class hierarchy.
   * @param {String} folder The folder within the assets directory to mine files from.
   * i.e. 'js', 'css', etc.
   * @param {String} fileName The file name to look for
   * @return {String[]} Array of file paths to the override files in order of most to
   * least Base in the class hierarchy.  Else an empty array if no files match.
   */
  getAncestorFiles(folder, fileName) {
    let { parentChain } = this;
    let len = parentChain.length;
    let ancestorFiles = [];

    for (let i = 0; i < len; i++) {
      let ancestorName = parentChain[i];
      let filePath = Path.join(this.assetsSrc, folder, ancestorName, fileName);

      console.log("\t getAncestorFiles: looking for override: filePath=" + filePath);

      if (Fs.existsSync(filePath)) {
        ancestorFiles.push(filePath);
        console.log("\t\t getAncestorFiles: override added: filePath=" + filePath);
      }
    }

    return ancestorFiles;
  }

  /**
   * Copy supporting assets to the output folder.
   * i.e. app.js, app.css, ace editor assets, etc.
   */
  copyAssets() {
    if (!Fs.existsSync(this.assetsDir)) {
      Fs.ensureDirSync(this.assetsDir);
    }

    this.copyCss();
    this.copyJs();

    Fs.copySync(this.assetsSrc, this.assetsDir);
  }

  /**
   * Copy project 'css' files over from the project assets directory to the output
   * directory
   */
  copyCss() {
    this.log('Copy public/assets/css to build/output directory');

    let { options } = this,
      { production } = options,
      assetType = 'css',
      mainName = 'main.css',
      mainCss = Path.join(this.assetsSrc, 'css', mainName),
      faCss = Path.join(this.assetsSrc, 'css', 'docs-fonts.css'),
      css = new CleanCSS({
        rebase: false, // TODO rebasing is off until rebaseTo is fixed.
        rebaseTo: options.outputDir, // TODO - this isn't changing the paths correctly yet.
        compatibility: 'ie9',
        level: production ? 2 : 0,
        format: {
          breaks: { // controls where to insert breaks
            afterAtRule: !production, // controls if a line break comes after an at-rule; e.g. `@charset`; defaults to `false`
            afterBlockBegins: !production, // controls if a line break comes after a block begins; e.g. `@media`; defaults to `false`
            afterBlockEnds: !production, // controls if a line break comes after a block ends, defaults to `false`
            afterComment: !production, // controls if a line break comes after a comment; defaults to `false`
            afterProperty: !production, // controls if a line break comes after a property; defaults to `false`
            afterRuleBegins: !production, // controls if a line break comes after a rule begins; defaults to `false`
            afterRuleEnds: !production, // controls if a line break comes after a rule ends; defaults to `false`
            beforeBlockEnds: !production, // controls if a line break comes before a block ends; defaults to `false`
            betweenSelectors: !production // controls if a line break comes between selectors; defaults to `false`
          },
          indentBy: production ? 0 : 4, // controls number of characters to indent with; defaults to `0`
          indentWith: 'space', // controls a character to indent with, can be `'space'` or `'tab'`; defaults to `'space'`
          spaces: { // controls where to insert spaces
            aroundSelectorRelation: !production, // controls if spaces come around selector relations; e.g. `div > a`; defaults to `false`
            beforeBlockBegins: !production, // controls if a space comes before a block begins; e.g. `.block {`; defaults to `false`
            beforeValue: !production // controls if a space comes before a value; e.g. `width : 1rem`; defaults to `false`
          },
          wrapAt: false // controls maximum line length; defaults to `false`
        }
      }).minify([
        faCss,       // font awesome styles
        //tachyonsCss, // the tachyons CSS base
        mainCss      // app-specific styling / overrides
      ].concat(this.getAncestorFiles(
        assetType,
        mainName
      )));

    if (!Fs.existsSync(this.cssDir)) {
      Fs.ensureDirSync(this.cssDir);
    }
    Fs.writeFileSync(Path.join(this.cssDir, `${this.moduleName}-app.css`), css.styles, 'utf8');
  }

  /**
   * Copy project 'js' files over from the project assets directory to the output
   * directory
   */
  copyJs() {
    this.log("Copy public/assets/js to build/output directory");

    let { options } = this;
    let { production } = options;
    let { jsDir } = this;
    let root = options._myRoot;
    let assetType = 'js';
    let mainName = 'main.js';
    let extl = Path.join(this.assetsSrc, 'js', 'ExtL.js');
    let componentsDir = Path.join(this.assetsSrc, 'components');
    let main = Path.join(this.assetsSrc, 'js', mainName);
    let beautify = Path.join(this.assetsSrc, 'js', 'beautify.js');

    // /Users/branflake2267/git/docs/packages/docs-generator/node_modules/gsap/src/minified/TweenMax.min.js 
    //let gsap = Path.join(this.options._execRoot, '/node_modules/gsap/src/minified/TweenMax.min.js');
    let gsap = require.resolve('gsap/src/minified/TweenMax.min.js');
    
    //let aceFolder1 = Path.join(this.options._execRoot, '/node_modules/ace-builds/src-min-noconflict');
    let aceFolder = gsap.replace('node_modules/gsap/src/minified/TweenMax.min.js', 'node_modules/ace-builds/src-min-noconflict');
    
    let jsFileArr = [gsap, extl, beautify, main];
    let codeFilesArr = jsFileArr.concat(this.getAncestorFiles(assetType, mainName));

    let uglifyCode = {};
    for (let i = 0; i < codeFilesArr.length; i++) {
      var file = Path.basename(codeFilesArr[i]);
      // Use number to make the key unqiue, otherwise the overrides get removed
      uglifyCode[file + '' + i] = Fs.readFileSync(codeFilesArr[i], "utf8");
    }

    let uglifyOptions = {
      compress: production,
      mangle: production,
      // output: {
      //     beautify: !production
      // }
    };

    let jsMinified = UglifyJS.minify(uglifyCode, uglifyOptions);
    if (jsMinified.error) {
      console.log("copyJs: jsMinified error.", jsMinified.error);
      throw jsMinified.error
    }

    if (!Fs.existsSync(jsDir)) {
      Fs.ensureDirSync(jsDir);
    }
    Fs.writeFileSync(
      Path.join(jsDir, `${this.moduleName}-app.js`),
      jsMinified.code.toString(),
      'utf8'
    );
    Fs.copySync(aceFolder, jsDir);
    Fs.copySync(componentsDir, jsDir);
  }

  /**
   * Create guide folders in the guides output directory using the supplied path
   * @param {String} path The path to create on disk
   */
  makeGuideDir(path) {
    var guideDir = Path.join(this.guidesOutputDir, path);
    if (!Fs.existsSync(guideDir)) {
      Fs.ensureDirSync(guideDir);
    }
  }

  /**
   * Assemble the guide file's path for writing to disk
   * May be overridden in the post processor module
   * @param {String} rootPath The path of the guide file
   * @param {String} name The guide file name
   * @return {String} The full path for the guide file
   */
  /*getGuideFilePath (rootPath, name) {
      return Path.join(this.guidesOutputDir, rootPath, name) + '.html';
  }*/

  /**
   * Processes the HTML of the guide body.  Decorates `@example` instances, processes
   * links, etc.
   * @param {String} html The markdown from the guide source file
   * @return {String} The processed guide HTML
   */
  processGuideHtml(html, data) {
    // processes the markdown to HTML
    html = super.processGuideHtml(html, data);

    // TODO finish with the guide HTML: decorate @examples, process links, etc.

    //html = this.parseApiLinks(html, data);
    html = this.parseGuideLinks(html, data);

    return html;
  }

  /**
   * Additional guide data processing prior to handing the data over to the guide
   * template for final output
   * @param {Object} data The object to be processed / changed / added to before
   * supplying it to the template
   */
  processGuideDataObject(data) {
    super.processGuideDataObject(data);
    return this.buildToc(data);
  }

  /**
   * Build the guide table of contents using the heading tags in the doc
   * @param {Object} data The data object to apply to the guide template
   */
  buildToc(data) {
    // the guide body HTML
    return data;
    //TODO build the TOC and set it back on the data object
  }

  /**
   * Create a link from the passed href and link text
   * @param {String} href The link to use in the anchor href
   * @param {String} text The text to display for the link
   * @return {String} The link markup
   */
  //return this.createApiLink(product, version, toolkit, className, memberName, text, data);
  createApiLink(href, text) {
    return `<a href="${href}">${text}</a>`;
  }

  /**
   * Process API links using the passed product, version, class name, etc.
   * @param {String} product The product name
   * @param {String} version The version stipulated in the [[link]] or null if not
   * specified
   * @param {String} toolkit The specified toolkit or 'api'
   * @param {String} className The name of the SDK class
   * @param {String} memberName The name of the member (or member group potentially) or
   * undefined if no member was specified in the link
   * @param {String} text The text to display in the link if specified
   * @param {Object} data The data object to be applied to the template for the current
   * doc / guide page
   * @return {String} The link markup
   */
  // TODO process the api links for HTML guides
  createGuideLink(product, version, toolkit, className, memberName, text, data) {
    if (product === 'gxt') {
      const linkVer = version === '4.x' ? '4.0.2' : '3.1.4';

      toolkit = Path.join('javadoc', `gxt-${linkVer}`);
      className = Path.join(...className.split('.'));
    }

    let { rootPath } = data,
      { outputDir } = this.options,
      relPath = Path.relative(rootPath, outputDir),
      href = Path.join(relPath, product, (version || ''), toolkit, `${className}.html`);

    if (memberName) {
      href += `#${memberName}`;
    }

    return `<a href="${href}">${text}</a>`;
  }

  /**
   * Processes all JSDOC image strings into `img` tags
   * @param {String} html The HTML to process images on
   * @return {String} The processed HTML
   */
  processImageTags(html) {
    return html.replace(ImgRe, (match, img) => {
      return "<img src='images/" + img + "'/>";
    });
  }

  /**
   * Turns all `{@link}` instances into API links within the passed HTML string
   * @param {String} html The HTML markup whose links require processing
   * @return {String} The original HTML string with all links processed
   */
  parseApiLinks(html) {
    html = html.replace(this.linkRe, (match, link, text) => {
      link = link.replace('!', '-');

      let memberName = link.substring(link.indexOf('-') + 1);

      text = text || memberName;

      if (link.includes('#')) {
        let idx = link.indexOf('#');

        if (idx !== 0) {
          link = link.replace('#', '.html#');
        }
      } else {
        link += '.html';
      }

      return this.createApiLink(link, text.replace(this.hashStartRe, ''));
    });

    /*html = html.replace(/\[.*?\]\(.*?\)/g, (match, text, link) => {
        return this.createApiLink(link, text);
    });*/

    return html;
  }

  /**
   * @private
   * Outputs the class hierarchy for classes related to the passed class
   * @param {Object} cls The class object to output the hierarchy for
   * @return {String} The hierarchy HTML
   */
  processHierarchy(cls) {
    let { name } = cls,
      elementCls = 'hierarchy pl2',
      list = this.splitInline(
        Utils.processCommaLists(cls.extended, false, true, true),
        `<div class = "${elementCls}">`
      ),
      ret = `<div class="list">${list}<div class="${elementCls}">${name}`;

    // close out all of the generated divs above with closing div tags
    ret += Utils.repeat('</div>', ret.split('<div').length - 1);

    return ret;
  }

  /**
   * @private
   * Private method to process the contents of the related classes for HTML output.
   * Separates each class name / link with a line break.
   */
  splitRelatedClasses(classes) {
    if (classes) {
      return this.splitInline(classes, '<br>');
    }
    return '';
  }

  /**
   * Processes the API object's related classes for HTML output
   * @param {Object} cls The original class object
   * @param {Object} data The recipient of the processed related classes
   */
  processRelatedClasses(cls, data) {
    data.mixins = this.splitRelatedClasses(cls.mixed);
    data.localMixins = this.splitRelatedClasses(cls.mixins);
    data.requires = this.splitRelatedClasses(cls.requires);
    data.uses = this.splitRelatedClasses(cls.uses);
    data.extends = cls.extended ? this.processHierarchy(cls) : '';
    data.extenders = cls.extenders ? Utils.processCommaLists(cls.extenders, false) : '';
    data.extenders = this.splitRelatedClasses(cls.extenders);
    data.mixers = cls.mixers ? Utils.processCommaLists(cls.mixers, false) : '';
    data.mixers = this.splitRelatedClasses(cls.mixers);
  }

  /**
   * Post-process the HTML string returned from the markdown-to-markup processing
   * @param {String} html The markup to process
   * @return {String} The processed HTML
   */
  processApiHtml(className, data, html) {
    html = this.decorateExamples(html);
    html = this.processImageTags(html);
    html = this.parseApiLinks(html);

    // workaround - be sure classNames are correctly stated in the docs for ExtAngular and ExtReact
    // Since: 7.1.0+
    if (this.options.prodVerMeta.title == 'ExtAngular' || 
        this.options.prodVerMeta.title == 'ExtReact') {
      let webComponent = this.getWebComponentDeclaration(className);
      if (webComponent) {
        webComponent = webComponent.replace('&lt;','');
        webComponent = webComponent.replace('/&gt;','');
        var regEx = new RegExp(webComponent, "ig");
        html = html.replace(regEx, webComponent);
      }
    } 

    return html;
  }

  /**
   * Prepares additional api data processing prior to handing the data over to the api
   * template for final output
   * @param {Object} data The object to be processed / changed / added to before
   * supplying it to the template
   */
  processHomeDataObject(data) {
    let { outputProductDir } = this;

    data.cssPath = Path.relative(outputProductDir, this.cssDir);
    data.jsPath = Path.relative(outputProductDir, this.jsDir);
    data.imagesPath = Path.relative(outputProductDir, this.imagesDir);
    data.myMeta = this.getHomeMetaData(data);
    data.isHome = true;
    data.toolkit = null;
    data.description = `${data.title} API documentation from Sencha`;
    this.processCommonDataObject(data);
  }

  /**
   * Prepares additional api data processing prior to handing the data over to the api
   * template for final output
   * @param {Object} data The object to be processed / changed / added to before
   * supplying it to the template
   */
  processLandingDataObject(data) {
    let { options } = this;

    data.cssPath = Path.relative(options.outputDir, this.cssDir);
    data.jsPath = Path.relative(options.outputDir, this.jsDir);
    data.imagesPath = Path.relative(options.outputDir, this.imagesDir);
    data.myMeta = this.getLandingMetaData(data);

    console.log("processLandingDataObject: options.outputDir=" + options.outputDir);
    console.log("processLandingDataObject: data.cssPath=" + data.cssPath);

    let { myMeta } = data;
    myMeta.product = null;
    myMeta.version = null;

    data.isLanding = true;
    data.toolkit = null;
    data.description = 'API documentation from Sencha';
    this.processCommonDataObject(data);
    data.product = '';
    data.title = 'Sencha Documentation';
    data.version = null;
    data.hasApi = false;
    data.hasGuides = false;
  }

  /**
   * Outputs the processed doxi file to an HTML file
   * @param {String} className The name of the class to be output
   * @param {Object} data The prepared Doxi object to be output
   * @return {Object} A promise the resolves once the api file is written to the output
   * directory
   */
  outputApiFile(className, data) {
    this.log(`outputApiFile: ${className}'`, 'info');

    return new Promise((resolve, reject) => {
      let fileName = Path.join(this.apiDir, `${className}.html`);
      let html = "";

      try {
        html = this.mainTemplate(data);
      } catch (e) {
        this.error("outputApiFile: Could not configure mainTemplate.", e);
      }

      html = this.processApiHtml(className, data, html);

      Fs.writeFile(fileName, html, 'utf8', (err) => {
        if (err) reject(err);
        delete this.classMap[className];
        // resolve after a timeout to let garbage collection catch up
        setTimeout(resolve, 100);
      });
    }).catch(this.error.bind(this));
  }

  /**
   * Outputs the product home page
   * @return {Promise}
   */
  outputProductHomePage() {
    return new Promise((resolve, reject) => {
      var { options } = this,
        root = options._myRoot,
        prodTplPath = Path.join(root, 'configs', 'product-home', options.product),
        { version } = options,
        homeConfig = this.getFileByVersion(prodTplPath, version),
        homePath = Path.join(prodTplPath, homeConfig),
        dest = Path.join(this.outputProductDir, 'index.html');

      var data = Fs.readJsonSync(homePath);

      data.contentPartial = '_product-home';

      this.processHomeDataObject(data);

      var html = this.mainTemplate(data);

      Fs.writeFile(dest, html, 'utf8', (err) => {
        if (err) {
          console.log("outputProductHomePage: ERROR: could not write file dest=" + dest);
          reject(err);
        }

        resolve();
      });
    }).catch(this.error.bind(this));
  }

  /**
   * Outputs the product home page
   * @return {Promise}
   */
  outputMainLandingPage() {
    this.log("Landing Page: outputMainLandingPage: landing page: options.outputDir=" + this.options.outputDir);

    return new Promise((resolve, reject) => {
      let { options } = this,
        root = options._myRoot,
        tplPath = Path.join(
          root,
          'configs',
          'landing',
          'config.json'
        ),
        dest = Path.join(options.outputDir, 'index.html');

      console.log("Landing Page: dest=" + dest);

      let data = Fs.readJsonSync(tplPath);
      data = Object.assign(data, options);
      data = Object.assign(data, options.prodVerMeta);

      data.rootPath = '..';
      data.contentPartial = '_product-home';

      this.processLandingDataObject(data);

      let len = data.homeItems.length,
        productsObj = options.products;

      while (len--) {
        const homeItem = data.homeItems[len],
          prodObj = productsObj[homeItem.product];

        homeItem.header = Utils.format(homeItem.header, prodObj);

        if (homeItem.content) {
          homeItem.content = [Utils.format(homeItem.content.join(''), prodObj)];
        }
      }

      let html = this.mainTemplate(data);

      Fs.writeFile(dest, html, 'utf8', (err) => {
        if (err) reject(err);

        resolve();
      });
    }).catch(this.error.bind(this));
  }

  /**
   * Outputs redirect to the latest version page.
   * @return {Promise}
   */
  outputMainRedirectToVersionPage() {
    this.log("Landing Page: outputMainRedirectToVersionPage Page: redirect page: options.outputDir=" + this.options.outputDir);

    return new Promise((resolve, reject) => {
      let { options } = this;
      let productObj = options.products[options.product];

      // Only add a redirect page for multiple versions 
      if (!productObj.hasVersions) {
        resolve();
        return;
      }

      let dest = Path.join(options.outputDir, options.product, 'index.html');
      console.log("Redirect Page: dest=" + dest);

      let html = this.mainProductRedirectToCurrentPage(productObj);
      Fs.writeFile(dest, html, 'utf8', (err) => {
        if (err) reject(err);

        resolve();
      });
    }).catch(this.error.bind(this));
  }

  /**
 * Post-processes the prepared class object after the super class decoration of the
 * class object is complete
 * @param {String} className The class name to process
 */
  decorateClass(className) {
    super.decorateClass(className);

    let classMap = this.classMap,
      prepared = classMap[className].prepared,
      names = this.componentClassNames;

    if (names.includes(className)) {
      // Render class examples configs/components/components-[version].json examples
      if (this.componentList[className] && this.componentList[className].examples) {
        let examplesHtml = '';
        for (let example of this.componentList[className].examples) {
          examplesHtml += this._getExample(prepared, example);
        }
        prepared.classExamples = examplesHtml;
      }
    }
  }

  /**
   * Generate the example html. 
   * 
   * @param {*} example json config for the example
   */
  _getExample(prepared, example) {
    let fiddle = example.fiddle;
    let width = example.width;
    let height = example.height;
    let style = example.style;

    // default example width will be 100%
    if (!width) {
      // This is set in the decorateClass of create-rext-app-html
      // this.options.prodVerMeta.title == 'Ext JS'
      if (prepared.styleOverrides || prepared.styleOverrides == '') {
        width = 'calc(100% - 300px)';
      } else {
        width = '47%';
      }
    }

    // default example height
    if (!height) {
      height = '300px';
    } 

    if (!style) {
      style = `style='height:${height};width:${width};'`;
    }

    let exampleHtml = `<iframe src='${fiddle}' ${style} frameborder=0></iframe>\n`;
    return exampleHtml;
  }

}

module.exports = HtmlApp;
