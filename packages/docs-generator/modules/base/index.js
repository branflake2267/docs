/* jshint node: true */
'use strict';

const EventEmitter = require('events'),
    Debug = require('../../Debug'),
    Worker = require('tiny-worker'),
    Os = require('os'),
    Path = require('path'),
    CompareVersions = require('compare-versions'),
    CpuCount = Os.cpus().length,
    Utils = require('../shared/Utils'),
    Chalk = require('chalk'),
    Shell = require('shelljs'),
    Play = require('play'),
    Fs = require('fs-extra'),
    Mkdirp = require('mkdirp'),
    marked = require('@sencha/custom-marked'),
    Git = require('git-state'),
    Handlebars = require('handlebars'),
    safeLinkRe = /(\[]|\.\.\.)/g,
    StringSimilarity = require('string-similarity'),
    //idRe             = /[^\w]+/g,
    _ = require('lodash');

const Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

// TODO add this.log() stuff throughout all classes: `log` for general messaging, `info`
// for warnings, and `error` for serious / fatal errors
// TODO add status() endpoints for each section we want to show to users as the app runs
// TODO create a BuildApps class for running both the HTML and Ext builds (maybe
// controllable with CLI params)
class Base {
    constructor(options) {
        let root = options._myRoot,
            projectDefaults = Fs.readJsonSync(
                Path.join(root, 'configs/docs_project_config.json')
            ),
            appDefaults = Fs.readJsonSync(Path.join(root, 'configs/app.json'));

        // Merge in the project defaults, then the app defaults, then finally the CLI args
        options = Object.assign({}, projectDefaults, appDefaults, options);
        this.options = options;

        // Resolve the build output directory
        options.outputDir = Path.join(options._myRoot, options.outputDir);

        // Resolve the build output assetsDir 
        options.assetsDir = this.assetsDir;

        // Resolve the public directory
        options.publicDir = Path.join(__dirname, '../..', 'public');

        // Debug
        console.log(`CONFIG: options.outputDir=${options.outputDir} - The build output directory.`);
        console.log(`CONFIG: options.assetsDir=${options.assetsDir} - The build/assets directory.`);
        console.log(`CONFIG: options.publicDir=${options.publicDir} - The public static files directory.`);

        // init events - events help control the flow of the app
        // TODO wire up promises so we can remove events
        this.emitter = new EventEmitter();

        // enable logging options using the project options / CLI param
        if (options.log) {
            this.enableLogging(options.log);
        }

        // a map of doxi member type group names to the format expected by the docs
        // post-processors
        this.memberTypesMap = {
            configs: "cfg",
            properties: "property",
            methods: "method",
            events: "event",
            vars: "var",
            "sass-mixins": "method",
            "static-methods": "static-method",
            "static-properties": "static-property"
        };

        // possible member types
        this.memberTypes = ['cfg', 'property', 'static-property', 'method',
            'static-method', 'event', 'css_var-S', 'css_mixin'];

        this.escapeRegexRe = /([-.*+?\^${}()|\[\]\/\\])/g;

        // initialize an object to indicate when a product is synced or otherwise should
        //have doxi run (has dirty files).  This allows successive logic to proceed based
        // on a fresh sync (i.e. Doxi will parse files anew if the product repo was
        // recently synced)
        this.triggerDoxi = {};

        // the modifiedList is populated if there are modified / new files discovered in
        // the syncRemote method.  The modified list can be used to process only the
        // files edited / added instead of all files
        this.modifiedList = [];

        try {
            this.registerHandlebarsPartials();
        } catch (e) {
            this.error("Error registering handlebars.", e);
        }

        try {
            this.registerHandlebarsHelpers();
        } catch (e) {
            this.error("Error registering handlebars helpers.", e);
        }

        // assign current runtime metadata
        let o = this.options,
            { product, version } = o,
            majorVer = version && version.charAt(),
            prodObj = o.products[product];

        if (!prodObj) {
            let match = StringSimilarity.findBestMatch(
                product,
                Object.keys(o.products)
            ),
                proposed = `--product=${match.bestMatch.target}`;

            this.log(`
                ${Chalk.white.bgRed('ERROR :')} '${Chalk.gray('docs_project_config.json')}' does not have the product config for the passed product: '${Chalk.gray(product)}'
                Possible match : ${Chalk.gray(proposed)}
            `);
            process.exit();
        }

        // toolkit version "6.6.0-CE" or "6". options: modern, classic
        let toolkitObj = (prodObj.toolkit && prodObj.toolkit[version]) || (prodObj.toolkit && prodObj.toolkit[majorVer]);
        let toolkits = toolkitObj ? toolkitObj.toolkits : false;
        let toolkit = o.toolkit || (toolkitObj && toolkitObj.defaultToolkit) || 'api';

        o.prodVerMeta = {
            majorVer: majorVer,
            prodObj: prodObj,
            hasApi: !!prodObj.hasApi,
            hasVersions: prodObj.hasVersions,
            hasToolkits: (toolkits && toolkits.length),
            toolkits: toolkits,
            toolkit: toolkit,
            hasGuides: prodObj.hasGuides !== false,
            title: prodObj.title
        };

        // DocsApp.meta = myMeta - search hint
        console.log(`CONFIG: options.prodVerMeta.toolkits=${options.prodVerMeta.toolkits}`);
        console.log(`CONFIG: options.prodVerMeta.toolkit=${options.prodVerMeta.toolkit}`);
        console.log(`CONFIG: options.prodVerMeta.hasToolkits=${options.prodVerMeta.hasToolkits}`);
    }

