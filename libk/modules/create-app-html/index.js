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

const AppBase     = require('../create-app-base'),
      Path        = require('path'),
      Handlebars  = require('handlebars'),
      Fs          = require('fs-extra'),
      UglifyJS    = require("uglify-js"),
      CleanCSS    = require('clean-css'),
      Swag        = require('swag'),
      LinkRe      = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g,
      ImgRe       = /{\s*@img(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g,
      HashStartRe = /^#/;

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
        super.run();

        // TODO create a product home page
        // TODO create a Landing page class (if a CLI param is passed - or can be called directly, of course)
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
     * Copy supporting assets to the output folder.  
     * i.e. app.js, app.css, ace editor assets, etc.
     */
    copyAssets () {
        let options   = this.options,
            root      = options._myRoot,
            assetsSrc = Path.join(root, 'assets');

        this.copyCss();
        this.copyJs();

        Fs.copySync(assetsSrc, this.assetsDir);
    }

    /**
     * Copy the CSS needed for the docs / guides
     */
    copyCss () {
        let options     = this.options,
            production  = options.production,
            root        = options._myRoot,
            assetsSrc   = Path.join(root, 'assets'),
            mainCss     = Path.join(assetsSrc, 'css/main.css'),
            tachyonsCss = Path.join(root, 'node_modules/tachyons/css/tachyons.css'),
            faCss       = Path.join(assetsSrc, 'css/docs-fonts.css'),
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
                tachyonsCss, // the tachyons CSS base
                mainCss      // app-specific styling / overrides
            ]);

        Fs.ensureDirSync(this.cssDir);
        Fs.writeFileSync(Path.join(this.cssDir, 'app.css'), css.styles, 'utf8');
    }

    /**
     * 
     */
    copyJs () {
        let options    = this.options,
            production = options.production,
            root       = options._myRoot,
            assetsSrc  = Path.join(root, 'assets'),
            extl       = Path.join(assetsSrc, 'js/ExtL.js'),
            main       = Path.join(assetsSrc, 'js/main.js'),
            beautify   = Path.join(assetsSrc, 'js/beautify.js'),
            aceFolder  = Path.join(root, 'node_modules/ace-builds/src-min-noconflict'),
            ace        = Path.join(aceFolder, 'ace.js'),
            modeJs     = Path.join(aceFolder, 'mode-javascript.js'),
            worker     = Path.join(aceFolder, 'worker-javascript.js'),
            theme      = Path.join(aceFolder, 'theme-chrome.js'),
            jsMinified = UglifyJS.minify([
                extl,
                ace,
                modeJs,
                worker,
                theme,
                beautify,
                main
            ], {
                compress : production,
                mangle   : production,
                output   : {
                    beautify : !production
                }
            });

        Fs.ensureDirSync(this.jsDir);
        Fs.writeFileSync(Path.join(this.jsDir, 'app.js'), jsMinified.code.toString(), 'utf8');
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
        data = super.processGuideDataObject(data);
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
                if (err) this.log(err, 'error');
                delete this.classMap[className];
                // resolve after a timeout to let garbage collection catch up
                setTimeout(resolve, 100);
            });
        });
    }
}

module.exports = HtmlApp;
