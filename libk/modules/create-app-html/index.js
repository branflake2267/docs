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

const AppBase    = require('../create-app-base'),
      Path       = require('path'),
      Handlebars = require('handlebars'),
      Fs         = require('fs-extra');

class HtmlApp extends AppBase {
    constructor (options) {
        super(options);
    }

    /**
     * 
     */
    run () {
        super.run();

        this.copyAssets();

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
     * The handlebars template for guide output (may be overridden by the post processor
     * modules)
     * @return {Object} The compiled handlebars template
     */
    get guideTemplate () {
        let tpl = this._guideTpl;

        if (!tpl) {
            // TODO differentiate the HTML guide template file for use in the HTML docs.  Will need TOC, google analytics, etc.
            tpl = this._guideTpl = Handlebars.compile(Fs.readFileSync(Path.join(this.options._myRoot, 'templates/html-main.hbs'), 'utf-8'));
        }

        return tpl;
    }

    /**
     * Copy supporting assets to the output folder.  
     * i.e. app.js, app.css, ace editor assets, etc.
     */
    copyAssets () {
        //
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
    getGuideFilePath (rootPath, name) {
        return Path.join(this.guidesOutputDir, rootPath, name) + '.html';
    }

    /**
     * Processes the HTML of the guide body.  Decorates `@example` instances, processes
     * links, etc.
     * @param {String} html The markdown from the guide source file
     * @return {String} The processed guide HTML
     */
    processGuideHtml (html) {
        // processes the markdown to HTML
        html = super.processGuideHtml(html);

        // TODO finish with the guide HTML: decorate @examples, process links, etc.

        html = this.parseApiLinks(html);

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
     * Process API links using the passed product, version, class name, etc.
     * @param {String} product The product name
     * @param {String} version The version stipulated in the [[link]] or null if not
     * specified
     * @param {String} toolkit The specified toolkit or 'api'
     * @param {String} className The name of the SDK class
     * @param {String} memberName The name of the member (or member group potentially) or
     * undefined if no member was specified in the link
     * @param {String} text The text to display in the link if specified
     * @return {String} The link markup
     */
    // TODO process the api links for HTML guides
    createApiLink(product, version, toolkit, className, memberName, text) {
        //
    }
}

module.exports = HtmlApp;