    /*=============================================
     =             Begin Getter Properties        =
     =============================================*/

    /**
     *  Returns the full path of the output directory + product (+ version if applicable)
     * + api directory name
     * @return {String} The api files' output path
     */
    get apiDir() {
        // ** NOTE ** Do not cache since the apiDirName may be changed between toolkits
        return Path.join(this.outputProductDir, this.apiDirName);
    }

    /**
     * Returns the directory name for the api docs output.  Will be the toolkit set on
     * the 'options' object if it exists else "api".
     * @return {String} The directory for API output
     */
    get apiDirName() {
        // ** NOTE ** Do not cache since the options.toolkit may be changed between builds
        let adn = this.options.toolkit || 'api';
        //console.log("CONFIG: apiDirName=" + adn);
        return adn;
    }

    /**
     * The directory where assets like images, js, and CSS files should be copied to in a
     * build
     * @return {String} The full path to the output assets directory
     */
    get assetsDir() {
        let dir = this._assetsDir;

        if (!dir) {
            let { options } = this,
                { assetsDir } = options,
                formatted = Utils.format(assetsDir, options);

            dir = this._assetsDir = formatted;
        }

        return dir;
    }

    /**
     * Returns common metadata needed by app pages
     * @return {Object} Hash of common current page metadata
     */
    get commonMetaData() {
        const { options } = this,
            { prodVerMeta } = options,
            meta = Object.assign({}, options.prodVerMeta),
            product = this.getProduct(options.product),
            { searchPartnerVersions } = this;

        // if (guideSearchPartners) {
        //     const { productMenu: partnerVersions } = products[guideSearchPartners];
        // }

        return Object.assign(meta, {
            version: options.version,
            pageType: 'common',
            product: product,
            apiProduct: this.apiProduct,
            apiVersion: this.apiVersion,
            title: meta.title,
            toolkit: prodVerMeta.hasToolkits && options.toolkit,
            exceptions: options.buildExceptions,
            searchPartnerVersions: searchPartnerVersions
        });
    }

    /**
     * Finds the search partner version that most closely matches the product version
     * you're currently working with
     * @return {Object} An object whose keys are the search partner product names and
     * whose value is an object of productVersion : partnerVersion pairs.  For example:
     * 
     *     {
     *         cmd : {
     *             '6.5.1': '6.5.1',
     *             '6.5.0': '6.5.0',
     *             '6.2.1': '6.5.0',
     *             '6.2.0': '6.5.0',
     *             '6.0.2': '6.5.0',
     *             '6.0.1': '6.5.0',
     *             '6.0.0': '6.5.0',
     *             '5.1.4': '6.5.0',
     *             '5.1.3': '6.5.0',
     *             '5.1.2': '6.5.0',
     *             '5.1.1': '6.5.0',
     *             '5.1.0': '6.5.0',
     *             '5.0.1': '6.5.0',
     *             '5.0.0': '6.5.0'
     *         }
     *     }
     */
    get searchPartnerVersions() {
        const { options } = this,
            {
                product: currentProduct,
                products
            } = options,
            product = this.getProduct(currentProduct),
            { guideSearchPartners, productMenu } = products[product], searchPartnerVersions = {};

        if (guideSearchPartners && guideSearchPartners.length) {
            guideSearchPartners.forEach(partner => {
                const prodObj = searchPartnerVersions[partner] = {};
                let partnerVersions = _.clone(products[partner].productMenu);

                if (!partnerVersions || partnerVersions === true) {
                    partnerVersions = [];
                }
                partnerVersions = partnerVersions.reverse();

                productMenu.forEach(prodVer => {
                    const [
                        firstPartner
                    ] = partnerVersions,
                        lastPartner = _.last(partnerVersions),
                        under = CompareVersions(prodVer, firstPartner) < 1,
                        over = CompareVersions(prodVer, lastPartner) === 1;

                    if (under) {
                        prodObj[prodVer] = firstPartner;
                    } else if (over) {
                        prodObj[prodVer] = lastPartner;
                    } else {
                        partnerVersions.forEach(partnerVer => {
                            const compared = CompareVersions(prodVer, partnerVer);
                            if (compared < 1) {
                                prodObj[prodVer] = partnerVer;
                            }
                        });
                    }
                });
            });
        }

        return searchPartnerVersions;
    }

    /**
     * The directory where CSS assets should be copied to in a build
     * @return {String} The full path to the output CSS directory
     */
    get cssDir() {
        let dir = this._cssDir;

        if (!dir) {
            let { options } = this,
                cssDir = Utils.format(options.cssDir, options);

            dir = this._cssDir = options.cssDir = Path.resolve(options._myRoot, cssDir);

            this.log("CONFIG: cssDir=" + dir);
        }

        return dir;
    }

    /**
     * Returns the folder node class used for tree navigation
     * @return {String} The navigation tree's folder node class
     */
    get folderNodeCls() {
        return 'fa fa-folder-o';
    }

    /**
     * The partial to use as the help page content
     * @return {String} The name of the partial file to use as the docs help content
     */
    get helpPartial() {
        return '_help';
    }

