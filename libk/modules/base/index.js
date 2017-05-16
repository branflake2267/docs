/* jshint node: true */
'use strict';

const EventEmitter    = require('events'),
      Debug           = require('../../Debug'),
      Worker          = require('tiny-worker'),
      Os              = require('os'),
      Path            = require('path'),
      CompareVersions = require('compare-versions'),
      CpuCount        = Os.cpus().length,
      Utils           = require('../shared/Utils'),
      Ora             = require('ora'),
      Chalk           = require('chalk'),
      Shell           = require('shelljs'),
      Play            = require('play'),
      Fs              = require('fs-extra'),
      Mkdirp          = require('mkdirp'),
      marked          = require('sencha-marked'),
      Git             = require('git-state'),
      Handlebars      = require('handlebars'),
      safeLinkRe      = /(\[]|\.\.\.)/g,
      idRe            = /[^\w]+/g,
      _               = require('lodash');

// TODO add this.log() stuff throughout all classes: `log` for general messaging, `info`
// for warnings, and `error` for serious / fatal errors
// TODO add status() endpoints for each section we want to show to users as the app runs
// TODO create a BuildApps class for running both the HTML and Ext builds (maybe
// controllable with CLI params)
class Base {
    constructor (options) {
        let root = options._myRoot,
            projectDefaults = Fs.readJsonSync(
                Path.join(root, 'configs/projectDefaults.json')
            ),
            appDefaults = Fs.readJsonSync(Path.join(root, 'configs/app.json'));

        //this.log(`Create 'Base' instance`, 'info');

        // merge in the project defaults, then the app defaults, then finally the CLI
        // args
        options = Object.assign({}, projectDefaults, appDefaults, options);

        this.options = options;

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
            configs            : "cfg",
            properties         : "property",
            methods            : "method",
            events             : "event",
            vars               : "var",
            "sass-mixins"      : "method",
            "static-methods"   : "static-method",
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

        this.registerHandlebarsPartials();
        this.registerHandlebarsHelpers();
    }

    /**
     * Initializes the parent chain array of all module ancestry by file name
     * @return {String[]} This module's file name (in an array).
     */
    get parentChain () {
        return [Path.parse(__dirname).base];
    }

    /**
     * Returns the folder node class used for tree navigation
     * @return {String} The navigation tree's folder node class
     */
    get folderNodeCls () {
        //return 'fa fa-folder-o dib w1 mr1 ml1';
        return 'fa fa-folder-o';
    }

    /**
     * Returns the resources directory used to house resource files for the apps
     * @return {String} the common resources directory (full) path
     */
    get resourcesDir () {
        return Path.join(this.outputProductDir, this.options.resourcesDir);
    }

    /**
     * The directory where assets like images, js, and CSS files should be copied to in a
     * build
     * @return {String} The full path to the output assets directory
     */
    get assetsDir () {
        let dir = this._assetsDir;

        if (!dir) {
            let options   = this.options,
                assetsDir = options.assetsDir,
                formatted = Utils.format(assetsDir, options);

            dir = this._assetsDir = options.assetsDir = Path.join(options._myRoot, formatted);
        }

        return dir;
    }

    /**
     * The directory where CSS assets should be copied to in a build
     * @return {String} The full path to the output CSS directory
     */
    get cssDir () {
        let dir = this._cssDir;

        if (!dir) {
            let assetsDir = this.assetsDir,
                options   = this.options,
                cssDir    = Utils.format(options.cssDir, options);

            dir = this._cssDir = options.cssDir = Path.resolve(options._myRoot, cssDir);
        }

        return dir;
    }

    /**
     * The directory where JS assets should be copied to in a build
     * @return {String} The full path to the output JS directory
     */
    get jsDir () {
        let dir = this._jsDir;

        if (!dir) {
            let assetsDir = this.assetsDir,
                options   = this.options,
                jsDir    = Utils.format(options.jsDir, options);

            dir = this._jsDir = options.jsDir = Path.resolve(options._myRoot, jsDir);
        }

        return dir;
    }

