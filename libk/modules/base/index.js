'use strict';

/**
 * enable logging
 * log out
 * all the status methods
 * processQueue for multi-thread stuff
 *
 */

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
      Fs           = require('fs'),
      Mkdirp       = require('mkdirp'),
      marked       = require('sencha-marked'),
      safeLinkRe   = /(\[]|\.\.\.)/g,
      idRe         = /[^\w]+/g;

class Base {
    constructor (options) {
        let me = this;
        me.options = options;

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

        me.memberTypes = ['cfg', 'property', 'method', 'event', 'css_var-S', 'css_mixin'];
    }

    /**
     *
     */
    get resourcesDir () {
        return Path.join(this.outputDir, this.options.resourcesDir);
    }

    getFilteredFiles (files) {
        return files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
    }

    /**
     *
     */
    getFiles (path) {
        return this.getFilteredFiles(Fs.readdirSync(path)).filter(function(file) {
            return Fs.statSync(Path.join(path, file)).isFile();
        });;
    }

    /**
     *
     */
    getDirs (path) {
        return Fs.readdirSync(path).filter(function(item) {
            return Fs.statSync(Path.join(path, item)).isDirectory();
        });;
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
     *
     */
    get outputDir () {
        // TODO cache this and all the other static getters
        let options     = this.options,
            product     = options.product,
            outPath     = Utils.format(options.outputDir, options),
            hasVersions = options.products[product].hasVersions,
            relPrefix   = Path.relative(__dirname, options._myRoot);

        if (hasVersions) {
            outPath = Path.join(outPath, options.version);
        }
        return Path.join(relPrefix, outPath);
    }

    /**
     *
     */
    get apiDirName () {
        let options = this.options,
            product = options.product,
            hasVersions = options.products[product].hasVersions;

        return hasVersions ? options.toolkit : 'api';
    }

    /**
     *
     */
    get apiDir () {
        return Path.join(this.outputDir, this.apiDirName);
    }

    /**
     *
     */
    get resourcesDir () {
        return Path.join(this.outputDir, this.options.resourcesDir);
    }

    /**
     *
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
     *
     */
    splitInline (text, joinStr) {
        if (!text) {
            return '';
        }

        text.replace(/\|/, '/');
        let me = this,
            str = [],
            delimiter = text.includes(',') ? ',' : (text.includes('/') ? '/' : ','),
            joinWith = joinStr || delimiter;

        if (text && text.includes(delimiter)) {
            text = text.split(delimiter);

            for (var i = 0; i < text.length; i++) {
                var item = text[i];

                let link = item.replace(safeLinkRe, '');

                if (me.classMap[link]) {
                    str.push(me.createLink(link + '.html', item));
                } else {
                    str.push(item);
                }
            }
        } else {
            let link = text.replace(safeLinkRe, '');

            if (me.classMap[link]) {
                str.push(me.createLink(link + '.html', text));
            } else{
                str.push(text);
            }
        }

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
     */
    syncRemote (product) {
        let me      = this,
            options = me.options;

        if (options.forceSyncRemote) {
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
                // TODO make the reposPath configurable in the app.json and CLI params
                reposPath = '../localRepos',
                cmd       = 'sencha';

            // This is to determine if we're local or on TeamCity
            me.log("Checking for Sencha Cmd");
            if (Fs.existsSync('../../sencha-cmd')) {
                cmd = '../../../../../sencha-cmd/sencha';
            }

            Mkdirp.sync(reposPath);
            Shell.cd(reposPath);

            me.log('Checking for "' + Path.join(reposPath, repo) + '" folder');
            // if the target repo for this product doesn't exist then clone it
            if (!Fs.existsSync(repo)) {
                // format the git URL to use when cloning a remote repo
                remoteUrl = Utils.format(remoteUrl, prodCfg);

                me.log('Repo not found.  Cloning repo: ' + repo);
                Shell.exec('git clone ' + remoteUrl);
            }

            // cd into the repo directory and fetch all + tags
            Shell.cd(repo);
            Shell.exec('git fetch --tags');

            // check out the branch used for this product / version
            me.log('Checkout out main branch: ' + branch);
            Shell.exec('git checkout ' + branch);
            // and pull latest
            // TODO is this step necessary?  Maybe when switching between versions on different runs of "read-source"?
            Shell.exec('git pull');

            // if there is a tag to use for this version then switch off of head over to the
            // tagged branch
            if (tag) {
                me.log('Checking out tagged version: ' + tag);
                Shell.exec('git checkout -b ' + wToolkit + ' ' + tag);
            }

            Shell.cd(path);
        }
    }
}

module.exports = Base;