    /**
     * The directory where image assets should be copied to in a build
     * @return {String} The full path to the output images directory
     */
    get imagesDir() {
        let dir = this._imagesDir;

        if (!dir) {
            let { options } = this,
                imagesDir = Utils.format(options.imagesDir, options);

            dir = this._imagesDir = options.imagesDir = Path.resolve(options._myRoot, imagesDir);

            this.log("CONFIG: imagesDir=" + dir);
        }

        return dir;
    }

    /**
     * The directory where JS assets should be copied to in a build
     * @return {String} The full path to the output JS directory
     */
    get jsDir() {
        let dir = this._jsDir;

        if (!dir) {
            let { options } = this,
                jsDir = Utils.format(options.jsDir, options);

            dir = this._jsDir = options.jsDir = Path.resolve(options._myRoot, jsDir);

            this.log("CONFIG: jsDir=" + dir);
        }

        return dir;
    }

    /**
     * The handlebars template for HTML output
     * @return {Object} The compiled handlebars template
     */
    get mainTemplate() {
        let tpl = this._guideTpl;
        if (!tpl) {
            let path = Path.join(this.options._myRoot, 'templates/html-main.hbs');
            tpl = this._guideTpl = Handlebars.compile(
                Fs.readFileSync(path, 'utf-8')
            );
        }
        return tpl;
    }

    /**
     * The handlebars template for HTML outout for teh page that redirects to main page. 
     * @return {Object} The compiled handlebars template
     */
    get mainProductRedirectToCurrentPage() {
        let tpl = this._redirectToVersionsTpl;
        if (!tpl) {
            let path = Path.join(this.options._myRoot, 'templates/redirect-current-version.hbs');
            tpl = this._redirectToVersionsTpl = Handlebars.compile(
                Fs.readFileSync(path, 'utf-8')
            );
        }
        return tpl;
    }

    /**
     * Returns the downloads / offline docs dir
     */
    get offlineDocsDir() {
        let { options } = this,
            offlineDir = Utils.format(options.offlineDocsDir, options);

        return Path.resolve(options._myRoot, offlineDir);
    }

    /**
     * Returns the full path of the output directory + the product name (and version if applicable).
     * @return {String} The full output directory path
     */
    get outputProductDir() {
        // TODO cache this and all the other applicable static getters
        let { options } = this,
            { product } = options,
            outPath = Utils.format(options.outputProductDir, options),
            { hasVersions } = options.products[product]

        if (hasVersions) {
            outPath = Path.join(outPath, options.version);
        }

        return outPath;
    }

    /**
     * Initializes the parent chain array of all module ancestry by file name
     * @return {String[]} This module's file name (in an array).
     */
    get parentChain() {
        return [Path.parse(__dirname).base];
    }

    /**
     * Returns the resources directory used to house resource files for the apps
     * @return {String} the common resources directory (full) path
     */
    get resourcesDir() {
        return Path.join(this.outputProductDir, this.options.resourcesDir);
    }

    /**
     * Generates a unique ID for an element
     * @return {String} The unique ID
     */
    get uniqueId() {
        if (!this._rollingId) {
            this._rollingId = 0;
        }
        return `s-${this._rollingId++}`;
    }

    /**
     * Returns the path to the since map file
     * @return {String} The file path
     */
    get sinceMapPath() {
        const { options } = this,
            root = options._myRoot,
            assetsSrc = Path.join(root, 'assets');

        return Path.join(assetsSrc, 'js', 'sinceMap.json');
    }

    /**
     * Returns an object containing classes and all members as keys with the version that
     * that class / member shows up in the SDK
     * @return {Object} Map of classes / members and when they were introduced
     */
    get sinceMap() {
        const { sinceMapPath } = this;

        return Fs.existsSync(sinceMapPath) ? Fs.readJsonSync(sinceMapPath) : {};
    }

    /*=============================================
     =             End Getter Properties          =
     =============================================*/

    /*=============================================
     =             Begin Getter Methods           =
     =============================================*/

    /**
     * Returns all directories from a path / directory (system files will be filtered
     * out)
     * @param {String} path The path of the directory that all child directories should
     * be returned from
     * @return {String[]} Array of directory names
     */
    getDirs(path) {
        return this.getFilteredFiles(Fs.readdirSync(path)).filter(item => {
            return Fs.statSync(Path.join(path, item)).isDirectory();
        });
    }

    /**
     * Return a formatted elapsed time using the provided start and end time in minutes,
     * seconds, and milliseconds.  If any aspect is missing (0) then it's omitted in the
     * output
     *
     *     i.e. an elapsed time of 1000ms would output as 1s
     *     61000 = 1m 1s
     *     61100 = 1m 1s 100ms
     *
     * @param {Date} startTime The starting time
     * @param {Date} endTime the ending time
     * @return {String} a human-readable elapsed time
     */
    getElapsed(startTime, endTime) {
        endTime = endTime || new Date();

        let elapsed = new Date(endTime - startTime),
            minutes = elapsed.getMinutes(),
            seconds = elapsed.getSeconds(),
            ms = elapsed.getMilliseconds(),
            ret = [];

        if (minutes) {
            ret.push(minutes + 'm');
        }
        if (seconds) {
            ret.push(seconds + 's');
        }
        if (ms) {
            ret.push(ms + 'ms');
        }

        return ret.join(' ');
    }

