/* jshint node: true */
'use strict';

/**
 * ? sync the source folder and Git
 * Read over all guides using the guide config as a map of guides to include
 *  - find the most recent version of a guide if there are more than one in successive versions
 * For each applicable guide:
 *  - Add the guide to the guide search
 *  - Add the guide to the guide
 *  - Create the guide folder and guide resource file
 */

const SourceApi       = require('../source-api'),
      CompareVersions = require('compare-versions'),
      Fs              = require('fs-extra'),
      Path            = require('path'),
      Mkdirp          = require('mkdirp'),
      Handlebars      = require('handlebars'),
      Utils           = require('../shared/Utils'),
      _               = require('lodash'),
      Entities        = require('html-entities').AllHtmlEntities,
      Gramophone      = require('sencha-gramophone'); // https://github.com/edlea/gramophone;

class SourceGuides extends SourceApi {
    constructor (options) {
        super(options);

        /**
         * @property guidesTree
         * The tree of guide nodes.  This is populated as the guides config is processed
         */
        this.guidesTree = {};
    }

    /**
     * Default entry point for this module
     */
    run () {
        this.processGuides();
    }

    /**
     * Returns the guides source directory used the source-guides module.  By default the
     * guides' repo (if configured in the projectDefaults or app.json) will be appended
     * to the guides source directory.
     * @return {String} The full path to the source directory for guides
     */
    get guideSourceDir () {
        let options = this.options,
            cfg     = Object.assign({}, options, {
                repo: options.products.guides.repo || null
            });

        return Path.resolve(options._myRoot, Utils.format(options.guideSourceDir, cfg));
    }

    /**
     * The full path for the config file used to process the guides for the current
     * product / version
     * @return {String} The full path to the guides config file
     */
    get guideConfigPath () {
        return Path.resolve(this.guideSourceDir, 'configs', this.options.product);
    }

    /**
     * The config used to process guides for the current product / version.  Each config
     * file is evaluated to see if it is the same or closest to (without going over) the
     * version being processed.
     *
     * For example, if there is a config-6.0.0 and config-7.0.0 and the current version
     * being processed is 6.2.0 then config-6.0.0 would be selected
     *
     * @return {Object} The guide config object
     */
    get guideConfig () {
        let path        = this.guideConfigPath,
            options     = this.options,
            hasVersions = options.prodVerMeta.hasVersions;

        // if there are not multiple versions just read config.json
        if (!hasVersions) {
            return Fs.readJsonSync(
                Path.join(
                    path,
                    'config.json'
                )
            );
        }

        let files   = this.getFiles(path),
            version = options.version,
            cfgVer  = '0',
            i       = 0,
            len     = files.length,
            file;

        // else loop over all config files and compare their version number to the 
        // version being processed to find the right config file
        for (; i < len; i++) {
            let name = Path.parse(files[i]).name,
                v    = name.substring(name.indexOf('-') + 1);

            if (CompareVersions(v, version) <= 0 && CompareVersions(v, cfgVer) > 0) {
                cfgVer = v;
                file   = name;
            }
        }

        // and then read the contents of the config file
        return Fs.readJsonSync(
            Path.join(
                path,
                `${file}.json`
            )
        );
    }

    /**
     * The full path to the guide source for the current product
     * @return {String} The guide source path
     */
    get guidePath () {
        return Path.join(this.guideSourceDir, this.options.product);
    }

    /**
     * Fetch the eligible guide directory paths for the given product / version.  Only
     * directories matching or lower than the version being processed will be returned.
     * @return {String[]} Array of paths of eligible guide directories
     */
    get guideDirPaths () {
        let me      = this,
            version = me.options.version,
            dirs    = me.getDirs(me.guidePath),
            i       = 0,
            len     = dirs.length,
            paths   = [];

        for (; i < len; i++) {
            // add only the eligible directories given the current product version being built
            if (CompareVersions(dirs[i], version) <= 0) {
                paths.push(Path.join(me.guidePath, dirs[i]));
            }
        }

        return paths;
    }

