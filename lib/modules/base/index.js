'use strict';

const fs         = require('fs');
const path       = require('path');
const debug      = require('../../Debug');
const Utils      = require('../shared/Utils');
const handlebars = require('handlebars');
const junk       = require('junk');
const wrench     = require('wrench');
const mkdirp     = require('mkdirp');
const compressor = require('node-minify');
const shell      = require('shelljs');
const jsdom      = require('jsdom');
const marked     = require('sencha-marked');

var internalId = 0;

class Base {
    constructor (targets, options) {
        // make a copy of the defaultOptions to merge with the CLI passed options and the
        // config file options
        let defaultOptions = Object.assign({}, this.defaultOptions),
            parser = this.constructor.name,
            me = this, configs, baseOptions;

        // try fetching the config file using the config option passed in the CLI
        try {
            configs = require('../../configs/' + options.config);
        // if it's not found then kick out an error and stop here
        } catch(e) {
            debug.info('You must pass the "--config" options for the product you are building for (i.e. --config=classic to process ExtJS classic)');

            if (!options.old && !options.new) {
                process.exit(1);
            }
        }

        // merge the configs file object onto the default options
        baseOptions = Object.assign(defaultOptions, configs);

        if (baseOptions) {
            let name, type, value;

            for (name in baseOptions) {
                type  = null;
                value = baseOptions[name];

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

        this.options = Object.assign(baseOptions, options);
        Object.assign(this, this.options);
        this.targets = targets;

        if (options.skip != true) {
            if (parser == 'Source' || options.needsSDK === true) {
                this.reconcileRepos(options, false);
            }
        }

        if (parser == 'JsonParser') {
            this.createLinkMap(options.input, path.join(options.destination, options.pversion));
        }

        this.numberVer = this.getProductVersion(options.pversion);
    }

    /**
     * Maps the config options to a product key
     */
    get productMap () {
        return {
            classic: 'extjs',
            modern: 'extjs',
            architect: 'architect',
            orion: 'test',
            space: 'space',
            cmd: 'cmd'
        };
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
     * Create, checkout, pull, from git repositories
     */
    reconcileRepos(options, cleanup) {
        let projects = JSON.parse(fs.readFileSync(__dirname + '/../../configs/projectConfigs.json', 'utf8'))['products'],
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
                        debug.info("Checking for Sencha Cmd");
                        if (fs.existsSync('../../sencha-cmd')) {
                            cmd = '../../../../../sencha-cmd/sencha';
                        }

                        debug.info("Checking for modules folder" );
                        if (!fs.existsSync('../modules')) {
                            debug.info("Modules folder not found.  Creating '../modules'");
                            shell.mkdir('../modules');
                        }

                        debug.info("Changing directory to ../modules" );
                        shell.cd('../modules');

                        debug.info("Checking for sencha documentation repo" );
                        if (!fs.existsSync("sencha-documentation")) {
                            debug.info("Repo not found.  Cloning Sencha Documentation");
                            shell.exec('git clone git@github.com:sencha/sencha-documentation.git');
                        }

                        debug.info("Changing Directories to sencha-documentation");
                        shell.cd("sencha-documentation");
                        
                        debug.info("Displaying current location/directory information");
                        shell.exec('ls');
                        
                        shell.exec('git pull');
                        shell.cd("../");

                        debug.info("Checking for repo" );
                        if (!fs.existsSync(project.repo)) {
                            debug.info("Repo not found.  Cloning " + repo );
                            shell.exec('git clone ' + pversion.rurl);
                        }

                        debug.info("Changing Directories to: " + repo );
                        shell.cd(repo);

                        debug.info("Displaying current location/directory information");
                        shell.exec('ls');

                        shell.exec('git fetch');
                        shell.exec('git checkout ' + pversion.branch);

                        shell.exec('git fetch --tags');

                        debug.info("Checkout out main branch: " + pversion.branch);
                        shell.exec('git checkout ' + pversion.branch);

                        if (pversion.tag) {
                            console.log("Checking out tagged version: " + pversion.tag);
                            shell.exec('git checkout -b ' + pver + ' ' + pversion.tag );
                        } else {
                            console.log("Couldn't find a tag, checking out head instead");
                            shell.exec('git pull');
                            shell.exec('git checkout -b ' + pver);
                        }

                        debug.info('Removing ' + pversion.input + ' input folder');
                        shell.rm('-rf', path + '/input/' + pversion.input);

                        debug.info("Building Doxi");

                        shell.cd(path + '/configs/doxi/' + project.name);
                        shell.exec(cmd + ' doxi build -p ' + pver + '.doxi.json combo-nosrc');
                        shell.exec(cmd + ' doxi build -p ' + pver + '.doxi.json all-classes');

                        debug.info('Changing Directories to: ' + repo + ' for git cleanup');
                        shell.cd('../../../../modules/' + project.repo);

                        shell.cd(path);
                    }
                })
            })
        } else {
            debug.error('Error: You must include a version');
            process.exit(1);
        }
    }

    createLinkMap(input, output) {
        debug.info('Creating a map link.  It\'s dangerous to go alone');

        let me = this,
            linkmap = [],
            files = fs.readdirSync(input);

        if (files) {
            files.forEach(function (file) {
                if (junk.not(file) && !file.includes('-all-classes')) {
                    let json  = JSON.parse(fs.readFileSync(input + file, 'utf-8')),
                        name  = json.global.items[0].name,
                        fname = file.replace('.json', '.html');

                    linkmap.push({f: fname, c: name});
                }
            });
            me.linkmap = linkmap;
        }
    }

    /**
     * Method to register this module's command line arguments.
     *
     * @static
     * @cfg {argv} argv The argv node module.
     */
    static register (argv) {}

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
        debug.error('`run` method needs to be implemented');
    }

    /**
     * Create the index page using the passed data object
     * @param {Object} view The data to be applied to the handlebars template
     */
    createIndexPage (view) {
        let me = this,
            newhometemplate = handlebars.compile(me.hometemplate), // Compile the handlebars home template with the view object
            homeoutput;

        view.isHome    = true;
        view.imagePath = 'home-images/';
        view.cssPath   = 'css/';
        view.homePath  = '';
        view.jsPath    = 'js/';
        view.hasApi    = me.hasApi;
        view.hasGuides = me.hasGuides;
        view.isApi     = false;
        view.isGuide   = false;
        view.product   = me.productMap[me.config];
        view.pversion  = me.pversion;
        view.helpText  = me.helpText;
        view.helpToc   = me.helpToc;

        homeoutput = newhometemplate(view);

        debug.info('Writing index.html');

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
     *
     */
    beforeExecute (fileArray) {
        let me          = this,
            projectConfigs = require('../../configs/projectConfigs'),
            hasVersions = projectConfigs.productIndex[projectConfigs.normalizedProductList[me.config]].hasVersions,
            destination = (me.pversion && hasVersions) ? path.join(me.destination, me.pversion) : me.destination,
            filemaploc  = destination + '/src/map/filemap.json',
            compress    = me.compress,  //true to compress js/css files, false to only concatenate
            dt          = new Date(),
            date        = dt.toLocaleString("en-us",{month:"long"}) + ", " + dt.getDate() + " " + dt.getFullYear() + " at " + dt.getHours() + ":" + dt.getMinutes(),
            libFiles    = fs.readdirSync(process.cwd()),
            tempObj     = {
                name: 'Docs Help'
            };

        /**
         * Remove .tmp files if they exist
         */
        libFiles.forEach(function (file) {
            if (path.extname(file) == '.tmp') {
                fs.unlink(file);
            }
        });

        me.date         = date;
        me.template     = (me.template) ? fs.readFileSync(me.template, 'utf-8') : null;
        me.hometemplate = fs.readFileSync(me.hometemplate, 'utf-8');
        me.fileArray    = fileArray;
        me.destination  = destination;
        me.helpText     = me.getHelp();
        me.buildTOC(tempObj, me.helpText);
        me.helpToc      = tempObj.headers;

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
            fiddleWrap = '<div class="da-inline-code-wrap da-inline-code-wrap-fiddle invisible example-collapse-target" id="{2}">' +
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

        out = str.replace(/(<pre><code>(?:@example(.*?)\n))((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, function (match, p1, p2, p3) {
            let ret = p3.trim(),
                id = me.id(),
                wrapId = me.id();

            ret = Utils.format(fiddleWrap, id, ret, wrapId);

            return ret;
        });

        //out = out.replace(/(?:<pre><code>)/g, '<div class="code-controls"><span class="collapse-code">Collapse Examples</span><span class="expand-code">Expand Examples<span></div><pre><code>');
        //out = out.replace(/(?:<pre><code>)((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, '<div class="code-snippet-wrap"><div class="code-controls example-collapse-target"><span class="collapse-tool"></span><span class="expand-tool"></span>Sample Code</div><pre><code class="language-javascript">');
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
            }//,
            //appendLink: true
        })
    }

    /**
     * Build the table of contents from the html content / headers
     */
    buildTOC (node, html, callback) {
        debug.info('Building TOC for:', node.name);

        let doc = jsdom.jsdom(html, {
                ProcessExternalResources : false
            }),
            headers = doc.querySelectorAll('h2, h3, h4, h5, h6'),
            length  = headers.length;

        if (length) {
            let i    = 0,
                tocs = [],
                el;

            for (; i < length; i++) {
                el = headers[i];

                tocs.push({
                    id   : el.id,
                    name : el.innerHTML,
                    tag  : el.tagName
                });
            }

            node.headers = tocs;
        }
    }
}

module.exports = Base;
