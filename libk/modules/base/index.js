/* jshint node: true */
'use strict';

const EventEmitter = require('events'),
      Debug        = require('../../Debug'),
      Worker       = require('tiny-worker'),
      Os           = require('os'),
      Path         = require('path'),
      CpuCount     = Os.cpus().length,
      Utils        = require('../shared/Utils'),
      Ora          = require('ora'),
      Chalk        = require('chalk'),
      Shell        = require('shelljs'),
      Fs           = require('fs-extra'),
      Mkdirp       = require('mkdirp'),
      marked       = require('sencha-marked'),
      safeLinkRe   = /(\[]|\.\.\.)/g,
      idRe         = /[^\w]+/g,
      Git          = require('git-state');

class Base {
    constructor (options) {
        let me = this;
        me.options = options;

        // init events - events help control the flow of the app
        me.emitter = new EventEmitter();

        // enable logging options using the project options / CLI param
        if (options.log) {
            me.enableLogging(options.log);
        }

        // a map of doxi member type group names to the format expected by the docs
        // post-processors
        me.memberTypesMap = {
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
        me.memberTypes = ['cfg', 'property', 'method', 'event', 'css_var-S', 'css_mixin'];
    }

    /**
     * Returns the resources directory used to house resource files for the apps
     * @return {String} the common resources directory (full) path
     */
    get resourcesDir () {
        return Path.join(this.outputProductDir, this.options.resourcesDir);
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
        return Fs.readdirSync(path).filter(function(item) {
            return Fs.statSync(Path.join(path, item)).isDirectory();
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
        return this.options.normalizedProductList[prod];
    }

    /**
     * Enables logging for the application
     * @param {Boolean/Object} level `true` to enable logging for all levels.  Else an
     * array containing one or more of the `log`, `info`, or `error` levels to enable.
     *
     * To enable `error` and `info`:
     *
     *     enableLogging(['error', 'info']);
     */
    enableLogging (level) {
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
     * **Note:** The message will only log out if the type passed is enabled by
     * {@link #enabeLogging}
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
        let me        = this,
            i         = 0,
            len       = items.length < CpuCount ? items.length : CpuCount,
            responses = [],
            //complete  = false,
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
            worker.onmessage = function (ev) {
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
                            callback.call(me, responses);
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
        endTime = endTime || new Date();
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
            text = status.text;

        status.text = append ? text += msg : msg;
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
     * Sets the current status to the passed `msg` text.  A timestamp is recorded in
     * order for {@link #closeStatus} to be able to display the elapsed time
     * @param {String} msg The status text to show
     */
    openStatus (msg) {
        let me = this;

        me._statusStamp = new Date();
        me.setStatus(msg);
    }

    /**
     * Concluded the active status with {@link #statusSuccess} or {@link #statusFail} and
     * appends the elapsed time since {@link #openStatus} was called
     * @param {Boolean} success `false` to call statusFail.  Defaults to `true`.
     */
    closeStatus (success) {
        let elapsed = this.getElapsed(this._statusStamp, new Date()),
            action = success === false ? 'statusFail' : 'statusSuccess';

        this[action]('    ' + Chalk.gray(elapsed), true);
    }

    /**
     * @method createLink
     * @param href
     * @param text
     */
    createLink (href, text) {
        // TODO not sure what link map does for us, yet.  Might have to re-add it later.
        //let linkmap = this.linkmap,
        let me = this,
            openExternal = '',
            hash, split;

        if (href.includes('#') && href.charAt(0) != '#') {
            split = href.split('#');
            href  = split[0];
            hash  = '#' + split[1];
        }

        if (!text) {
            text = href;
        }

        // TODO This is probably in here for a reason, but for now I can't figure out what linkmap does for us.  Might have to test on it at some point
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

        for (var i = 0; i < me.memberTypes.length; i++) {
            var item = me.memberTypes[i];

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
        return Path.resolve(__dirname, Path.join(relPrefix, outPath));
    }

    /**
     * Returns the directory name for the api docs output.  Will be the toolkit set on
     * the 'options' object if it exists else "api".
     * @return {String} The directory for API output
     */
    get apiDirName () {
        return this.options.toolkit || 'api';
    }

    /**
     *  Returns the full path of the ouput directory + product (+ version if applicable)
     * + api directory name
     * @return {String} The api files' output path
     */
    get apiDir () {
        return Path.join(this.outputProductDir, this.apiDirName);
    }

    /**
     * Converts the passed in markdown text to HTML markup
     * @param {String} text The markdown string to convert to HTML
     * @param {String} cls The API class being marked up (if applicable)
     * @return {String} The converted HTML text
     */
    markup (text, cls) {
        if (!text) {
            return '';
        }

        return marked(text, {
            addHeaderId: !cls ? false : function (text, level, raw) {
                return cls.name.toLowerCase().replace(idRe, '-') + '_' + raw.toLowerCase().replace(idRe, '-');
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
        let me        = this,
            str       = [],
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
                if (me.classMap[link]) {
                    str.push(me.createLink(link + '.html', item));
                // else just return the string back
                } else {
                    str.push(item);
                }
            }
        } else {
            let link = text.replace(safeLinkRe, '');

            // if the string is a class name in the classMap create a link from it
            if (me.classMap[link]) {
                str.push(me.createLink(link + '.html', text));
            // else just return the string back
            } else{
                str.push(text);
            }
        }

        // return the string of <a> links separated by the `joinWith` delimiter
        return str.join(joinWith);
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
        let me           = this,
            options      = me.options;

        // if the api source directory exists and is not a git repo then skip syncing
        if (Fs.existsSync(sourceDir) && !Git.isGitSync(sourceDir)) {
            me.log('Cannot perform remote Git sync: API source directory is not a Git repo', 'info');
            return;
        }

        // only sync to a remote if syncRemote is true
        if (options.syncRemote || !Fs.existsSync(sourceDir)) {
            let path      = Shell.pwd(),
                version   = options.version,
                wToolkit  = version + '-' + (options.toolkit || product),
                prodCfg   = options.products[product],
                remotes   = prodCfg.remotes,
                verInfo   = remotes && remotes[version],
                branch    = verInfo && verInfo.branch || 'master',
                tag       = verInfo && verInfo.tag,
                repo      = prodCfg.repo,
                remoteUrl = prodCfg.remoteUrl,
                reposPath = options.localReposDir,
                cmd       = 'sencha';

            // This is to determine if we're local or on TeamCity
            // TODO can these paths be improved to be less static?
            me.log("Checking for Sencha Cmd");
            if (Fs.existsSync('../../sencha-cmd')) {
                cmd = '../../../../../sencha-cmd/sencha';
            }

            // if the api source directory doesn't exist (may or may not be within the
            // repos directory) then create the repos directory and clone the remote
            if (!Fs.existsSync(sourceDir)) {
                // create the repos directory if it doesn't exist already
                Mkdirp.sync(reposPath);

                Shell.cd(reposPath);
                remoteUrl = Utils.format(remoteUrl, prodCfg);

                me.log('Repo not found.  Cloning repo: ' + repo);
                Shell.exec(`git clone ${remoteUrl}`);
            }

            // cd into the repo directory and fetch all + tags
            Shell.cd(sourceDir);

            // find out if there are dirty or untracked files and if so skip syncing
            let status = Git.checkSync(sourceDir);
            if (status.dirty || status.untracked) {
                me.log('API source directory has modified / untracked changes - skipping remote sync', 'info');
                return;
            }

            Shell.exec('git fetch --tags');

            // check out the branch used for this product / version
            me.log(`Checkout out main branch: ${branch}`);
            Shell.exec(`git checkout ${branch}`);
            // and pull latest
            // TODO is this step necessary?  Maybe when switching between versions on different runs of "read-source"?
            Shell.exec('git pull');

            // if there is a tag to use for this version then switch off of head over to the
            // tagged branch
            if (tag) {
                me.log(`Checking out tagged version: ${tag}`);
                Shell.exec(`git checkout -b ${wToolkit} ${tag}`);
            }

            // get back to the original working directory
            Shell.cd(path);
        }
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
    parseApiLinks (html) {
        html = html.replace(/\[{2}([a-z0-9.]+):([a-z0-9._\-#]+)\s?([a-z$\/'.()[\]\\_-\s]*)\]{2}/gim, (match, productVer, link, text) => {
            let hasHash       = link.indexOf('#'),
                hasDash       = link.indexOf('-'),
                canSplit      = !!(hasHash > -1 || hasDash > -1),
                splitIndex    = (hasHash > -1) ? hasHash                  : hasDash,
                className     = canSplit ? link.substring(0, splitIndex)  : link,
                hash          = canSplit ? link.substring(splitIndex + 1) : null,
                prodDelimiter = productVer.indexOf('-'),
                hasVersion    = prodDelimiter > -1,
                product       = hasVersion ? productVer.substring(0, prodDelimiter) : productVer,
                version       = hasVersion ? productVer.substr(prodDelimiter + 1)   : false,
                toolkit       = (product === 'classic' || product === 'modern') ? product : 'api',
                memberName;

            product = this.getProduct(product);

            // catches when a link is parsable, but does not contain a valid product to
            // point to.  Throw and error and just return the originally matched string.
            if (!product) {
                this.log(`The link ${match} does not contain a valid product`, 'error');
                return match;
            }

            // warn if the member is ambiguous - doesn't have a type specified
            if (hash) {
                let typeEval = /^(cfg-|property-|static-property-|method-|static-method-|event-|css_var-S-|css_mixin-)?([a-zA-Z0-9$-_]+)/.exec(hash);
                if (!typeEval[1]) {
                    this.log(`Ambiguous member name '${hash}'.  Consider adding a type to the URL`, 'info');
                }

            }

            return this.createApiLink(product, version, toolkit, className, memberName, text);
        });

        return html;
    }
}

module.exports = Base;