    /**
     * The directory where image assets should be copied to in a build
     * @return {String} The full path to the output images directory
     */
    get imagesDir () {
        let dir = this._imagesDir;

        if (!dir) {
            let assetsDir = this.assetsDir,
                options   = this.options,
                imagesDir    = Utils.format(options.imagesDir, options);

            dir = this._imagesDir = options.imagesDir = Path.resolve(options._myRoot, imagesDir);
        }

        return dir;
    }

    /**
     *
     */
    get uniqueId () {
        if (!this._rollingId) {
            this._rollingId = 0;
        }
        return `s-${this._rollingId++}`;
    }

    /**
     * The partial to use as the help page content
     * @return {String} The name of the partial file to use as the docs help content
     */
    get helpPartial () {
        return '_help';
    }

    /**
     * Returns common metadata needed by app pages
     * @return {Object} Hash of common current page metadata
     */
    getCommonMetaData () {
        let options     = this.options,
            prodVerMeta = options.prodVerMeta,
            meta        = Object.assign({}, options.prodVerMeta),
            product     = this.getProduct(options.product);

        return Object.assign(meta, {
            version    : options.version,
            pageType   : 'common',
            product    : product,
            apiProduct : this.apiProduct,
            apiVersion : this.apiVersion,
            title      : meta.title,
            toolkit    : prodVerMeta.hasToolkits && options.toolkit,
            exceptions : options.buildExceptions
        });
    }

    /**
     * Checks to see if a directory is empty
     * @param {String} dir The directory to check
     * @return {Boolean} True if the directory is empty
     */
    isEmpty (dir) {
        let files = Fs.readdirSync(dir);
        files = this.getFilteredFiles(files);

        return files.length === 0;
    }


    /**
     * Prepares common data attributes
     * @param {Object} data The object to be processed / changed / added to before
     * supplying it to the template
     */
    processCommonDataObject (data) {
        let options     = this.options,
            prodVerMeta = options.prodVerMeta,
            dt          = new Date();

        data.title       = prodVerMeta.prodObj.title;
        data.product     = this.getProduct(options.product);
        data.hasGuides   = prodVerMeta.hasGuides;
        data.hasApi      = prodVerMeta.hasApi;
        data.version     = options.version;
        data.moduleName  = this.moduleName;
        data.helpPartial = this.helpPartial;
        data.date = dt.toLocaleString("en-us",{month:"long"}) + ", " + dt.getDate() + " " + dt.getFullYear() + " at " + dt.getHours() + ":" + dt.getMinutes();
    }

    /**
     * Filters out any system files (i.e. .DS_Store)
     * @param {String[]} files Array of file names
     * @return [String[]] Array of file names minus system files
     */
    getFilteredFiles (files) {
        return files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
    }

    /**
     * Get all files from the passed directory / path
     * @param {String} path The path of the directory that all files should be returned
     * from
     * @return {String[]} Array of file names from the source directory
     */
    getFiles (path) {
        // filter out system files and only return files (filter out directories)
        return this.getFilteredFiles(Fs.readdirSync(path)).filter(function(file) {
            return Fs.statSync(Path.join(path, file)).isFile();
        });
    }

    /**
     * Returns all directories from a path / directory (system files will be filtered
     * out)
     * @param {String} path The path of the directory that all child directories should
     * be returned from
     * @return {String[]} Array of directory names
     */
    getDirs (path) {
        return this.getFilteredFiles(Fs.readdirSync(path)).filter(function(item) {
            return Fs.statSync(Path.join(path, item)).isDirectory();
        });
    }