    /**
     * Gets the matching file using the passed version or the file with the closest version to the passed version without going over.
     *
     * So, if the files from the path location were
     * ['config-1.0.0.json', 'config-2.0.0.json'] and you passed in the version of
     * '1.5.0' then the file returned would be 'config-1.0.0.json'.
     *
     * **Note:** If there is only one file in the given path then that is what is
     * returned (we're assuming there is either only one version or there are not
     * versioned files in the directory)
     * @param {String} path The path for all files to compare with
     * @param {String} version The version to match the files against
     * @param {String} [delimiter] An optional delimiter to split the file name by when
     * looking for the version within the filename.  Defaults to '-'.
     * @return {String} The filename most closely matching the passed version
     */
    getFileByVersion(path, version, delimiter) {
        delimiter = delimiter || '-';

        let files = this.getFiles(path),
            len = files.length,
            delimiterLen = delimiter.length,
            matchingFile;

        //console.log("\t\t getFileByVersion(): files on path=" + path);

        // if there is only one file just return it
        if (len === 1) {
            [matchingFile] = files;
        } else {
            // else we'll loop over the files to find the one that is closest to the
            // passed version without going over
            let cfgVer = '0';

            for (let i = 0; i < len; i++) {
                let file = files[i],
                    { name } = Path.parse(file),
                    v = name.substring(name.indexOf('-') + delimiterLen);
                let compare = CompareVersions(v, version);

                //console.log("\t\t\t getFileByVersion(): Compare v=" + v + " compared to version=" + version + "=" + compare);

                if (compare <= 0) {
                    cfgVer = v;
                    matchingFile = file;
                }
            }
        }

        //console.log("\t\t\t\t getFileByVersion(): matchingFile=" + matchingFile);

        if (!matchingFile) {
            this.error("getFileByVersion(): matching File is undefined!");
        }

        return matchingFile;
    }

    /**
     * Get all files from the passed directory / path
     * @param {String} path The path of the directory that all files should be returned
     * from
     * @return {String[]} Array of file names from the source directory
     */
    getFiles(path) {
        //this.log('\tgetFiles path=' + path);

        // filter out system files and only return files (filter out directories)
        return this.getFilteredFiles(Fs.readdirSync(path)).filter(function (file) {
            return Fs.statSync(Path.join(path, file)).isFile();
        });
    }

    /**
     * Filters out any system files (i.e. .DS_Store)
     * @param {String[]} files Array of file names
     * @return [String[]] Array of file names minus system files
     */
    getFilteredFiles(files) {
        return files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
    }

    /**
     * Filter out only the handlebars partial files from a list of files (those that have
     * a file name that starts with an underscore)
     * @param {String[]} files Array of file names to filter
     * @return {String[]} The array of filtered file names
     */
    getPartials(files) {
        return files.filter((file) => {
            return file.charAt(0) === '_';
        });
    }

    /**
     * Returns the normalized product name.
     * i.e. some links have the product name of ext, but most everywhere in the docs we're referring to Ext JS as 'extjs'
     *
     *     this.log(this.getProduct('ext')); // returns 'extjs'
     * @param {String} prod The product name to normalized
     * @return {String} The normalized product name or `null` if not found
     */
    getProduct(prod) {
        prod = prod || this.options.product;
        // TODO if missing from normalizedProductList report it. 
        var rp = this.options.normalizedProductList[prod];
        if (!rp) {
            console.log("ERROR: The product was not listed in the 'normalizedProductList' in the config.")
        }
        return rp;
    }

    /*=============================================
     =             End Getter Methods             =
     =============================================*/

    /**
     * Returns the array of toolkits or undefined if the product / version does not have
     * toolkits
     * @param {String} product The product to check
     * @param {String} version The version to check
     * @return {Array/Undefined} The array of toolkits or undefined if the product /
     * version does not have toolkits
     */
    getToolkits(product = this.apiProduct, version = this.apiVersion) {
        const { products } = this.options,
            prodObj = products[product],
            [majorVer] = version.split('.');

        return prodObj.toolkit
            && prodObj.toolkit[majorVer]
            && prodObj.toolkit[majorVer].toolkits;
    }

    /**
     * Register all handlebars partials from the templates directory
     */
    registerHandlebarsPartials() {
        //this.log(`Begin 'Base.registerHandlebarsPartials'`, 'info');
        let templateDir = Path.join(this.options._myRoot, 'templates'),
            files = this.getPartials(this.getFiles(templateDir)),
            len = files.length,
            i = 0;

        for (; i < len; i++) {
            let fileName = files[i],
                partialPath = Path.join(templateDir, fileName),
                partialName = Path.parse(partialPath).name;

            this.registerPartial(partialName, partialPath);
        }
    }

    /**
     * Checks to see if a directory is empty
     * @param {String} dir The directory to check
     * @return {Boolean} True if the directory is empty
     */
    isEmpty(dir) {
        let files = Fs.readdirSync(dir);
        files = this.getFilteredFiles(files);

        return files.length === 0;
    }

    /**
     * Prepares common data attributes
     * @param {Object} data The object to be processed / changed / added to before
     * supplying it to the template
     */
    processCommonDataObject(data) {
        let { options } = this,
            { prodVerMeta } = options,
            dt = new Date();

        data.title = prodVerMeta.prodObj.title;
        data.product = this.getProduct(options.product);
        data.hasGuides = prodVerMeta.hasGuides;
        data.hasApi = prodVerMeta.hasApi;
        data.version = options.version;
        data.moduleName = this.moduleName;
        data.helpPartial = this.helpPartial;
        data.date = dt.toLocaleString("en-us", { month: "long" }) + ", " + dt.getDate() + " " + dt.getFullYear() + " at " + dt.getHours() + ":" + dt.getMinutes();
    }

