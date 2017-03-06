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

const AppBase         = require('../create-app-base'),
      Path            = require('path'),
      Utils           = require('../shared/Utils'),
      Handlebars      = require('handlebars'),
      Fs              = require('fs-extra'),
      UglifyJS        = require("uglify-js"),
      CleanCSS        = require('clean-css'),
      Swag            = require('swag'),
      LinkRe          = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g,
      ImgRe           = /{\s*@img(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g,
      HashStartRe     = /^#/;

class HtmlApp extends AppBase {
    constructor (options) {
        super(options);

        Swag.registerHelpers(Handlebars);
        this.copyAssets();
    }

    /**
     * Default entry point for this module
     */
    run () {
        super.run()
        .then(this.outputProductHomePage.bind(this))
        .then(this.outputMainLandingPage.bind(this))
        .catch(this.error.bind(this));

        /*this.outputProductHomePage()
        .catch(this.error.bind(this));*/

        // TODO create a product home page
        // TODO create a Landing page class (if a CLI param is passed - or can be called directly, of course)
    }

    /**
     * Returns an array of this module's file name along with the file names of all 
     * ancestor modules
     * @return {String[]} This module's file name preceded by its ancestors'.
     */
    get parentChain () {
        return super.parentChain.concat([this.moduleName]);
    }

    /**
     * Returns this module's name
     */
    get moduleName () {
        return Path.parse(__dirname).base;
    }

    /**
     * @property
     * Get the guides output directory where all guides / guide directories will be 
     * output (creating it if it does not already exist)
     * @return {String} The full path to the guides output directory
     */
    get guidesOutputDir () {
        let dir = this._guidesOutputDir;

        if (!dir) {
            dir = this._guidesOutputDir = Path.join(
                Path.resolve(
                    __dirname,
                    this.outputProductDir
                ),
                'guides'
            );
            // make sure the directory exists on disk and if not, create it
            Fs.ensureDirSync(dir);
        }

        return dir;
    }

    /**
     * Returns common metadata needed by app API pages
     * @param {Object} data Current data hash to be applied to the page template
     * @return {Object} Hash of common current page metadata
     */
    getHomeMetaData (data) {
        let meta = super.getCommonMetaData();

        if (data) {
            Object.assign(meta, {
                //navTreeName : 'API',
                //myId        : data.cls.name,
                rootPath    : '',
                pageType    : 'home'
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
    getAncestorFiles (folder, fileName) {
        let options       = this.options,
            root          = options._myRoot,
            assetsSrc     = Path.join(root, 'assets', folder),
            parentChain   = this.parentChain,
            len           = parentChain.length,
            i             = 0,
            ancestorFiles = [];

        for (; i < len; i++) {
            let ancestorName = parentChain[i],
                filePath     = Path.join(assetsSrc, ancestorName, fileName);

            if (Fs.existsSync(filePath)) {
                ancestorFiles.push(filePath);
            }
        }

        return ancestorFiles;
    }

    /**
     * Copy supporting assets to the output folder.  
     * i.e. app.js, app.css, ace editor assets, etc.
     */
    copyAssets () {
        let options   = this.options,
            root      = options._myRoot,
            assetsSrc = Path.join(root, 'assets');

        Fs.ensureDirSync(this.assetsDir);

        this.copyCss();
        this.copyJs();

        Fs.copySync(assetsSrc, this.assetsDir);
    }

    /**
     * Copy project 'css' files over from the project assets directory to the output 
     * directory
     */
    copyCss () {
        let options     = this.options,
            production  = options.production,
            root        = options._myRoot,
            assetType   = 'css',
            mainName    = 'main.css',
            assetsSrc   = Path.join(root, 'assets', assetType),
            mainCss     = Path.join(assetsSrc, mainName),
            faCss       = Path.join(assetsSrc, 'docs-fonts.css'),
            css         = new CleanCSS({
                compatibility : 'ie9',
                level         : production ? 2 : 0,
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
                        beforeValue: !production // controls if a space comes before a value; e.g. `width: 1rem`; defaults to `false` 
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

        Fs.ensureDirSync(this.cssDir);
        Fs.writeFileSync(Path.join(this.cssDir, `${this.moduleName}-app.css`), css.styles, 'utf8');
    }

    /**
     * Copy project 'js' files over from the project assets directory to the output 
     * directory
     */
    copyJs () {
        let options     = this.options,
            production  = options.production,
            jsDir       = this.jsDir,
            root        = options._myRoot,
            assetType   = 'js',
            mainName    = 'main.js',
            assetsSrc   = Path.join(root, 'assets', assetType),
            extl        = Path.join(assetsSrc, 'ExtL.js'),
            main        = Path.join(assetsSrc, mainName),
            beautify    = Path.join(assetsSrc, 'beautify.js'),
            aceFolder   = Path.join(root, 'node_modules/ace-builds/src-min-noconflict'),
            jsFileArr   = [
                extl,
                beautify,
                main
            ],
            jsMinified = UglifyJS.minify(
                jsFileArr.concat(
                    this.getAncestorFiles(
                        assetType,
                        mainName
                    )
                ),
                {
                    compress : production,
                    mangle   : production,
                    output   : {
                        beautify : !production
                    }
                }
            );

        Fs.ensureDirSync(jsDir);
        Fs.writeFileSync(
            Path.join(jsDir, `${this.moduleName}-app.js`),
            jsMinified.code.toString(),
            'utf8'
        );
        Fs.copySync(aceFolder, jsDir);
    }

    /**
     * Create guide folders in the guides output directory using the supplied path
     * @param {String} path The path to create on disk
     */
    makeGuideDir (path) {
        Fs.ensureDirSync(Path.join(this.guidesOutputDir, path));
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
    processGuideHtml (html, data) {
        // processes the markdown to HTML
        html = super.processGuideHtml(html, data);

        // TODO finish with the guide HTML: decorate @examples, process links, etc.

        html = this.parseApiLinks(html, data);

        return html;
    }

    /**
     * Additional guide data processing prior to handing the data over to the guide 
     * template for final output
     * @param {Object} data The object to be processed / changed / added to before
     * supplying it to the template
     */
    processGuideDataObject (data) {
        super.processGuideDataObject(data);
        return this.buildToc(data);
    }

    /**
     * Build the guide table of contents using the heading tags in the doc
     * @param {Object} data The data object to apply to the guide template
     */
    buildToc (data) {
        // the guide body HTML
        let content = data.content;
        return data;
        //TODO build the TOC and set it back on the data object
    }

    /**
     * Create a link from the passed href and link text
     * @param {String} href The link to use in the anchor href
     * @param {String} text The text to display for the link
     * @return {String} The link markup
     */
    createApiLink(href, text) {
        return `<a href="${href}" class="link underline-hover blue">${text}</a>`;
    }

    /**
     * Processes all JSDOC image strings into `img` tags
     * @param {String} html The HTML to process images on
     * @return {String} The processed HTML
     */
    processImageTags (html) {
        return html.replace(ImgRe, (match, img) => {
            return "<img src='images/"+ img +"'/>";
        });
    }

    /**
     * Turns all `{@link}` instances into API links within the passed HTML string
     * @param {String} html The HTML markup whose links require processing
     * @return {String} The original HTML string with all links processed
     */
    parseApiLinks (html) {
        return html.replace(LinkRe, (match, link, text) => {
            link = link.replace('!','-');
            text = text || link;

            return this.createApiLink(link, text.replace(HashStartRe, ''));
        });
    }

    /**
     * @private
     * Outputs the class hierarchy for classes related to the passed class
     * @param {Object} cls The class object to output the hierarchy for
     * @return {String} The hierarchy HTML
     */
    processHierarchy (cls) {
        let name = cls.name,
            elementCls  = 'hierarchy pl2',
            list = this.splitInline(
                Utils.processCommaLists(cls.extended, false, true, true),
                `<div class="${elementCls}">`
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
    splitRelatedClasses (classes) {
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
    processRelatedClasses (cls, data) {
        data.mixins      = this.splitRelatedClasses(cls.mixed);
        data.localMixins = this.splitRelatedClasses(cls.mixins);
        data.requires    = this.splitRelatedClasses(cls.requires);
        data.uses        = this.splitRelatedClasses(cls.uses);
        data.extends     = cls.extended  ? this.processHierarchy(cls) : '';
        data.extenders   = cls.extenders ? Utils.processCommaLists(cls.extenders, false) : '';
        data.extenders   = this.splitRelatedClasses(cls.extenders);
        data.mixers      = cls.mixers    ? Utils.processCommaLists(cls.mixers, false) : '';
        data.mixers      = this.splitRelatedClasses(cls.mixers);
    }

    /**
     * Post-process the HTML string returned from the markdown-to-markup processing
     * @param {String} html The markup to process
     * @return {String} The processed HTML
     */
    processApiHtml (html) {
        html = this.decorateExamples(html);
        html = this.processImageTags(html);
        html = this.parseApiLinks(html);

        return html;
    }

    /**
     * Prepares additional api data processing prior to handing the data over to the api 
     * template for final output
     * @param {Object} data The object to be processed / changed / added to before
     * supplying it to the template
     */
    processHomeDataObject (data) {
        let apiDir   = this.apiDir,
            outputProductDir = this.outputProductDir;

        data.cssPath    = Path.relative(outputProductDir, this.cssDir);
        data.jsPath     = Path.relative(outputProductDir, this.jsDir);
        data.imagesPath = Path.relative(outputProductDir, this.imagesDir);
        data.myMeta     = this.getHomeMetaData(data);
        data.isHome     = true;
        data.toolkit    = null;
        this.processCommonDataObject(data);
    }

    /**
     * Outputs the processed doxi file to an HTML file  
     * @param {String} className The name of the class to be output
     * @param {Object} data The prepared Doxi object to be output
     * @return {Object} A promise the resolves once the api file is written to the output 
     * directory
     */
    outputApiFile (className, data) {
        return new Promise((resolve, reject) => {
            let fileName = Path.join(this.apiDir, `${className}.html`),
                html = this.mainTemplate(data);

            html = this.processApiHtml(html);

            Fs.writeFile(fileName, html, 'utf8', (err) => {
                if (err) reject(err);
                delete this.classMap[className];
                // resolve after a timeout to let garbage collection catch up
                setTimeout(resolve, 100);
            });
        })
        .catch(this.error.bind(this));
    }

    /**
     * Outputs the product home page
     */
    outputProductHomePage () {
        return new Promise((resolve, reject) => {
            let options     = this.options,
                root        = options._myRoot,
                prodTplPath = Path.join(
                    root,
                    'configs',
                    'product-home',
                    this.apiProduct
                ),
                version     = options.version,
                homeConfig  = this.getFileByVersion(prodTplPath, version),
                homePath    = Path.join(prodTplPath, homeConfig),
                dest        = Path.join(this.outputProductDir, 'index.html');

            let data = Fs.readJsonSync(homePath);
            data     = Object.assign(data, options);
            data     = Object.assign(data, options.prodVerMeta);

            data.rootPath       = '..';
            data.contentPartial = '_product-home';

            this.processHomeDataObject(data);

            let html = this.mainTemplate(data);

            Fs.writeFile(dest, html, 'utf8', (err) => {
                if (err) reject(err);
                
                resolve();
            });
        })
        .catch(this.error.bind(this));
    }

    /**
     * 
     */
    outputMainLandingPage () {
        return new Promise((resolve, reject) => {
            resolve();
        })
        .catch(this.error.bind(this));
    }
}

module.exports = HtmlApp;
