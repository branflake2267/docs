'use strict';

const fs         = require('fs');
const path       = require('path');
const debug      = require('../../Debug');
const junk       = require('junk');
const Utils      = require('../shared/Utils');
const handlebars = require('handlebars');
const wrench     = require('wrench');
const mkdirp     = require('mkdirp');
const compressor = require('node-minify');
const shell      = require('shelljs');
const marked     = require('sencha-marked');

const hashStartRe = /^#/;
const linkRe      = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;
const imgRe       = /{\s*@img(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;

var internalId = 0;

class Base {
    constructor (options) {
        let me = this,
            parser = me.constructor.name,
            configs, baseOptions;

        // try fetching the config file using the config option passed in the CLI
        try {
            configs = require('../../configs/' + options.config);
        // if it's not found then kick out an error and stop here
        } catch(e) {
            me.log('error', 'You must pass the "--config" options for the product you are building for (i.e. --config=classic to process ExtJS classic)');

            if (!options.old && !options.new) {
                process.exit(1);
            }
        }

        // remove 'undefined' config options so they don't stomp the actual config value
        Utils.each(options, function (key, value) {
            if (value === undefined) {
                delete options[key];
            }
        });

        if (configs) {
            let name, type, value;

            for (name in configs) {
                type  = null;
                value = configs[name];

                if (typeof value === 'object' && (value.type || value.value)) {
                    type  = value.type;
                    value = value.value;
                }

                if (options[name] === undefined) {
                    //default option is not present in the options passed
                    if (type && Utils[type]) {
                        //parse the default option
                        value = Utils[type](value);
                    }

                    options[name] = value;
                } else if (type && Utils[type]) {
                    //parse the option that was passed
                    options[name] = Utils[type](options[name]);
                }
            }
        }

        let defaultCfg = require('../../configs/defaultCfg.json');
        me.options = Object.assign(configs, options);
        me.options = Object.assign(defaultCfg, me.options);
        Object.assign(me, me.options);

        me.extl = __dirname + '/../base/js/ExtL.js';
        me.treeview = __dirname + '/../base/js/treeview.js';
        me.logging = {
            info: true,
            error: true
        };

        // -skip=true will skip downloading the product source from the git repo
        if (options.skip != true) {
            if (parser == 'Source' || options.needsSDK === true) {
                me.reconcileRepos(options, false);
            }
        }

        me.numberVer = me.getProductVersion(me.version);
    }

    /**
     *
     */
    get productTree () {
        let map = this._productTree;

        if (!map) {
            map = this._productTree = require('../base/product-map');
        }

        return map;
    }

    /**
     *
     */
    get projectConfigs () {
        let pc = this._projectConfigs;

        if (!pc) {
            pc = this._projectConfigs = require('../../configs/projectConfigs');
        }

        return pc;
    }

    /**
     * Returns a list of file names in the input directory (doxi output class files)
     */
    get classNames () {
        let files = this._classNames;

        if (!files) {
            let initialFiles = fs.readdirSync(this.input);

            files = [];

            initialFiles.forEach(function (file) {
                if (junk.not(file) && !file.includes('_all-classes')) {
                    let name = file.replace('.json', '');
                    files.push(name);
                }
            });
            this._classNames = files;
        }

        return files;
    }

    /**
     *
     */
    get classMap () {
        let me = this,
            classes = me.classNames,
            classesRaw = me._classesRaw;

        if (!classesRaw) {
            let input = me.input,
                map = {};

            if (classes) {
                classes.forEach(function(name) {
                    me.log('info', 'Reading: ' + name + '.json');

                    map[name] = require('../../' + input + name + '.json');
                });

                classesRaw = me._classesRaw = map;
            }
        }

        return classesRaw;
    }

    /**
     *
     */
    get hasVersions () {
        let projectConfigs = this.projectConfigs;

        return projectConfigs.productIndex[projectConfigs.normalizedProductList[this.config]].hasVersions;
    }

    /**
     *
     */
    get version () {
        return this.pversion;
    }

    /**
     *
     */
    get product () {
        return this.projectConfigs.normalizedProductList[this.config];
    }

    /**
     *
     */
    get toolkit () {
        let me = this,
            v = this.version,
            dash = v.indexOf('-'),
            productIndex = this.projectConfigs.productIndex[this.product],
            toolkits = productIndex.toolkits,
            hasToolkit = toolkits && toolkits.indexOf(this.getProductVersion(this.version)[0]) > -1;

        return (hasToolkit && dash > -1) ? v.substr(dash + 1) : false;
    }

    getProductVersion (pversion) {
        let ver = pversion ? pversion.split("-")[0] : pversion;

        return ver;
    }

    parseLink (node, link) {
        node.link = node.preparedHref = link;
    }

    /**
     *
     */
    prependHrefPath (tree, pathPrefix) {
        let me = this;
        Utils.each(tree, function (item) {
            let myPath;

            if (item.name === 'Ext' || item.name === 'ST') {
                item.type = 'singleton';
            }
            if ((item.href && !item.children) || (item.href && item.type === 'singleton') || (item.href=== '')) {
                myPath = path.relative(pathPrefix, item.pathPrefix || me.destination);
                item.preparedHref = (Utils.isEmpty(myPath) ? '.' : myPath) + '/' + item.href;
                if ((item.preparedHref.substr(item.preparedHref.length - 5) !== '.html') && item.href != '') {
                    item.preparedHref = item.preparedHref + '.html';
                }
            }
            if (item.children) {
                me.prependHrefPath(item.children, pathPrefix);
            }
            if (item.compound && item.toolkits.length) {
                me.prependHrefPath(item.toolkits, pathPrefix);
            }
        });
    }

    /**
     *
     */
    processText (item) {
        let me = this;

        if (item.text) {
            item.text = item.text.replace(imgRe, function(match, img) {
                return "<img src='images/"+ img +"'/>";
            });

            item.text = item.text.replace(linkRe, function(match, link, text) {
                link = link.replace('!','-');

                if (!text) {
                    text = link;
                }

                return me.createLink(link, text.replace(hashStartRe, ''));
            });
        }

        if (item.items) {
            item.items.forEach(function (sub) {
                me.processText(sub);
            });
        }
    }

    /**
     * Create, checkout, pull, from git repositories
     */
    reconcileRepos(options, cleanup) {
        let me = this,
            projects = me.projectConfigs.products,
            pver  = options.pversion,
            configs;

        if (pver) {
            projects.forEach(function (project) {
                project.versions.forEach(function (pversion) {
                    if (pversion.version == pver) {
                        let path = shell.pwd(),
                            repo = '../modules/' + project.repo,
                            pver = pversion.version,
                            cmd  = 'sencha';

                        if (cleanup) {
                            console.log("Deleting temporary branch and returning to the appropriate state");
                            shell.cd(repo);
                            shell.exec('git checkout ' + pversion.branch);
                            shell.exec('git branch -d ' + pver);
                            shell.cd('../../lib/');
                            return;
                        }

                        // This is to determine if we're local or on TeamCity
                        me.log('info', "Checking for Sencha Cmd");
                        if (fs.existsSync('../../sencha-cmd')) {
                            cmd = '../../../../../sencha-cmd/sencha';
                        }

                        me.log('info', "Checking for modules folder" );
                        if (!fs.existsSync('../modules')) {
                            me.log('info', "Modules folder not found.  Creating '../modules'");
                            shell.mkdir('../modules');
                        }

                        me.log('info', "Changing directory to ../modules" );
                        shell.cd('../modules');

                        me.log('info', "Checking for sencha guides repo" );
                        if (!fs.existsSync("guides")) {
                            me.log('info', "Repo not found.  Cloning Sencha Documentation");
                            shell.exec('git clone git@github.com:sencha/guides.git');
                        }

                        me.log('info', "Changing Directories to guides");
                        shell.cd("guides");
                        
                        me.log('info', "Displaying current location/directory information");
                        shell.exec('ls');
                        
                        shell.exec('git pull');
                        shell.cd("../");

                        me.log('info', "Checking for repo" );
                        if (!fs.existsSync(project.repo)) {
                            me.log('info', "Repo not found.  Cloning " + repo );
                            shell.exec('git clone ' + pversion.rurl);
                        }

                        me.log('info', "Changing Directories to: " + repo );
                        shell.cd(repo);

                        me.log('info', "Displaying current location/directory information");
                        shell.exec('ls');

                        shell.exec('git fetch');
                        shell.exec('git checkout ' + pversion.branch);

                        shell.exec('git fetch --tags');

                        me.log('info', "Checkout out main branch: " + pversion.branch);
                        shell.exec('git checkout ' + pversion.branch);

                        if (pversion.tag) {
                            me.log('info', "Checking out tagged version: " + pversion.tag);
                            shell.exec('git checkout -b ' + pver + ' ' + pversion.tag );
                        } else {
                            me.log('info', "Couldn't find a tag, checking out head instead");
                            shell.exec('git pull');
                            shell.exec('git checkout -b ' + pver);
                        }

                        me.log('info', 'Removing ' + pversion.input + ' input folder');
                        shell.rm('-rf', path + '/input/' + pversion.input);


                        me.log('info', "Building Doxi");

                        shell.cd(path + '/configs/doxi/' + project.name);
                        shell.exec(cmd + ' doxi build -p ' + pver + '.doxi.json combo-nosrc');
                        shell.exec(cmd + ' doxi build -p ' + pver + '.doxi.json all-classes');

                        me.log('info', 'Changing Directories to: ' + repo + ' for git cleanup');
                        shell.cd('../../../../modules/' + project.repo);

                        shell.cd(path);
                    }
                })
            })
        } else {
            me.log('error', 'Error: You must include a version');
            process.exit(1);
        }
    }

    /**
     *
     */
    log (type, msg) {
        type = type || 'info';

        if (this.logging[type] === true) {
            debug[type](msg);
        }
    }

    /**
     * Checks to see if the required command line arguments are present.
     *
     * @return {Boolean}
     */
    checkArgs () {
        return true;
    }

    /**
     * Runs the module.
     */
    run () {
        me.log('error', '`run` method needs to be implemented');
    }

    /**
     * Create the index page using the passed data object
     * @param {Object} view The data to be applied to the handlebars template
     */
    createIndexPage (view) {
        let me = this,
            newhometemplate = handlebars.compile(me.hometemplate), // Compile the handlebars home template with the view object
            homeoutput;

        view.isHome      = true;
        view.imagePath   = 'home-images/';
        view.cssPath     = 'css/';
        view.homePath    = '';
        view.jsPath      = 'js/';
        view.hasApi      = me.hasApi;
        view.hasGuides   = me.hasGuides;
        view.isApi       = false;
        view.isGuide     = false;
        view.product     = me.product;
        view.pversion    = me.pversion;
        view.helpText    = me.helpText;
        view.helpToc     = me.helpToc;
        view.productTree = me.productTree;

        homeoutput = newhometemplate(view);

        me.log('info', 'Writing: index.html');

        wrench.copyDirSyncRecursive('./product-templates/images', me.destination + '/home-images/', {
            forceDelete: true
        });

        wrench.copyDirSyncRecursive(__dirname + '/css/fonts', me.destination + '/css/fonts/', {
            forceDelete: true
        });

        wrench.chmodSyncRecursive(me.destination + '/home-images/', '0755');

        fs.writeFileSync(me.destination + '/index.html', homeoutput, 'utf-8');
    }

    /**
     * Build the help page for the site
     */
    buildHelp () {
        let me      = this,
            tempObj = {
                name: 'Docs Help'
            };

        me.helpText     = me.getHelp();
        me.buildTOC(tempObj, me.helpText);
        me.helpToc      = tempObj.headers;
    }

    /**
     *
     */
    removeTmpFiles (dir) {
        dir = dir || process.cwd();

        fs.readdir(dir, function (err, files) {
            files.forEach(function (file) {
                if (path.extname(file) == '.tmp') {
                    fs.unlink(file);
                }
            });
        });
    }

    /**
     *
     */
    beforeExecute () {
        let me          = this,
            projectConfigs = me.projectConfigs,
            destination = (me.pversion && me.hasVersions) ? path.join(me.destination, me.pversion) : me.destination,
            filemaploc  = destination + '/src/map/filemap.json',
            compress    = me.compress,  //true to compress js/css files, false to only concatenate
            dt          = new Date(),
            date        = dt.toLocaleString("en-us",{month:"long"}) + ", " + dt.getDate() + " " + dt.getFullYear() + " at " + dt.getHours() + ":" + dt.getMinutes();

        /**
         * Remove .tmp files if they exist
         */
        me.removeTmpFiles();

        me.date           = date;
        me.template       = (me.template) ? fs.readFileSync(me.template, 'utf-8') : null;
        me.hometemplate   = fs.readFileSync(me.hometemplate, 'utf-8');
        me.destination    = destination;

        // build the help page
        if (me.constructor.name !== "Source") {
            me.buildHelp();
        }

        if (!fs.existsSync(filemaploc)) {
            console.log("No file found at " + filemaploc);
        }
        try {
            me.filemap = JSON.parse(fs.readFileSync(filemaploc));
        } catch (err) {
            console.log("Problem reading or writing " + filemaploc + " : " + err.message)
        }

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/ace.js'],
            fileOut : destination + '/js/ace.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/beautify.js'],
            fileOut : destination + '/js/beautify.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/media-query-poly.js'],
            fileOut : destination + '/js/media-query-poly.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/worker-javascript.js'],
            fileOut : destination + '/js/worker-javascript.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/theme-chrome.js'],
            fileOut : destination + '/js/theme-chrome.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/mode-javascript.js'],
            fileOut : destination + '/js/mode-javascript.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-css' : 'no-compress',
            fileIn  : [me.stylesheet, me.treestyle],
            fileOut : destination + '/css/app.css'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/prism.js'],
            fileOut : destination + '/js/prism.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-css' : 'no-compress',
            fileIn  : [__dirname + '/../base/css/prism.css'],
            fileOut : destination + '/css/prism.css'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [me.extl, me.treeview, './modules/base/js/main.js'],
            fileOut : path.join(destination, '/js/app.js')
        });
    }

    /**
     * Progressive ID generator
     * @param {String} prefix String to prepend to the ID.  Default to 'e-'.
     */
    id (prefix) {
        prefix = prefix || 's-';
        return prefix + internalId++;
    }

    /**
     * Replace all "@example" blocks with the markup used for embedded anonymous fiddles
     * @param {String} str The string with @example blocks (maybe) to use as fiddles
     */
    decorateExamples (str) {
        let me = this,
            fiddleWrap = '<div class="da-inline-code-wrap da-inline-code-wrap-fiddle invisible example-collapse-target" id="{2}" data-fiddle-meta=\'{3}\'>' +
                    '<div class="da-inline-fiddle-nav">' +
                        '<div class="code-controls"><span class="collapse-tool"></span><span class="expand-tool"></span><span class="expand-code">Expand Code</span></div>' +
                        '<span class="da-inline-fiddle-nav-code da-inline-fiddle-nav-active"><span class="fa fa-code"></span>Code</span>' +
                        '<span class="da-inline-fiddle-nav-fiddle">' +
                            '<span class="fiddle-icon-wrap">' +
                                '<span class="fa fa-play-circle"></span><span class="fa fa-refresh"></span>' +
                            '</span>' +
                        'Run</span>' +
                        '<span class="fiddle-code-beautify tooltip tooltip-tr-br" data-beautify="Beautify Code"><div class="callout callout-b"></div></span>' +
                    '</div>' +
                    '<div id="{0}" class="ace-ct">{1}</div>' +
                '</div>',
            out = str;

        // decorates @example blocks as inline fiddles
        out = str.replace(/(?:<pre><code>(?:@example(?::)?(.*?)\n))((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, function (match, p1, p2) {
            //let ret = p3.trim(),
            let ret = p2.trim(),
                id = me.id(),
                wrapId = me.id(),
                fid = {},
                prodObj = me.projectConfigs.productIndex[me.product],
                toolkit = me.toolkit,
                version = me.numberVer;

            if (p1.indexOf('extjs') === 0 || p1.indexOf('touch') === 0) {
                // should be formatted like: framework-fullVersion-theme-toolkit
                // e.g.: extjs-6.0.2-neptune-classic
                let parts = p1.split('-');

                fid.framework = parts[0] === 'touch' ? 'Sencha Touch' : 'Ext JS';
                fid.version   = parts[1];
                fid.theme     = parts[2];
                fid.toolkit   = parts[3];
            } else {
                fid = {
                    framework: me.product === 'touch' ? 'Sencha Touch' : 'Ext JS',
                    theme: toolkit ? prodObj.theme[version][toolkit] : prodObj.theme[version] || 'neptune',
                    toolkit: toolkit || null,
                    version: version
                };
            }

            ret = Utils.format(fiddleWrap, id, ret, wrapId, JSON.stringify(fid));

            return ret;
        });

        // decorates simple code examples
        out = out.replace(/(?:<pre><code>)((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, function (match, p1) {
            return '<div class="code-snippet-wrap">' +
                '<div class="code-controls example-collapse-target">' +
                    '<span class="collapse-tool"></span><span class="expand-tool"></span>Sample Code' +
                '</div>' +
                '<pre><code class="language-javascript">' +
                p1 +
                '</code></pre></div>'
        });

        return out;
    }

    /**
     *
     */
    getHelp () {
        let helpFile = fs.readFileSync(__dirname + '/help.md', 'utf-8');
        return marked(helpFile, {
            addHeaderId : function(text, level, raw) {
                return text.toLowerCase().replace(/[^\w]+/g, '-');
            }
        })
    }

    /**
     * Build the table of contents from the html content / headers
     */
    buildTOC (node, html, callback) {
        this.log('info', 'Building TOC for: ' + node.name);

        let rx = /<(h[2|3|4|5|6]+)(?:(?:\s+id=["]?)([a-zA-Z0-9-_]*)(?:["]?))?>(.*)<\/h[2|3|4|5|6]+>/gi,
            results = [],
            result;

        while ((result = rx.exec(html))) {
            results.push({
                id   : result[2],
                name : result[3].replace(/<([^>]+?)([^>]*?)>(.*?)<\/\1>/ig, ""),
                tag  : result[1]
            });
        }

        node.headers = results.length ? results : null;
    }
}

module.exports = Base;