    /**
     * Registers the handlebars partial using the passed name and path
     * @param {String} partialName The name to register the partial with
     * @param {String} partialPath The path of the handlebars file to register as a
     * partial template
     */
    registerPartial(partialName, partialPath) {
        let template = Fs.readFileSync(partialPath, 'utf8');

        Handlebars.registerPartial(partialName, template);
    }

    /**
     * Register all handlebars helpers
     */
    registerHandlebarsHelpers() {
        // The `json` helper stringifies a Javascript object.  Helpful when you want to
        // pass a hash of information directly to a handlebars template.
        Handlebars.registerHelper('json', context => {
            return JSON.stringify(context);
        });

        Handlebars.registerHelper("any", function (array, options) {
            if (array && array.length > 0) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        Handlebars.registerHelper('is', function (value, test, options) {
            if (value && value === test) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        Handlebars.registerHelper('isnt', function (value, test, options) {
            if (!value || value !== test) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        Handlebars.registerHelper("capitalizeFirst", function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        });

        // The 'bubbleWrap' helper is used by the home template partial.  With the home
        // template there are n number of items and every two (and any trailing odd one)
        // need to be wrapped by an element in the template.  This helper will decorate
        // each item saying whether it should have the wrapping element begun, ended, or
        // both
        Handlebars.registerHelper("bubbleWrap", (arr, options) => {
            if (arr && arr.length) {
                let buffer = "",
                    i = 0,
                    len = arr.length;

                // loop over all items
                for (; i < len; i++) {
                    var item = arr[i],
                        even = i % 2 === 0;

                    // indicate whether the item is even or not and if so then start the
                    // wrapping
                    // **Note:** this works as the initial index is 0 and therefor even
                    if (even) {
                        item.startWrap = true;
                    }
                    // if it's odd or it's the last of the items then end the wrapping
                    if (!even || i === len - 1) {
                        item.endWrap = true;
                    }

                    buffer += options.fn(item);
                }


                return buffer;
            }
        });
    }

    /**
     * Enables logging for the application
     * @param {Boolean/Object} level `true` to enable logging for all levels.  Else an
     * array containing one or more of the `log`, `info`, or `error` levels to enable.
     *
     * **Note:** Logging can be enabled by passing `--log` or `--log=true` at the end of
     * your CLI command.
     *
     * **Note:** You can specify message types by passing the type as a string, or
     * comma separated string.  For instance:
     *
     *     `--log=error,info`
     *
     * To enable `error` and `info`:
     *
     *     enableLogging(['error', 'info']);
     */
    enableLogging(level) {
        //this.log(`Begin 'Base.enableLogging'`, 'info');
        level = Utils.from(level);
        let all;

        // accounts for --log
        if (level.length === 0) {
            all = true;
            // accounts for --log= and --log=true
        } else if (level.length === 1) {
            if (level[0] === 'true' || level[0] === '' || level[0] === true) {
                all = true;
            }
        }

        // if true then include all options
        if (all === true) {
            level = ['log', 'info', 'error'];
        }
        let i = 0,
            len = level.length;

        // enable every option passed in
        for (; i < len; i++) {
            Debug.enable(level[i]);
        }
    }

    /**
     * Convenience error logging method
     * @param {String/Object} err The error instance or error string to wrap as an error
     * instance
     */
    error(err) {
        if (!(err instanceof Error)) {
            err = new Error(err);
        }
        this.log(err, 'error');
    }

    /**
     * Console logs the passed message using the type passed in the second param
     * @param {String} msg The message to log
     * @param {String} type The type of logging to do: `error`, `log`, `info`.  Defaults
     * to `log`.
     *
     *      this.log('Oh no!', 'error');
     *
     * **Note:** The message will only log out if the type passed is enabled by
     * {@link #enableLogging}
     */
    log(msg, type) {
        type = type || 'log';

        Debug[type](msg);
    }

    /**
     * Creates a pool of Worker child processes that loop over the passed `items` and
     * hand them off to the passed module to be processed.  If a callback is passed it
     * will be called when the last item has been processed by its Worker.
     *
     *     let intArr = [1, 2];
     *     this.processQueue(intArr, __dirname + '/worker.js', function (processedInts) {
     *         this.postProcess(processedInts);
     *     });
     *
     * @param {Object[]} items Array of serializable objects, arrays, strings, etc. to be
     * processed by the supplied module (`mod`)
     * @param {String} mod The path to the module to be spun up by the Workers in the
     * pool.  Pass an absolute path using `__dirname` + path.
     * @param {Function} callback The callback function to call after all `items` have
     * been processed.  The scope is the application instance.
     * @param {Object[]} callback.responses The responses passed back from each Worker
     * will be collected into the `responses` param
     */
    processQueue(items, mod, callback) {
        let i = 0,
            len = items.length < CpuCount ? items.length : CpuCount,
            responses = [],
            workers = [];

        // the Worker pool will be the number of cores your processor has or the number
        // of items passed in; whichever is smaller
        for (; i < len; i++) {
            // create a Worker instance from the passed module path
            let worker = new Worker(mod);
            // we'll collect up the works as they're instantiated.  Once the items queue
            // is satisfied the worker will terminate and remove itself from the
            // collection.  That way we'll know when the last worker is done and the
            // callback is to be called.
            workers.push(worker);
            // set the onmessage listener to handle the response from the Worker
            worker.onmessage = (ev) => {
                // collect the response to hand off to the callback
                responses.push(ev.data);

                // if there are no more items to process
                if (!items.length) {
                    // terminate the worker and remove it from the active workers array
                    worker.terminate();
                    Utils.removeAt(workers, workers.indexOf(worker));

                    // if there are no more workers to process anything then we can call
                    // the callback (if there is one)
                    if (!workers.length) {
                        if (callback) {
                            callback.call(this, responses);
                        }
                    }
                } else {
                    // if the items queue isn't exhausted then process one more
                    worker.postMessage(items.shift());
                }
            };
            // with the worker freshly instantiated go ahead and work the first item in
            // the items queue
            worker.postMessage(items.shift());
        }
    }

    /**
     * Adds a class (or classes) to all HTML elements of a given type (or array of types)
     * within a blob of HTML.
     *
     * Example adding a single class to one tag type:
     *
     *     this.addCls('html, 'a', 'foo');
     *
     * Example adding multiple classes to multiple tags:
     *
     *     this.addCls('html', ['a', 'code'], ['foo', 'bar']);
     *
     * Example adding different classes to different tags:
     *
     *     this.addCls('html', {
     *         a    : 'foo',
     *         code : 'bar'
     *     });
     *
     * @param {String} html The HTML block containing the elements receiving the added
     * classes
     * @param {String/String[]/Object} tags An element tag name, or array of tag names,
     * to search for an add the specified CSS class.  A hash of tag names: classes may
     * also be passed.
     * @param {String/String[]} [cls] The class or classes to add to the specified tag /
     * tags.
     * @return {String} The HTML blob with the classes added.
     */
    addCls(html, tags, cls) {
        // create a string from an array of class strings is possible
        // if tags is a string then wrap it in an array
        tags = Utils.isString(tags) ? Utils.from(tags) : tags;

        let len = tags.length,
            i = 0;

        // if tags is not already an object create one with the tags as keys and the cls
        // as the class to add to the element
        if (!Utils.isObject(tags)) {
            let temp = {};
            for (; i < len; i++) {
                let tag = tags[i];
                temp[tag] = cls;
            }
            tags = temp;
        }

        let tagNames = Object.keys(tags);
        len = tagNames.length;
        i = 0;

        // loop over all of the tags and add the specified class / classes to them
        for (; i < len; i++) {
            let tag = tagNames[i],
                reString = `(<${tag}(?![^>]*class)[^>]*?)(>)|(<${tag}[^>]*?class=["']?.*?)(["']?[^>]*?>)`,
                re = new RegExp(reString, 'gim');

            cls = tags[tag];
            // create a string from an array of class strings is possible
            cls = cls && Array.isArray(cls) ? cls.join(' ') : cls;

            html = html.replace(re, (match, p1, p2, p3, p4) => {
                let pre = p1 || p3,
                    post = p2 || p4,
                    classStr = p1 ? ` class="${cls}"` : ` ${cls} `;

                return `${pre}${classStr}${post}`;
            });
        }

        return html;
    }

    /**
     * Performs and cleanup as the build concludes
     */
    concludeBuild() {
        console.log("...Build Completed!");

        process.exit();
    }

    /**
     * @method createLink
     * @param href
     * @param text
     */
    createLink(href, text) {
        let openExternal = '',
            hash, split;

        if (href.includes('#') && href.charAt(0) != '#') {
            split = href.split('#');
            [href] = split;
            hash = '#' + split[1];
        }

        if (!text) {
            text = href;
        }

        if (!href.includes('.html') && href.charAt(0) != '#') {
            href += '.html';
        }

        if (hash) {
            href = href + hash;
        }

        for (var i = 0; i < this.memberTypes.length; i++) {
            let item = this.memberTypes[i];

            if (text.includes(item + '-')) {
                text = text.replace(item + '-', '');
            }
        }

        if (!href.includes('sencha.com') && (href.includes('http:')) || href.includes('https:')) {
            openExternal = "class='external-link' target='_blank' ";
        }

        return "<a " + openExternal + "href='" + href + "'>" + text + "</a>";
    }

    /**
     * Ensures that a directory exists and if not then it's created (mkdirp-style)
     * @param {String} path The directory path to ensure / create
     * @return {Object} A Promise that resolves once the directory is found / created
     */
    ensureDir(path) {
        return new Promise((resolve) => {
            Fs.ensureDir(path, (err) => {
                if (!err) {
                    resolve(true);
                }
            });
        }).catch(this.error.bind(this));
    }

    /**
     * @method replaceSpaces
     * Replaces spaces with the passed replacement character
     * @param {String} str Text string with spaces to replace
     * @param {String} replacement character with which to replace space
     * @return {String} The string with replaced spaces
     */
    replaceSpaces(str, replacement) {
        return str.replace(/\s+/g, replacement);
    }

    /**
     * @method makeID
     * Returns a string that has spaces, special characters, and slashes replaced
     * for id use.
     * @param {String} id The element id to normalize
     * @param {String} name The element text node
     * @return {String} The modified id
     */
    makeID(id, name) {
        id = this.replaceSpaces(id, "_").replace("/", "-_-");
        name = this.replaceSpaces(name, "_").replace(/[^\w]+/g, "_").toLowerCase();
        return id + "_-_" + name;
    }

    /**
     * Converts the passed in markdown text to HTML markup
     * @param {String} text The markdown string to convert to HTML
     * @param {String} [cls] The API class being marked up (if applicable)
     * @return {String} The converted HTML text
     */
    markup(text, cls) {
        let me = this;

        if (!text) {
            return '';
        }

        return marked(text, {
            addHeaderId: !cls ? false : function (text, level, raw) {
                return me.makeID(cls, raw);
            },
            appendLink: true,
            decorateExternal: true
        });
    }

    /**
     * Accepts a delimited string of class names and returns each string decorated as an
     * HTML link
     *
     * Example:
     * splitInline('String,Ext.grid.Panel,Ext.Component', '<br>);
     *
     * Returns:
     * <a href="{link to String}">String</a><br><a href="{link to String}">String</a>
     */
    splitInline(text, joinStr) {
        if (!text) {
            return '';
        }

        // replace pipes with slash
        text.replace(/\|/, '/');
        let str = [],
            // set the delimiter based on what is found in the `text` string
            delimiter = text.includes(',') ? ',' : (text.includes('/') ? '/' : ','),
            // and we'll rejoin the links afterwards with the delimiter found unless one
            // is passed in
            joinWith = joinStr || delimiter;

        // create links to the associated class (if found) from each item in the `text`
        if (text && text.includes(delimiter)) {
            text = text.split(delimiter);

            for (var i = 0; i < text.length; i++) {
                let item = text[i],
                    link = item.replace(safeLinkRe, '');

                str.push(this.generateSplitString(link, item));
            }
        } else {
            let link = text.replace(safeLinkRe, '');

            str.push(this.generateSplitString(link, text));
        }

        // return the string of <a> links separated by the `joinWith` delimiter
        return str.join(joinWith);
    }

    /**
     * Returns the `item` string passed in unless the `link` is a valid class name in 
     * which case a link string is passed back using the class name from the `link` param
     * @param {String} link A string that may be a class name that should be turned into 
     * a link.  If it's not a valid class name then the `item` string is what is 
     * returned.
     * @param {String} item The text item to use in place of a link
     * @return {String} The original or marked up string
     */
    generateSplitString(link, item) {
        let str = "";
        // if the string is a class name in the classMap create a link from it
        if (this.classMap && this.classMap[link]) {
            str = this.createLink(link + '.html', item);
            // else just return the string back
        } else {
            str = item;
        }

        return str;
    }

    /**
     * Sync a remote git repo locally so you don't have to have a copy of every
     * applicable branch locally sourced.  The product name is passed in and the git
     * particulars are collected from the projectDefaults config file (cached in `this`'s
     * options).  This SDK repo is what Doxi will work from.
     * @param {String} product A product name relating to a key in the projectDefaults'
     * products node.  Used to collect up the name of the repo for this product, the
     * branch in Git to pull from, etc.
     * @param {String} sourceDir The source directory of the local repo
     */
    syncRemote(product = this.apiProduct, sourceDir = this.apiSourceDir) {
        const { options } = this,
            { _myRoot } = options;

        this.log('sncRemote: Starting...');
        this.log('syncRemote: apiProduct=' + this.apiProduct);
        this.log('syncRemote: sourceDir=' + sourceDir);
        this.log('syncRemote: options.syncRemote=' + options.syncRemote);

        if (options.syncRemote === false) {
            this.triggerDoxi[product] = true;
            return;
        }
        // don't attempt to sync folders other than those in "build/repos"
        if (!sourceDir.includes('build/repos')) {
            this.log('syncRemote: ------>>>>>> SKIP b/c !(build/repos)');
            return;
        }

        this.modifiedList = [];

        const path = Shell.pwd(),
            version = this.apiVersion,
            { toolkit } = options,
            wToolkit = version + '-' + (toolkit || product),
            prodCfg = options.products[product],
            { remotes, repo, remoteUrl } = prodCfg,
            verInfo = remotes && remotes[version],
            branch = verInfo && verInfo.branch || 'master',
            tag = verInfo && verInfo.tag,
            reposPath = options.localReposDir;

        let allRemotes = [],
            allRepos = [repo],
            { addlRepos = [], addlRemoteUrls = [] } = prodCfg;

        addlRepos = Utils.from(addlRepos);
        addlRemoteUrls = Utils.from(addlRemoteUrls);
        allRepos = allRepos.concat(addlRepos);

        allRemotes.push(
            Utils.format(remoteUrl, prodCfg)
        );

        addlRepos.forEach((val, i, arr) => {
            allRemotes.push(Utils.format(addlRemoteUrls[i] || arr[0], { repo: val }));
        });

        let allDirs = [sourceDir];

        addlRepos.forEach(repo => {
            allDirs.push(
                Path.join(Path.resolve(
                    _myRoot,
                    reposPath
                ), repo)
            );
        });

        // if the api source directory exists and is not a git repo then skip syncing
        if (Fs.existsSync(sourceDir) && !Git.isGitSync(sourceDir)) {
            this.log(`Sync Remote: Cannot perform remote Git sync: API source directory is not a Git repo: ${sourceDir}`, 'info');
            return;
        }

        // only sync to a remote if syncRemote is true
        // or the source dir is missing
        // or it's empty
        // or it's not empty, but this product has a target branch and the branch it's currently on doesn't match
        //if (options.syncRemote || !Fs.existsSync(sourceDir) || this.isEmpty(sourceDir) || (branch && branch !== Git.branchSync(sourceDir))) {
        // if the api source directory doesn't exist (may or may not be within the
        // repos directory) then create the repos directory and clone the remote
        allDirs.forEach((dir, i, arr) => {
            this.log('syncRemote: Processing git clone: ' + i + ' of ' + allDirs.length + '. dir=' + dir);

            if (!Fs.existsSync(dir)) {
                // create the repos directory if it doesn't exist already
                this.log('syncRemote: CreateReposOutputDir dir=' + dir);
                // TODO change dir to reposPath?
                var destinationPath = this.createReposOutputDir(dir);

                // change into the repos directory path
                Shell.cd(destinationPath);

                var pwd = Shell.pwd();
                this.log("syncRemote: pwd=" + pwd);

                let repo = allRepos[i],
                    remote = allRemotes[i];

                this.log('syncRemote: Cloning repo=' + repo);
                this.log('syncRemote: Cloning remote=' + remote);
                Shell.exec(`git clone --depth 1 ${remote}`);
            }
        });

        // cd into the repo directory and fetch all + tags
        Shell.cd(sourceDir);

        // find out if there are dirty or un-tracked files and if so skip syncing
        let status = Git.checkSync(sourceDir);

        // TODO reset to head - always use a clean slate
        if (status.dirty || status.untracked) {
            let modified = Shell.exec('git ls-files --m --o --exclude-standard', {
                silent: true
            }).stdout;

            // the files list is separated by \n as well as suffixed with \n so the
            // filter drops any empty / zero-length items
            modified = _.filter(modified.split('\n'), item => {
                return item.length;
            });
            this.modifiedList = this.modifiedList.concat(modified);

            this.triggerDoxi[product] = true;
            Shell.cd(path);
            this.log('syncRemote: Exiting.... API source directory has modified / un-tracked changes - skipping remote sync', 'info');
            return;
        }

        Shell.exec('git fetch --tags');

        if (options.syncRemote !== false) {
            // check out the branch used for this product / version
            this.log(`syncRemote: Checkout out main branch: ${branch}`);
            Shell.exec(`git checkout ${branch}`);

            // if there is a tag to use for this version then switch off of head over to the
            // tagged branch
            if (tag) {
                this.log(`syncRemote: Sync Remote: Checking out tagged version: ${tag}`);
                Shell.exec(`git checkout -b ${wToolkit} ${tag}`);
            }
        }

        // pull latest
        let pullResp = Shell.exec('git pull');

        // if pull updated the local repo then indicate that this product was synced
        if (!pullResp.stdout.includes('Already up-to-date')) {
            this.triggerDoxi[product] = true;
        }

        // get back to the original working directory
        Shell.cd(path);

        this.log('syncRemote: Ending...\n');
    }

    /**
     * Create a directory minus the last segment. 
     * The goal is to create the repos output directory.
     * @param {String} dir 
     */
    createReposOutputDir(dir) {
        var d = '';
        if (dir.indexOf(Path.sep) > -1) {
            var splitPath = dir.split(Path.sep);
            splitPath.pop();
            d = Path.join(Path.sep, ...splitPath);
        }

        if (!Fs.existsSync(d)) {
            Fs.mkdirsSync(d);
        }

        this.log('createReposOutputDir: Create dir=' + d);

        return d;
    }

    /**
     * Writes the since map to disc (the map of all classes / members and when they were 
     * introduced to the SDK)
     */
    outputSinceMap(sinceMap) {
        const { sinceMapPath } = this;

        Fs.outputJsonSync(sinceMapPath, sinceMap);
    }

    // FRAMEWORK CHOICE
    getWebComponentDeclaration(className, encode = true) {
      if (!className) {
        return null;
      }
      let classData = this.classMap[className];
      if (!classData) {
        return null;
      }

      let prepared = classData.prepared;
      if (!prepared) {
        return null;
      }
      

      let webComponent = null;
      if (prepared.alias && prepared.alias.includes('widget')) {
        
        let aliases = [];
        if (prepared.alias.includes(',')) {
          aliases = prepared.alias.split(',');
        } else {
          aliases.push(prepared.alias);
        }

        webComponent = '';
        aliases.forEach((alias) => {
          if (webComponent.length > 0) {
            webComponent += ' ';
          }


          let aLower = alias.replace('widget.', '').toLowerCase();
          aLower = aLower.replace('-', '_');
          let aCapped = aLower.charAt(0).toUpperCase() + aLower.slice(1);
  
          if (this.options.prodVerMeta.title == 'ExtAngular') {
            webComponent += `<Ext${aCapped}/>`;
          } else if (this.options.prodVerMeta.title == 'ExtReact') { 
            webComponent += `<Ext${aCapped}/>`;
          } else if (this.options.prodVerMeta.title == 'ExtWebComponents') { 
            webComponent += `<ext-${aLower}/>`;
          }
        });

        if (encode) {
          webComponent = entities.encode(webComponent);
        }
      }

      return webComponent;
    }
}

module.exports = Base;