    /**
     * Create a map of guides (from the guide config) to their paths on disc.  The most
     * recent version if a given guide will be the one mapped so that older guide
     * versions are able to be eclipsed by newer versions.
     * @return {Object} The hash of guide > guide paths
     */
    get guidePathMap () {
        let map = this._guidePathMap;

        if (!map) {
            map = this._guidePathMap = {};

            // get all applicable guide directories
            let verDirs = this.guideDirPaths.reverse(),
                i       = 0,
                len     = verDirs.length;

            // loop through the directories and add the files to the guide map
            for (; i < len; i++) {
                let dir = verDirs[i];

                this.mapFiles(dir, '', dir, map);
            }
        }
        return map;
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
                    this.resourcesDir
                ),
                'guides'
            );
            // make sure the directory exists on disk and if not, create it
            Fs.ensureDirSync(dir);
        }

        return dir;
    }

    /**
     * A list of guide names to blacklist from the search parser
     * @return {String[]} An array of blacklisted guides
     */
    get guideSearchBlacklist () {
        return ['Release Notes'];
    }

    /**
     * A list of search whitelist words
     * See: https://www.npmjs.com/package/gramophone#option-startwords
     * @return {String[]} Array of whitelist words
     */
    get guideSearchWhitelist () {
        return ['vs', 'getting', 'new'];
    }

    /**
     * Returns common metadata needed by app API pages
     * @param {Object} data Current data hash to be applied to the page template
     * @return {Object} Hash of common current page metadata
     */
    getGuideMetaData (data) {
        let meta = super.getCommonMetaData();

        if (data) {
            Object.assign(meta, {
                navTreeName : data.navTreeName,
                myId        : data.id,
                rootPath    : Path.relative(data.rootPath, this.outputProductDir) + '/',
                pageType    : 'guide',
                pageName    : data.text
            });
        }

        return meta;
    }

    /**
     * Iterates over all guides in a directory and adds them to the guide map (dictated
     * by the guide config).  Since lower versioned guide folders are processed before
     * higher ones the most recent / relevant guide is always the one that ends up being
     * the on places on the guide map.
     *
     * When subdirectories are encountered they are passed to mapFiles as well.
     *
     * @param {String} sourceDir The folder path of the guides to loop over
     * @param {String} path The current folder path.  Used as a key in the guide map.
     * @param {String} dir The root directory of the guides (for the currently processed
     * versioned guide folder)
     * @param {Object} map The guide map that the relevant file paths are added to
     */
    mapFiles (sourceDir, path, dir, map) {
        let files = this.getFiles(sourceDir),
            i     = 0,
            len   = files.length;

        // loop over all files in the sourceDir
        for (; i < len; i++) {
            let file   = files[i],
                full   = Path.join(path, file),
                parsed = Path.parse(full);

            // see if the path + file exists on the map of files and if not add it
            if (!map[full]) {
                map[Path.join(parsed.dir, parsed.name)] = Path.join(dir, full);
            }
        }

        // get any subdirectories for processing to the map
        let dirs = this.getDirs(sourceDir);

        i   = 0;
        len = dirs.length;

        // loop over any subdirectories and pass them to sourceDir
        for (; i < len; i++) {
            let d = dirs[i];

            this.mapFiles(Path.join(sourceDir, d), Path.join(path, d), dir, map);

        }
    }

    /**
     * The central method for this module that syncs the guides to the repo and then
     * processes the guide output.  Is called by the {@link #run} method.
     * @return {Object} Promise
     */
    processGuides () {
        let dt = new Date();

        console.log('PROCESSING GUIDES');
        this.syncRemote('guides', this.guideSourceDir);

        return this.processGuideCfg()
        .then(this.readGuides.bind(this))
        .then(this.assembleSearch.bind(this))
        .then(this.outputGuideSearch.bind(this))
        .then(this.outputGuides.bind(this))
        .then(this.outputGuideTree.bind(this))
        .then(this.copyResources.bind(this))
        .then(() => {
            console.log('runGuides:', this.getElapsed(dt));
            // TODO Maybe ove to create-app-base after "All Told" once promise is respected
            //this.concludeBuild();
        })
        .catch(this.error.bind(this));
    }

    /**
     * Returns a Promise that ultimately outputs the guide search object for the current 
     * product.  This is uses by {@link assembleSearch} by creating an HTML app module 
     * instance for a product other than the one being initially built and then calling 
     * `getSearch`.
     * @return {Object} Promise
     */
    getGuideSearch() {
        return this.processGuideCfg()
        .then(this.readGuides.bind(this))
        .then(this.getSearchFromGuides.bind(this))
        .catch(this.error.bind(this));
    }

    /**
     * Collects the parsed search words for any applicable products; meaning the current 
     * product whose guides are being output along with any partner product as dictated 
     * by the 'guideSearchPartners` info in the projectConfigs.  The reason this is done 
     * is that some products' guides may pair well with the current product's guides.  
     * For example, when building for Ext JS we also want to see the guides for Cmd since 
     * Ext JS uses Cmd extensively.
     * @return {Object} Promise that returns an array of search objects from each 
     * applicable product
     */
    assembleSearch () {
        let actionArr      = [],
            options        = this.options,
            product        = options.product,
            products       = options.products,
            searchPartners = products[product].guideSearchPartners;

        // to start we'll get the current product's guide search info
        actionArr.push(
            this.getSearchFromGuides()
        );

        // then if this product has coordinating products to include searches
        if (searchPartners) {
            let i          = 0,
                len        = searchPartners.length,
                HtmlApp    = require('../create-app-html');

            // loop over all partner products and create its search output to ultimately 
            // be passed on to the outputSearch method
            for (; i < len; i++) {
                let partnerProduct  = searchPartners[i],
                    partnerInstance = new HtmlApp(
                        // options._args has the initial set of arguments from the CLI 
                        // for this product build
                        // - all that is really needed to instantiate a module
                        Object.assign({}, options._args, {
                            product: partnerProduct
                        })
                    );
                
                actionArr.push(partnerInstance.getGuideSearch());
            }
        }

        return Promise.all(actionArr)
        .catch(this.error.bind(this));
    }

    /**
     * Flattens the guides tree into a single array of all guide nodes (leaf and parent 
     * both)
     * @param {Object/Object[]} nodes Either the tree object or an array of tree nodes.  
     * Initially the tree object will be passed and then flattenGuides passes each parent 
     * node's child nodes back into itself recursively
     * @param {Array} flattened This doesn't need to be passed in externally.  It's used 
     * privately for recursive calls when processing child nodes
     * @return {Object[]} The flattened array of all guide nodes
     */
    flattenGuides (nodes, flattened) {
        flattened = flattened || [];

        // if this is the first call to flattenGuides what is passed will be the tree 
        // itself, not an array of nodes
        if (Utils.isObject(nodes)) {
            nodes = _.flatten(_.values(nodes));
        }

        let i   = 0,
            len = nodes.length;

        // we loop over all nodes and pass child nodes back into this function
        for (; i < len; i++) {
            let node       = nodes[i],
                childNodes = node.children;

            flattened.push(node);
            if (childNodes) {
                this.flattenGuides(childNodes, flattened);
            }
        }

        return flattened;
    }

    /**
     * Parses the search words from all guides
     * @return {Object} Promise the returns the search object that will be added to the 
     * array of possible search objects collected in {@link #assembleSearch}
     */
    getSearchFromGuides () {
        return new Promise((resolve, reject) => {
            let guides = this.flattenGuides(this.guidesTree);

            let options   = this.options,
                i         = 0,
                len       = guides.length,
                blacklist = this.guideSearchBlacklist,
                searchObj = {
                    searchWordsIndex : null,
                    searchWords      : {},
                    searchRef        : [],
                    searchUrls       : [],
                    prod             : options.product,
                    version          : options.prodVerMeta.hasVersions && options.version
                };

            // loop over all guide nodes (from flattenGuides) and parse the guide content
            // and attach the parse pieces onto the `searchObj` to later be output to the 
            // UI
            for (; i < len; i++) {
                let guide   = guides[i],
                    name    = guide.name.replace(/&amp;/g, '&'),
                    content = guide.content,
                    href    = guide.href;

                searchObj.searchRef.push(name);
                searchObj.searchUrls.push(href);

                if (content && !_.includes(blacklist, name)) {
                    searchObj.searchWordsIndex = i;
                    this.parseSearchWords(searchObj, name, content);
                }
            }

            resolve(searchObj);
        })
        .catch(this.error.bind(this));
    }

    /**
     * Collect up keywords from the doc
     * @param {Object} obj The accumulating search object
     * @param {String} title The doc title
     * @param {String} body The body text of the document
     */
    parseSearchWords (obj, title, body) {
        let me        = this,
            entities  = new Entities(),
            whitelist = this.guideSearchWhitelist,
            configDefault = {
                html                 : true,
                score                : true,
                ngrams               : [1, 2, 3, 4, 5, 6, 7],
                alternativeTokenizer : true
            },
            parsedTitle, parsedBody;

        parsedBody = Gramophone.extract(
            entities.decode(body),
            configDefault
        );

        parsedTitle = Gramophone.extract(
            entities.decode(title),
            Object.assign(configDefault, {
                min        : 1,
                startWords : whitelist
            })
        );

        me.addTerms(obj, parsedTitle, 't');
        me.addTerms(obj, parsedBody,  'b');
    }

    /**
     * @private
     * Private method used by parseSearchWords to add the collected words to the parent
     * search words object
     * @param {Object} obj The search object that the parsing pieces are added to
     * @param {Array} terms The results of the guide parsing action in 
     * {@link #parseSearchWords}
     * @param {String} type The type of parsing that was done in 
     * {@link #parseSearchWords}.  This will either be 't' if it was the guide title that 
     * was parsed or 'b' if it was the body that was parsed.
     */
    addTerms (obj, terms, type) {
        let words = obj.searchWords,
            i     = 0,
            len   = terms.length;

        for (; i < len; i++) {
            let item = terms[i],
                term = terms[i].term;

            item.t = type;
            // the index of the guide where the match was made
            item.r = obj.searchWordsIndex;
            item.m = item.term;
            delete item.term;
            // the frequency / number of instances
            item.f = item.tf;
            delete item.tf;

            if (typeof words[term] !== 'function') {
                words[term] = words[term] || [];
                words[term].push(item);
            }
        }
    }

    /**
     * Writes the parsed search output from all guides to disk for use by the UI
     * @param {Object[]} searchOutput An array of search objects for all applicable 
     * products
     * @return {Object} Promise
     */
    outputGuideSearch (searchOutput) {
        let output = JSON.stringify(searchOutput),
            options = this.options,
            product = options.product,
            version = options.version;
        
        version = options.prodVerMeta.hasVersions ? `${version}` : '';
        output = `DocsApp.guideSearch =${output};`;

        return new Promise((resolve, reject) => {
            Fs.writeFile(Path.join(this.jsDir, `${product}-${version}-guideSearch.js`), output, 'utf8', err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })
        .catch(this.error.bind(this));
    }

    /**
     * Output all guides in the `guidesTree` property
     * @return Promise
     */
    outputGuides () {
        let guidesTree = this.guidesTree,
            flattened  = this.flattenGuides(guidesTree),
            writeArr   = [],
            i          = 0,
            len        = flattened.length;

        // loop over all guide nodes
        for (; i < len; i++) {
            let node        = flattened[i],
                content     = node.content,
                path        = node.id,
                filePath    = this.getGuideFilePath(path),
                rootPathDir = Path.parse(filePath).dir;

            // if the node has content then output the guide file for this node
            if (content) {
                writeArr.push(
                    new Promise((resolve, reject) => {
                        let data = Object.assign({}, node);
                        data     = Object.assign(data, this.options);
                        data     = Object.assign(data, this.options.prodVerMeta);

                        // prepare the data object to be passed to the guide template
                        data.rootPath       = rootPathDir;
                        data.prodVerPath    = Path.relative(rootPathDir, this.outputProductDir) + '/';
                        data.content        = this.processGuideHtml(content, data);
                        data                = this.processGuideDataObject(data);
                        data.contentPartial = '_html-guideBody';
                        
                        Fs.writeFile(filePath, this.mainTemplate(data), 'utf8', (err) => {
                            if (err) {
                                reject(err);
                            }
                            // delete node content before the node is passed to the UI
                            delete node.content;
                            resolve();
                        });
                    })
                );
            }
        }

        return Promise.all(writeArr)
        .catch(this.error.bind(this));
    }

    /**
     * @private
     * Used by {@link copyResources} to filter a file to be copied or not depending on
     * whether it's a markdown file or not
     */
    isMarkdown (file) {
        return Path.parse(file).ext !== '.md';
    }

    /**
     * Copies all non-markdown resources from the source directory to the output
     * directory
     * @return {Object} Promise
     */
    copyResources () {
        let map      = this.guidePathMap,
            keys     = Object.keys(map),
            i        = 0,
            len      = keys.length,
            promises = [];

        // loop over all files in the `guidePathMap`
        keys.map((path) => {
            let file    = map[path],
                dir     = path.substr(0, path.lastIndexOf('/')),
                fromDir = Path.parse(file).dir,
                destDir = Path.join(this.guidesOutputDir, dir);

            promises.push(new Promise((resolve, reject) => {
                // ensure the directory is created
                this.log(`Ensure directory "${destDir}" exists - if not, create it`);
                Fs.ensureDir(destDir, () => {
                    // copy any file over that is not a markdown (.md) file
                    this.log(`Copy all non-markdown files from "${fromDir}" to "${destDir}"`);
                    Fs.copy(
                        fromDir,
                        destDir,
                        {
                            filter: this.isMarkdown
                        },
                        resolve
                    );
                });
            }));
        });

        return Promise.all(promises)
        .catch(this.error.bind(this));
    }

    /**
     * Processes the guide config by:
     *
     *  - adding the guides to a guide tree to be used by the HTML docs and Ext app
     *  - processing the guides (their markdown, links, etc)
     *
     * Finally, the guide tree is output
     * @return {Object} Promise
     */
    processGuideCfg () {
        return new Promise((resolve, reject) => {
            let cfg       = this.guideConfig,
                items     = cfg.items,
                i         = 0,
                len       = items.length,
                toReadArr = [];

            for (; i < len; i++) {
                let guidesObj = items[i];

                this.guidesTree[guidesObj.text] = guidesObj.items;
                this.prepareGuides(guidesObj.items, guidesObj.rootPath || '', toReadArr, guidesObj.text);
            }

            resolve(toReadArr);
        })
        .catch(this.error.bind(this));
    }

    /**
     * The guides from the guide config are processed; making the guide directory in the
     * output directory, decorating the tree nodes for consumption by the
     * post-processors, and outputting the guide itself
     * @param {Object[]} nodes The nodes (or child nodes) from the guide tree to process
     * @param {String} rootPath the path on disc where the guides from the nodes are
     * located
     */
    prepareGuides (nodes, rootPath, toReadArr, navTreeName) {
        let i   = 0,
            len = nodes.length;

        // loop through all nodes
        for (; i < len; i++) {
            let node        = nodes[i],
                children    = node.children,
                slug        = node.slug,
                iconClasses = {
                    universal : 'fa fa-file-text-o',
                    classic   : 'classic-guide',
                    modern    : 'modern-guide'
                };

            node.navTreeName = navTreeName;
            node.text        = node.name;
            node.idx         = (i + 1);

            // if a rootPath was passed in create a directory in the output folder
            if (rootPath) {
                this.makeGuideDir(rootPath);
            }
            // if this node has children create the directory in the output folder for
            // the child guides and prepared the child nodes
            if (children) {
                let path = Path.join(rootPath, slug);

                //node.id = node.slug;
                node.id = Path.join(rootPath, slug);
                node.iconCls = this.folderNodeCls;
                this.makeGuideDir(path);
                this.prepareGuides(children, path, toReadArr, navTreeName);
                
                // else decorate the node as leaf = true
            } else {
                node.id      = Path.join(rootPath, slug);
                node.leaf    = true;
                node.iconCls = iconClasses[node.toolkit] || iconClasses.universal;
                // if the node isn't simply a link itself then output its guide
                if (!node.link) {
                    //nodesArr.push(this.outputGuide(node, rootPath));
                    node.href = Path.join('guides', rootPath, `${slug}.html`);
                    toReadArr.push(this.readGuide(node, rootPath));
                }
            }
        }
    }

    /**
     * Create guide folders in the resources directory using the supplied path
     * @param {String} path The path to create on disk
     */
    makeGuideDir (path) {
        Mkdirp.sync(
            Path.join(
                this.resourcesDir,
                'guides',
                path
            )
        );
    }

    /**
     * Assemble the guide file's path for writing to disk  
     * May be overridden in the post processor module
     * @param {String} path The path of the guide file
     * @return {String} The full path for the guide file
     */
    getGuideFilePath (path) {
        let filePath = Path.join(this.guidesOutputDir, path);

        return `${filePath}.html`;
    }

    /**
     * Promise that reads all guides from disk
     * @return {Object} Promise
     */
    readGuides (toReadArr) {
        return Promise.all(toReadArr)
        .catch(this.error.bind(this));
    }

    /**
     * Reads the contents of the guide on-disk and attaches it to the guide's tree node
     * @param {Object} node The guide tree node for the current guide being read
     * @return {Object} Promise
     */
    readGuide (node) {
        return new Promise ((resolve, reject) => {
            let path = this.guidePathMap[node.id];

            Fs.readFile(path, 'utf-8', (err, content) => {
                if (err) {
                    reject(err);
                }

                node.content = content;
                resolve();
            });
        })
        .catch(this.error.bind(this));
    }

    /**
     * Build the table of contents from the HTML content and headers for each guide
     * (excluding any <h1> headers)
     * @param {String} html The html to mine for headings to turn in to the table of
     * contents
     * @param {String} id The id of the guide being processed (for guides that's the path
     *  to the guide + the guide slug)
     * @return {String} The table of contents markup
     */
    buildTOC (html, id) {
        let rx = /<(h[2|3|4|5|6]+)(?:(?:\s+id=["]?)([a-zA-Z0-9-_]*)(?:["]?))?>(.*)<\/h[2|3|4|5|6]+>/gi,
            results = [],
            result;

        while ((result = rx.exec(html))) {
            let name = result[3].replace(/<([^>]+?)([^>]*?)>(.*?)<\/\1>/ig, "");

            results.push({
                id   : this.makeID(id, name),
                name : name,
                tag  : result[1].toLowerCase()
            });
        }

        return results;
    }

    /**
     * Template method to allow for additional guide data processing prior to handing the
     * data over to the guide template for final output
     * @param {Object} data The object to be processed / changed / added to before
     * supplying it to the template
     */
    processGuideDataObject (data) {
        // can be extended in the app post-processor subclasses
        data.cssPath    = Path.relative(data.rootPath, this.cssDir);
        data.jsPath     = Path.relative(data.rootPath, this.jsDir);
        data.imagesPath = Path.relative(data.rootPath, this.imagesDir);
        //data.title      = data.prodObj.title;
        data.toc        = this.buildTOC(data.content, data.id);
        data.myMeta     = this.getGuideMetaData(data);
        data.isGuide    = true;
        this.processCommonDataObject(data);
    }

    /**
     * Translates the guide markdown file to HTML markup
     * // can be extended in an app post-processor subclass to do this and that if needed
     * @param {String} html The markdown from the guide source file
     * @return {String} The HTML processed from the markdown processor
     */
    processGuideHtml (html, data) {
        html = this.markup(html, data.id);
        html = this.decorateExamples(html);
        return html;
    }

    /**
     * Writes the guide tree to disk for use by the UI's navigation view
     * @return {Object} Promise
     */
    outputGuideTree () {
        return new Promise((resolve, reject) => {
            let trees = JSON.stringify(this.guidesTree, null, 4),
                wrap  = `DocsApp.guidesTree = ${trees}`,
                product    = this.getProduct(),
                version    = this.options.version,
                dest  = Path.join(this.jsDir, `${product}-${version}-guidesTree.js`);

            Fs.writeFile(dest, wrap, 'utf8', (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        })
        .catch(this.error.bind(this));
    }
}

module.exports = SourceGuides;