    /**
     * Filter out only the handlebars partial files from a list of files (those that have
     * a file name that starts with an underscore)
     * @param {String[]} files Array of file names to filter
     * @return {String[]} The array of filtered file names
     */
    getPartials (files) {
        return files.filter((file) => {
            return file.charAt(0) === '_';
        });
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
        prod = prod || this.options.product;
        return this.options.normalizedProductList[prod];
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
    getFileByVersion (path, version, delimiter) {
        delimiter = delimiter || '-';

        let files        = this.getFiles(path),
            len          = files.length,
            delimiterLen = delimiter.length,
            matchingFile;

        // if there is only one file just return it
        if (len === 1) {
            matchingFile = files[0];
        } else {
            // else we'll loop over the files to find the one that is closest to the
            // passed version without going over
            let i      = 0,
                cfgVer = '0';

            for (; i < len; i++) {
                let file = files[i],
                    name = Path.parse(files[i]).name,
                    v    = name.substring(name.indexOf('-') + delimiterLen);

                if (CompareVersions(v, version) <= 0 && CompareVersions(v, cfgVer) > 0) {
                    cfgVer       = v;
                    matchingFile = file;
                }
            }
        }

        return matchingFile;
    }

    /**
     * The handlebars template for HTML output
     * @return {Object} The compiled handlebars template
     */
    get mainTemplate () {
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
     * Register all handlebars partials from the templates directory
     */
    registerHandlebarsPartials () {
        //this.log(`Begin 'Base.registerHandlebarsPartials'`, 'info');
        let templateDir = Path.join(this.options._myRoot, 'templates'),
            files       = this.getPartials(this.getFiles(templateDir)),
            len         = files.length,
            i           = 0;

        for (; i < len; i++) {
            let fileName = files[i],
                partialPath = Path.join(templateDir, fileName),
                partialName = Path.parse(partialPath).name;

            this.registerPartial(partialName, partialPath);
        }
    }

    /**
     * Registers the handlebars partial using the passed name and path
     * @param {String} partialName The name to register the partial with
     * @param {String} partialPath The path of the handlebars file to register as a
     * partial template
     */
    registerPartial (partialName, partialPath) {
        let template = Fs.readFileSync(partialPath, 'utf8');

        Handlebars.registerPartial(partialName, template);
    }

    /**
     * Register all handlebars helpers
     */
    registerHandlebarsHelpers () {
        //this.log(`Begin 'Base.registerHandlebarsHelpers'`, 'info');
        // The `json` helper stringifies a Javascript object.  Helpful when you want to
        // pass a hash of information directly to a handlebars template.
        Handlebars.registerHelper('json', function(context) {
            return JSON.stringify(context);
        });

        // The 'bubbleWrap' helper is used by the home template partial.  With the home
        // template there are n number of items and every two (and any trailing odd one)
        // need to be wrapped by an element in the template.  This helper will decorate
        // each item saying whether it should have the wrapping element begun, ended, or
        // both
        Handlebars.registerHelper("bubbleWrap", function(arr, options) {
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
    enableLogging (level) {
        //this.log(`Begin 'Base.enableLogging'`, 'info');
        level = Utils.from(level);
        let all, log, info, error;

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
        let i   = 0,
            len = level.length;

        // enable every option passed in
        for (; i < len; i++) {
            Debug.enable(level[i]);
        }
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
    log (msg, type) {
        type = type || 'log';

        if (this.status.active) {
            this.statusStopAndPersist();
        }

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
    processQueue (items, mod, callback) {
        let i         = 0,
            len       = items.length < CpuCount ? items.length : CpuCount,
            responses = [],
            workers   = [];

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
     * Convenience error logging method
     * @param {String/Object} err The error instance or error string to wrap as an error
     * instance
     */
    error (err) {
        if (!(err instanceof Error)) {
            err = new Error(err);
        }
        this.log(err, 'error');
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
    getElapsed (startTime, endTime) {
        endTime     = endTime || new Date();
        let elapsed = new Date(endTime - startTime),
            minutes = elapsed.getMinutes(),
            seconds = elapsed.getSeconds(),
            ms      = elapsed.getMilliseconds(),
            ret     = [];

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
    addCls (html, tags, cls) {
        // create a string from an array of class strings is possible
        //cls  = cls && Array.isArray(cls) ? cls.join(' ') : cls;
        // if tags is a string then wrap it in an array
        tags = Utils.isString(tags) ? Utils.from(tags) : tags;

        let len = tags.length,
            i   = 0;

        // if tags is not already an object create one with the tags as keys and the cls
        // as the class to add to the element
        if (!Utils.isObject(tags)) {
            let temp = {};
            for (; i < len; i++) {
                let tag   = tags[i];
                temp[tag] = cls;
            }
            tags = temp;
        }

        let tagNames = Object.keys(tags);
        len = tagNames.length;
        i   = 0;

        // loop over all of the tags and add the specified class / classes to them
        for (; i < len; i++) {
            let tag      = tagNames[i],
                //reString = `(<${tag}(?!.*class)[^>]*?)(>[\\s\\S]*?<\/${tag}>)|(<${tag}.*?class=["']?.*?)(["']?[^>]*?>[\\s\\S]*?<\/${tag}>)`,
                reString = `(<${tag}(?![^>]*class)[^>]*?)(>)|(<${tag}[^>]*?class=["']?.*?)(["']?[^>]*?>)`,
                re       = new RegExp(reString, 'gim');

            cls = tags[tag];
            // create a string from an array of class strings is possible
            cls  = cls && Array.isArray(cls) ? cls.join(' ') : cls;

            html = html.replace(re, (match, p1, p2, p3, p4) => {
                let pre      = p1 || p3,
                    post     = p2 || p4,
                    classStr = p1 ? ` class="${cls}"` : ` ${cls} `;

                return `${pre}${classStr}${post}`;
            });
        }

        return html;
    }

    /**
     * Get, or create if not yet created, the status instance
     * @return {Object} The status instance used by the app
     */
    get status () {
        let status = this._status;

        if (!status) {
            status = this._status = Ora({
                spinner: 'star'
            });
            status.start();
        }

        return status;
    }

    /**
     * Set or append the current status text
     * @param {String} msg The status text to show (or append)
     * @param {Boolean} append `true` to append the passed `msg` to the current status
     * text
     * @return {Object} Returns the status instance
     */
    setStatus (msg, append) {
        let status = this.status,
            text   = status.text;

        status.text = append ? (text += msg) : msg;
        status.render();
        status.active = true;
        return status;
    }

    /**
     * Concludes the current active status line by checkmarking it
     * @param {String} msg The status text to show (or append)
     * @param {Boolean} append `true` to append the passed `msg` to the current status
     * text
     */
    statusSuccess (msg, append) {
        if (msg) {
            this.setStatus(msg, append);
        }
        this.status.succeed();
        // sets active to false for use by {@link #log}
        this.status.active = false;
    }

    /**
     * Concludes the current active status line with an "x" preceding the status
     * @param {String} msg The status text to show (or append)
     * @param {Boolean} append `true` to append the passed `msg` to the current status
     * text
     */
    statusFail (msg, append) {
        if (msg) {
            this.setStatus(msg, append);
        }
        this.status.fail();
        // sets active to false for use by {@link #log}
        this.status.active = false;
    }

    /**
     * Concludes the current active status and removed the spinner (wait indicator)
     */
    statusStopAndPersist () {
        this.status.stopAndPersist();
        // sets active to false for use by {@link #log}
        this.status.active = false;
    }

    /**
     * Sets the current status to the passed `msg` text.  A time stamp is recorded in
     * order for {@link #closeStatus} to be able to display the elapsed time
     * @param {String} msg The status text to show
     */
    openStatus (msg) {
        this._statusStamp = new Date();
        this.setStatus(msg);
    }

    /**
     * Concluded the active status with {@link #statusSuccess} or {@link #statusFail} and
     * appends the elapsed time since {@link #openStatus} was called
     * @param {Boolean} success `false` to call statusFail.  Defaults to `true`.
     */
    closeStatus (success) {
        let elapsed = this.getElapsed(this._statusStamp, new Date()),
            action  = success === false ? 'statusFail' : 'statusSuccess';

        this[action]('    ' + Chalk.gray(elapsed), true);
    }

    /**
     * Performs and cleanup / status as the build concludes
     */
    concludeBuild () {
        //this.log(`Begin 'Base.concludeBuild'`, 'info');
        let options = this.options;

        // TODO see about replacing this with a closeStatus() call instead once we have
        // the process populated with statuses
        if (!options.production && options.audioAlert === true) {
            Play.sound('./assets/audio/jobsdone.m4a');
        }

        this.closeStatus();
    }

    /**
     * @method createLink
     * @param href
     * @param text
     */
    createLink (href, text) {
        // TODO not sure what link map does for us, yet.  Might have to re-add it later.
        //let linkmap = this.linkmap,
        let openExternal = '',
            hash, split;

        if (href.includes('#') && href.charAt(0) != '#') {
            split = href.split('#');
            href  = split[0];
            hash  = '#' + split[1];
        }

        if (!text) {
            text = href;
        }

        // TODO This is probably in here for a reason, but for now I can't figure out
        // TODO what linkmap does for us.  Might have to test on it at some point
        /*for (var i = 0; i < linkmap.length; i++) {
            var item = linkmap[i];

            if (href === item['c']) {
                href = item['f'];
            }
        }*/

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
            //TODO external-link is being concated with blue, to make blueexternal-link
            //Need to not do that, and have blue external-link instead.
            openExternal = "class='external-link' target='_blank' ";
        }

        return "<a " + openExternal + "href='" + href + "'>" + text + "</a>";
    }

    /**
     * Returns the downloads / offline docs dir
     */
    get offlineDocsDir () {
        let options    = this.options,
            offlineDir = Utils.format(options.offlineDocsDir, options);

        return Path.resolve(options._myRoot, offlineDir);
    }

    /**
     * Returns the full path of the output directory + the product name (and version if
     * applicable).
     * @return {String} The full output directory path
     */
    get outputProductDir () {
        // TODO cache this and all the other applicable static getters
        let options     = this.options,
            product     = options.product,
            outPath     = Utils.format(options.outputProductDir, options),
            hasVersions = options.products[product].hasVersions,
            relPrefix   = Path.relative(__dirname, options._myRoot);

        if (hasVersions) {
            outPath = Path.join(outPath, options.version);
        }

        return Path.resolve(
            __dirname,
            Path.join(
                relPrefix,
                outPath
            )
        );
    }

    /**
     * Returns the directory name for the api docs output.  Will be the toolkit set on
     * the 'options' object if it exists else "api".
     * @return {String} The directory for API output
     */
    get apiDirName () {
        // ** NOTE ** Do not cache since the options.toolkit may be changed between builds
        return this.options.toolkit || 'api';
        //return this.options.prodVerMeta.toolkit || 'api';
    }

    /**
     *  Returns the full path of the output directory + product (+ version if applicable)
     * + api directory name
     * @return {String} The api files' output path
     */
    get apiDir () {
        // ** NOTE ** Do not cache since the apiDirName may be changed between toolkits
        return Path.join(this.outputProductDir, this.apiDirName);
    }

    /**
     * Ensures that a directory exists and if not then it's created (mkdirp-style)
     * @param {String} path The directory path to ensure / create
     * @return {Object} A Promise that resolves once the directory is found / created
     */
    ensureDir (path) {
        return new Promise((resolve, reject) => {
            Fs.ensureDir(path, (err) => {
                if (!err) {
                    resolve(true);
                }
            });
        }).catch(this.error.bind(this));
    }

    /**
     * @method makeID
     * Returns a string that has spaces, special characters, and slashes replaced
     * for id use.
     * @param {String} id The element id to normalize
     * @param {String} name The element text node
     * @returns {String} The modified id
     */
    makeID (id, name) {
        return id.replace("/", "-_-") + "_-_" + name.replace(/[^\w]+/g, "_").toLowerCase();
    }

    /**
     * Converts the passed in markdown text to HTML markup
     * @param {String} text The markdown string to convert to HTML
     * @param {String} cls The API class being marked up (if applicable)
     * @return {String} The converted HTML text
     */
    markup (text, cls) {
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
    splitInline (text, joinStr) {
        if (!text) {
            return '';
        }

        // replace pipes with slash
        text.replace(/\|/, '/');
        let str       = [],
            // set the delimiter based on what is found in the `text` string
            delimiter = text.includes(',') ? ',' : (text.includes('/') ? '/' : ','),
            // and we'll rejoin the links afterwards with the delimiter found unless one
            // is passed in
            joinWith  = joinStr || delimiter;

        // create links to the associated class (if found) from each item in the `text`
        // TODO not sure if the if > else is required here, but don't want to remove this before I can test with real output
        if (text && text.includes(delimiter)) {
            text = text.split(delimiter);

            for (var i = 0; i < text.length; i++) {
                let item = text[i],
                    link = item.replace(safeLinkRe, '');

                // if the string is a class name in the classMap create a link from it
                if (this.classMap[link]) {
                    str.push(this.createLink(link + '.html', item));
                // else just return the string back
                } else {
                    str.push(item);
                }
            }
        } else {
            let link = text.replace(safeLinkRe, '');

            // if the string is a class name in the classMap create a link from it
            if (this.classMap[link]) {
                str.push(this.createLink(link + '.html', text));
            // else just return the string back
            } else{
                str.push(text);
            }
        }

        // return the string of <a> links separated by the `joinWith` delimiter
        return str.join(joinWith);
    }

    /**
     * Return Cmd path to use
     * @return {String} The command or path/command used to run Sencha Cmd
     */
    getCmdPath () {
        let keyword = 'sencha',
            path = this.options.cmdPath;

        // if the cmd path is not passed in then look for it on the path.
        if (!path) {
            // if 'sencha' is on the PATH use that
            if (Shell.which(keyword)) {
                path = keyword;
            } else {
                // else thrown an error
                throw 'Sencha Cmd not found.  Please install Sencha Cmd.';
            }
        } else {
            // join the 'sencha' keyword with teh passed path
            path = Path.join(path, keyword);
        }

        return path;
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
    syncRemote (product, sourceDir) {
        //this.log(`Begin 'Base.syncRemote'`, 'info');
        let options = this.options;

        if (options.syncRemote === false) {
            return;
        }

        this.modifiedList = [];

        let path      = Shell.pwd(),
            version   = this.apiVersion,
            toolkit   = options.toolkit,
            wToolkit  = version + '-' + (toolkit || product),
            prodCfg   = options.products[product],
            remotes   = prodCfg.remotes,
            verInfo   = remotes && remotes[version],
            branch    = verInfo && verInfo.branch || 'master',
            tag       = verInfo && verInfo.tag,
            repo      = prodCfg.repo,
            remoteUrl = prodCfg.remoteUrl,
            reposPath = options.localReposDir;

        // if the api source directory exists and is not a git repo then skip syncing
        if (Fs.existsSync(sourceDir) && !Git.isGitSync(sourceDir)) {
            this.log(`Cannot perform remote Git sync: API source directory is not a Git repo: ${sourceDir}`, 'info');
            return;
        }

        // only sync to a remote if syncRemote is true
        // or the source dir is missing
        // or it's empty
        // or it's not empty, but this product has a target branch and the branch it's currently on doesn't match
        //if (options.syncRemote || !Fs.existsSync(sourceDir) || this.isEmpty(sourceDir) || (branch && branch !== Git.branchSync(sourceDir))) {
            // if the api source directory doesn't exist (may or may not be within the
            // repos directory) then create the repos directory and clone the remote
            if (!Fs.existsSync(sourceDir)) {
                // create the repos directory if it doesn't exist already
                Mkdirp.sync(reposPath);
                Shell.cd(reposPath);
                remoteUrl = Utils.format(remoteUrl, prodCfg);

                this.log('Repo not found.  Cloning repo: ' + repo);
                Shell.exec(`git clone ${remoteUrl}`);
            }

            // cd into the repo directory and fetch all + tags
            Shell.cd(sourceDir);

            // find out if there are dirty or un-tracked files and if so skip syncing
            let status = Git.checkSync(sourceDir);

            if (status.dirty || status.untracked) {
                let modified = Shell.exec('git ls-files --m --o --exclude-standard', {
                    silent : true
                }).stdout;

                // the files list is separated by \n as well as suffixed with \n so the
                // filter drops any empty / zero-length items
                modified = _.filter(modified.split('\n'), item => {
                    return item.length;
                });
                this.modifiedList = this.modifiedList.concat(modified);

                this.triggerDoxi[product] = true;
                Shell.cd(path);
                this.log('API source directory has modified / un-tracked changes - skipping remote sync', 'info');
                return;
            }

            Shell.exec('git fetch --tags');

            if (options.syncRemote !== false) {
                // check out the branch used for this product / version
                this.log(`Checkout out main branch: ${branch}`);
                Shell.exec(`git checkout ${branch}`);

                // if there is a tag to use for this version then switch off of head over to the
                // tagged branch
                if (tag) {
                    this.log(`Checking out tagged version: ${tag}`);
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
        //}
    }
}

module.exports = Base;
