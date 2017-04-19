/* jshint node: true */
'use strict';

/**
 * Run doxi
 *  - sync the source folder and Git
 * Read in all of the doxi files to get:
 *  - class list
 *  - map of all of the source file paths (later we will correlate the generated source HTML file to this file path)
 * Create the source HTML files (and put them in a common location to be used by both apps)
 *  - map the file name of the source HTML file created to the source file path
 *
 * Read over the doxi files again
 * Create a class resource file to be used by a create-app module
 * Add class-level info to the class resource file
 *  - some will be applied directly from the doxi file
 *  - some will be derived (for example: isComponent, isSingleton, isSdkRoot (meaning is Ext or ST themselves))
 * process all of the class member groups
 * doing so calls a member processor to:
 *  - decorate the member object as needed
 *  - adds the member to special objects on the class resource object for later use (i.e. indicating a list of instanceMethods that we can check against later when deriving accessors, etc.)
 * Loop over the configs and create any applicable getter / setter methods and add those to the methods group on the class resource obj
 * ? sort the items in each member group (? maybe just ones that get things moved around like properties and methods because of the accessors and static ones or maybe configs because of required configs)
 * The class resource object should now be sorted out and ready to be saved somewhere, but first..
 * Add the class to the search
 * Add the class to the class tree
 *  - ? should this be two trees?  One for package name (which is what we do today) and one for inheritance (like JSDuck did)
 * Output the class resource object (? this might just be templated here and executed by the create-app modules)
 */

const Base       = require('../base'),
      Path       = require('path'),
      Utils      = require('../shared/Utils'),
      Handlebars = require('handlebars'),
      Fs         = require('fs-extra'),
      Shell      = require('shelljs'),
      // TODO - is Mkdirp being used in any module or it's all Fs-extra now?  Might be able to remove its require statements if it can be purged via Fs-extra
      Mkdirp     = require('mkdirp'),
      _          = require('lodash'),
      WidgetRe   = /widget\./g;

class SourceApi extends Base {
    constructor (options) {
        super(options);
        //this.log(`Create 'SourceApi' instance`, 'info');

        let opts = this.options;

        /**
         * @property srcTemplate
         * The template used to output the source HTML files
         */
        this.srcTemplate = Handlebars.compile(
            Fs.readFileSync(
                Path.join(
                    opts._myRoot,
                    opts.htmlSourceTpl
                ),
                'utf-8'
            )
        );

        this.apiTrees = {};

        /**
         * @property apiTree
         * The tree of API classes (used to build the tree nav in the UI)
         */
        //this.apiTree = [];

        /**
         * @private
         * @property
         * The api search object all search is added to
         */
        this.apiSearchIndex = {};
    }

    /**
     * Returns an array of this module's file name along with the file names of all
     * ancestor modules
     * @return {String[]} This module's file name preceded by its ancestors'.
     */
    get parentChain () {
        return super.parentChain.concat([Path.parse(__dirname).base]);
    }

    /**
     * Default entry point for this module
     */
    run () {
        //this.log(`Begin 'SourceApi run'`, 'info');
        this.prepareApiSource();
    }

    /**
     * Returns the name of the doxi config file name to use when parsing the SDK.  Uses
     * the product, version, and toolkit currently being acted on.
     * @return {String} The doxi config file name
     */
    get doxiCfgFileName () {
        let options = this.options,
            product = options.product,
            version = options.version,
            toolkit = options.toolkit || 'config',
            path    = this.getDoxiCfgPath(),
            // find the nearest matching config file based on version
            file    = this.getFileByVersion(path, version);

        // strip the leading string
        file = file.substring(file.indexOf('-'));

        // and replace it with what is evaluated to be 'toolkit'
        // -- either the currently processed toolkit or 'config'
        return toolkit + file;
    }

    /**
     * Returns the path to the doxi config file
     * @param {String} fromDir The directory to start from when locating the doxi config
     * directory
     * @return {String} The path to the doxi config files
     */
    getDoxiCfgPath (fromDir) {
        let dir = fromDir || __dirname;
        return Path.resolve(
            dir,
            Path.join(
                Path.relative(
                    dir,
                    this.options._myRoot
                ),
                Utils.format(
                    this.options.parserConfigPath,
                    {
                        product: this.getProduct()
                    }
                )
            )
        );
    }

    /**
     * Returns the doxi config using the current product / version (used by the
     * {@link #createTempDoxiFile} method)
     * @return {Object} The original doxi config
     */
    get doxiCfg () {
        // TODO cache this and other getters

        return Fs.readJsonSync(
            Path.join(
                this.getDoxiCfgPath(),
                this.doxiCfgFileName
            )
        );
    }

    /**
     * The doxi config used by the app processors.  It is created using the
     * {@link #createTempDoxiFile} method.
     * @return {Object} The doxi config object used by the docs processors
     */
    get tempDoxiCfg () {
        return Fs.readJsonSync(
            Path.join(
                this.tempDir,
                'tempDoxiCfg.json'
            )
        );
    }

    /**
     * The full path to the temp directory used to host the doxi config file assembled
     * for the docs processors
     * @return {String} The path to the temp directory
     */
    get tempDir () {
        return Path.join(
            this.options._myRoot,
            '_temp'
        );
    }

    /**
     * The full path to the directory housing all of the class json files created by
     * running doxi for all products / versions.  Used by {@link #doxiInputDir}
     * @return {String} The path to the directory of the doxi-processed files
     */
    get rootApiInputDir () {
        let options = this.options;

        return Path.join(
            options._myRoot,
            options.apiInputDir
        );
    }

    /**
     * Create the doxi config file used when processing the docs.  The original config
     * file for the given product / version is fetched and any placeholder tokens in the
     * paths are replaced with values supplied by the passed options (projectDefaults,
     * app.json, CLI)
     */
    createTempDoxiFile () {
        //this.log(`Begin 'SourceApi.createTempDoxiFile'`, 'info');
        let options     = this.options,
            cfg         = this.doxiCfg,
            sources     = cfg.sources,
            outputs     = cfg.outputs,
            i           = 0,
            len         = sources.length,
            apiInputDir = this.rootApiInputDir;

        for (; i < len; i++) {
            let j    = 0,
                path = sources[i].path,
                jLen = path.length;

            for (; j < jLen; j++) {
                path[j] = Utils.format(path[j], {
                    apiSourceDir: this.apiSourceDir,
                    _myRoot: options._myRoot
                });
            }
        }

        let inputObj = {
            apiInputDir : apiInputDir,
            product     : options.product,
            version     : options.version,
            toolkit     : options.toolkit || ''
        };

        outputs['combo-nosrc'].dir         = Utils.format(outputs['combo-nosrc'].dir, inputObj);
        outputs['all-classes'].dir         = Utils.format(outputs['all-classes'].dir, inputObj);
        outputs['all-classes-flatten'].dir = Utils.format(outputs['all-classes-flatten'].dir, inputObj);

        Fs.ensureDirSync(this.tempDir);
        Fs.writeFileSync(
            Path.join(
                this.tempDir,
                'tempDoxiCfg.json'
            ),
            JSON.stringify(cfg, null, 4),
            'utf8',
            (err) => {
                if (err) this.log('createTempDoxiFile error', 'error');
        });
    }

    /**
     * The full path of the doxi output files for the current product / version (/
     * toolkit potentially)
     * @return {String} The path to the doxi files for the current product / version
     */
    get doxiInputDir () {
        let cfgDir       = this.getDoxiCfgPath(),
            cfg          = this.tempDoxiCfg,
            outputDir    = cfg.outputs['combo-nosrc'].dir,
            relToDoxiCfg = Path.resolve(__dirname, cfgDir),
            inputDir     = Path.resolve(relToDoxiCfg, outputDir);

        return inputDir;
    }

    /**
     * Checks to see if the doxi files folder is missing (not yet created with a previous
     * run of the docs processor) or empty
     * @return {Boolean} True if the folder is missing or empty
     */
    get doxiInputFolderIsEmpty () {
        let dir = this.doxiInputDir;

        if (!Fs.existsSync(dir) || this.isEmpty(dir)) {
            return true;
        }
    }

    /**
     * Returns the api source directory used by Doxi to create all of the doxi (input)
     * files.  By default the product's repo (if configured in the projectDefaults or
     * app.json) will be appended to the SDK source directory.
     */
    get apiSourceDir () {
        let options = this.options,
            cfg     = Object.assign({}, options, {
                repo: options.products[this.apiProduct].repo || null
                //repo: options.products[this.product].repo || null
            });

        return Path.resolve(
            options._myRoot,
            Utils.format(
                options.apiSourceDir,
                cfg
            )
        );
    }

    /**
     * Returns the api tree (later to be output in the {@link #outputApiTree} method).
     * A class name may optionally be passed in order to drive the tree name to be added
     * to `this.apiTrees`
     * @param {String} [className] The classname being processed.  Can be used in an
     * override of this method to derive which tree to return;
     * @return {Array} The api tree
     */
    getApiTree (className) {
        let apiTree = this.apiTrees[this.apiDirName];

        if (!apiTree) {
            apiTree = this.apiTrees[this.apiDirName] = [];
        }

        return apiTree;
    }

    /**
     * Returns common metadata needed by app API pages
     * @param {Object} data Current data hash to be applied to the page template
     * @return {Object} Hash of common current page metadata
     */
    getApiMetaData (data) {
        let meta = super.getCommonMetaData();

        if (data && data.cls) {
            let name       = data.cls.name,
                apiDirName = this.apiDirName,
                docsRelativePath = Path.relative(
                    this.apiDir,
                    this.options.outputDir
                );

            Object.assign(meta, {
                //navTreeName : 'API',
                //navTreeName : apiDirName === 'api' ? 'API' : apiDirName,
                navTreeName : apiDirName === 'api' ? 'API' : `API.${apiDirName}`,
                myId        : name,
                rootPath    : '../',
                pageType    : 'api',
                pageName    : name,
                docsRootPath : `${docsRelativePath}/`
            });
        }

        return meta;
    }

    /**
     * @private
     * Returns the source file for a given class / member
     * @param {Object} obj The class or class member object from the Doxi output to get
     * the class file from
     * @param {Object} raw The raw doxi output (that has the source files array)
     * @return {String} The path to the source file for the passed class / member
     */
    getSourceFilePath (obj, raw) {
        let srcObj = obj.src,
            files  = raw.files,
            srcFilePath;

        if (srcObj) {
            let target = srcObj.inheritdoc || srcObj.text || srcObj.name || srcObj.constructor;

            if (target) {
                let srcArr  = target.split(','),
                    srcIdx  = srcArr[0];

                srcFilePath = files[srcIdx];
            }
        }

        return srcFilePath;
    }

    /**
     * The central method for this module that runs doxi, processes the source files from
     * the SDK to HTML files for use in the final docs output, and reads over all doxi
     * class files to create the output used by the docs post processors (HTML docs or
     * Ext app).  Is called by the {@link #run} method.
     */
    prepareApiSource () {
        //this.log(`Begin 'SourceApi.prepareApiSource'`, 'info');
        // create the file Doxi will use to parse the SDK
        this.createTempDoxiFile();

        this.runDoxi();
        return this.readDoxiFiles();

    }

    /**
     * Runs doxi against the SDK to output class files used by the docs post processors
     * (HTML docs or Ext app)
     */
    runDoxi () {
        //this.log(`Begin 'SourceApi.runDoxi'`, 'info');
        let options   = this.options,
            forceDoxi = options.forceDoxi,
            cmd       = this.getCmdPath();

        this.syncRemote(
            this.apiProduct,
            this.apiSourceDir
        );

        if (forceDoxi === false) {
            return;
        }

        // if the `forceDoxi` options is passed or the doxi input directory is empty /
        // missing then run doxi
        if (forceDoxi || this.doxiInputFolderIsEmpty || (this.synced && this.synced[this.apiProduct])) {
            // empty the folder first before running doxi
            Fs.emptyDirSync(this.doxiInputDir);
            let path = Shell.pwd();

            Shell.cd(this.tempDir);
            Shell.exec(`${cmd} doxi build -p tempDoxiCfg.json combo-nosrc`);
            Shell.cd(path);
        }
    }

    /**
     * Catalog each of the source file paths used in building the classes of the
     * framework.  Data relating to those source files like the source HTML file name can
     * then be associated to the source file path.
     * @param {Array/String} files A file or array of files to be added to the map
     */
    mapSrcFiles (files) {
        //this.log(`Begin 'SourceApi.outputApiSearch'`, 'info');
        files = Utils.from(files);

        let i   = 0,
            len = files.length,
            map = this.srcFileMap;

        for (; i < len; i++) {
            let path = files[i];

            // if the file path is not already in the hash then add it
            if (!map[path]) {
                map[path] = {};
            }
        }
    }

    /**
     * Creates the source file map from the Doxi output
     * @return {Object} Promise
     */
    createSrcFileMap () {
        //this.log(`Begin 'SourceApi.createSrcFileMap'`, 'info');
        let inputDir = this.doxiInputDir,
            map      = this.srcFileMap = {},
            classMap = this.classMap = {};

        // if the doxi files have not been created run doxi before proceeding
        /*if (this.doxiInputFolderIsEmpty) {
            this.runDoxi();
        }*/

        let files = this.getFilteredFiles(Fs.readdirSync(inputDir)),
            i     = 0,
            len   = files.length,
            ops   = [];

        this.log('Processing the parsed SDK source files');

        for (; i < len; i++) {
            ops.push(
                new Promise((resolve, reject) => {
                    let path = Path.join(inputDir, files[i]);

                    Fs.readJson(path, (err, cls) => {
                        if (err) {
                            reject(err);
                        }
                        let clsObj    = cls.global.items[0], // the class obj
                            type      = clsObj.$type,        // the class type (class or enum)
                            validType = type === 'class' || type === 'enum',
                            // the index in the files list where the class is primarily sourced
                            srcIdx    = (clsObj.src.text || clsObj.src.name).substring(0, 1),
                            // the path of the class source from the SDK
                            // TODO this is a crutch for now - need doxi to give us the source class (classes)
                            srcPath   = cls.files[srcIdx];

                        // add all source files for this class to the master source file map
                        this.mapSrcFiles(cls.files || []);

                        // if the current file is a "class" file then cache the contents in the
                        // source file hash
                        // Supports #addAnchors
                        if (validType) {
                            map[srcPath].input = cls;
                        }

                        if (validType) {
                            let prepared = Object.assign({}, clsObj);
                            delete prepared.items;

                            classMap[clsObj.name] = {
                                raw: cls,
                                prepared: prepared
                            };
                        }

                        resolve();
                    });
                })
            );
        }
        return Promise.all(ops)
        .then(() => {
            let i         = 0,
                map       = this.srcFileMap,
                keys      = Object.keys(map),
                len       = keys.length,
                names     = {},
                inputDir = this.doxiInputDir;

            for (; i < len; i++) {
                let path = keys[i],
                    // returns 'file.ext' from the full path
                    name = Path.parse(path).base;

                // rename the file name to be used in the source file output if it's been
                // used already.  i.e. the first Button.js class will be Button.js and any
                // additional Button classes will have a number appended.  The next would be
                // Button.js-1 as the file name
                if (names[name]) {
                    let namesLength = names[name].length,
                        rename = `${name}-${namesLength}`;

                    names[name].push(rename);
                    name = rename;
                } else {
                    names[name] = [name];
                }

                // once the file names are sorted for duplicates add the final file name to
                // the source file map
                map[keys[i]].filename = name;

                keys[i] = {
                    path     : keys[i],
                    inputDir : inputDir
                };
            }
        })
        .catch(this.error.bind(this));
    }

    /**
     * Create the resources directory if not already created
     * @return {Object} Promise
     */
    /*ensureResourcesDir () {
        return new Promise((resolve, reject) => {
            let path = Path.resolve(
                __dirname,
                Path.join(
                    this.resourcesDir,
                    this.apiDirName
                )
            );

            Fs.ensureDir(path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }*/

    /**
     * Add the passed class name to the api tree used for UI nav
     * @param {String} className The full class name to process and add to the API tree
     * @param {String} icon An icon class name to include if passed:
     *
     *  - component
     *  - singleton
     *  - class
     * @param {Object} apiTree The tree to add the classname / node to
     * @param {String} [idSuffix] An optional suffix to add to the node id
     */
    addToApiTree (className, icon, apiTree, idSuffix='') {
        //this.log(`Begin 'SourceApi.addToApiTree'`, 'info');
        let nameArray   = className.split('.'),
            elementsLen = nameArray.length,
            apiDirName  = this.apiDirName;

        // process all parts of the class name (each string in the .-separated full class
        // name)
        //
        // node - initially the node is the api tree object itself.  As each element of
        // the full class name is processed what is passed back into the reduce callback
        // is the child nodes array that the next element will be added to
        //
        // name - the element of the split className currently being evaluated
        //
        // i - the index in the array at this stage of the reduce action
        nameArray.reduce((nodes, name, i) => {
            if (!nodes) {
                return;
            }
            // if the reduce index matches the length (minus 1) of the split className
            // then this is a leaf.  Though, root namespace items like "Ext" and "ST"
            // will be later have a `children` property added as necessary and be
            // "unleafed"
            let leaf     = (i === (elementsLen - 1)),
                id       = this.getNodeId(className, i),
                // the default node configuration
                baseNode = {
                    name        : name,
                    text        : name,
                    navTreeName : 'api',
                    id          : id + idSuffix,
                    leaf        : leaf,
                };

            let target        = this.getExistingNode(nodes, id),
                folderNodeCls = this.folderNodeCls,
                mapped        = this.classMap[id],
                isSingleton   = mapped && mapped.prepared.singleton,
                access        = mapped && mapped.prepared.access,
                newNode;

            if (!leaf) {
                newNode  = Object.assign(baseNode, {
                    iconCls  : isSingleton ? icon : folderNodeCls,
                    children : []
                });
                // else we're processing a leaf node (note, this could be a node / namespace
                // like "Ext" or "ST", but we account for that in the processing above)
            } else {
                //create the leaf node configuration
                newNode = Object.assign(baseNode, {
                    access  : access || 'public',
                    iconCls : `${icon}`
                });
            }
            if (this.classMap[id]) {
                newNode.href = `${apiDirName}/${id}.html`;
            }

            if (!target) {
                nodes.push(newNode);
            }
            target = target || newNode;

            return target.children;
        }, apiTree);   // initially we pass in the apiTree property itself
    }

    /**
     * @private
     * Sorter method that sorts an array of api tree nodes with parent nodes on top and
     * leaf nodes on bottom and each of those groups ordered by their node name.
     *
     * Supports {@link #sortTree}
     * @param {Object[]} nodes An array of api tree nodes to sort
     * @return {Object[]} The sorted array
     */
    sortNodes (nodes) {
        //this.log(`Begin 'SourceApi.sortNodes'`, 'info');
        return _.orderBy(nodes, [node => {
            return node.children ? 1 : 0;
        }, 'name'], ['desc', 'asc']);
    }

    /**
     * Sorts the api tree recursively.  Initially the tree is passed in.  Each node in
     * the tree that has children then passes those children back through `sortTree`.
     * @param {Object[]} tree The tree nodes to sort - either the tree root or an array
     * of child nodes
     * @return {Object[]} The sorted tree
     */
    sortTree (tree) {
        //this.log(`Begin 'SourceApi.sortTree'`, 'info');
        let len = tree.length,
            i   = 0;

        for (; i < len; i++) {
            let node     = tree[i],
                children = node.children;

            if (children) {
                this.sortTree(children);
                node.children = this.sortNodes(children);
            }
        }

        return this.sortNodes(tree);
    }

    /**
     * @private
     * Returns the id for a tree node using the full class name and an index to count in
     * 'x' number of .'s in the full class name.  For example, if the className of
     * "Ext.grid.Panel" was passed in with the currentIndex of 0 then "Ext.grid" would be
     * returned.
     *
     * Used by {@link #addToApiTree}
     * @param {String} className The full class name for the current node
     * @param {Number} currentIndex The index for the current node's processing -
     * essentially the depth this node is in the tree when the ID is requested
     * @return {String} The id for the current node being processed
     */
    getNodeId (className, currentIndex) {
        //this.log(`Begin 'SourceApi.getNodeId'`, 'log');
        let nameArr = className.split('.'),
            id      = [],
            i       = 0;

        for (; i < currentIndex + 1; i++) {
            let element = nameArr[i];
            id.push(element);
        }

        return id.join('.');
    }

    /**
     * @private
     * Private method used to find an existing api node in an array of api nodes on the
     * api tree
     * @param {Array} nodes Array of api nodes (could be [])
     * @param {String} name The class name element (package name) to look for
     * @return {Object} The existing node or false if an existing node was not found
     */
    getExistingNode (nodes, name) {
        //this.log(`Begin 'SourceApi.getExistingNode'`, 'log');
        let len    = nodes.length,
            i      = 0,
            target = false;

        for (; i < len; i++) {
            let node = nodes[i];

            // if it exists already break out of the loop and indicate which
            // child node should be used when processing the next reduce
            // iteration
            if (node && node.id === name) {
                target = node;
                break;
            }
        }

        return target;
    }

    /**
     * Entry method to process the doxi files into files for use by the HTML docs or Ext
     * app
     */
    readDoxiFiles () {
        //this.log(`Begin 'SourceApi.readDoxiFiles'`, 'info');
        let dt = new Date();
        return this.createSrcFileMap()
        //.then(this.ensureResourcesDir.bind(this))
        .then(() => {
            this.ensureDir(this.apiDir);
        })
        .then(this.processApiFiles.bind(this))
        .then(this.getApiSearch.bind(this))
        .then(this.outputApiFiles.bind(this))
        .then(this.outputApiTree.bind(this))
        .then(() => {
            console.log(new Date() - dt);
            return this.createSrcFiles();
        })
        .catch(this.error.bind(this));
    }

    /**
     * Outputs all class files from the Doxi processing (and any post-processing from
     * source-api) by passing the classname and class object to {@link #outputApiFile}
     * @return {Object} A Promise that processes all class files and calls to
     * `outputApiFile`
     */
    processApiFiles () {
        //this.log(`Begin 'SourceApi.processApiFiles'`, 'info');
        let classMap = this.classMap,
            classNames = Object.keys(classMap),
            i = 0,
            len = classNames.length;

        // reset the apiTree property on each processApiFiles run since this module
        // instance is reused between toolkits
        //this.apiTree = this.apiTrees[this.apiDirName] = [];

        // loops through all class names from the classMap
        for (; i < len; i++) {
            let className = classNames[i],
                // the prepared object is the one that has been created by
                // `createSrcFileMap` and will be processed in `decorateClass`
                prepared = classMap[className].prepared,
                apiTree  = this.getApiTree(className);

            this.decorateClass(className);

            // the class could be marked as skip=true if it's not something we wish to
            // process after running it through decorateClass.  i.e. an enums class with
            // no properties is empty so is skipped
            if (classMap[className].skip) {
                delete classMap[className];
            } else {
                this.addToApiTree(className, prepared.cls.clsSpecIcon, apiTree);
            }
        }
    }

    /**
     * Outputs all API doc files
     * @return {Object} Promise
     */
    outputApiFiles () {
        //this.log(`Begin 'SourceApi.outputApiFiles'`, 'info');
        let classMap   = this.classMap,
            classNames = Object.keys(classMap),
            i          = 0,
            len        = classNames.length,
            outputs    = [];

        Fs.ensureDirSync(this.apiDir);

        // loops through all class names from the classMap
        for (; i < len; i++) {
            let className = classNames[i],
                // the prepared object is the one that has been created by
                // `createSrcFileMap` and will be processed in `decorateClass`
                prepared  = classMap[className].prepared;

            outputs.push(this.outputApiFile(className, prepared));
        }

        return Promise.all(outputs)
        .catch(this.error.bind(this));
    }

    /**
     * Outputs the processed doxi file to a .json file in the resources folder for use by
     * the Ext app
     *
     * **Note:** This method is likely to be overridden by any app-processing module
     * (such as create-app-html) to output an HTML file rather than a JSON file
     * @param {String} className The name of the class to be output
     * @param {Object} data The prepared Doxi object to be output
     * @return {Object} A promise the resolves once the api file is written to the output
     * directory
     */
    /*outputApiFile (className, data) {
        return new Promise((resolve, reject) => {
            let fileName = Path.join(this.apiDir, `${className}.json`),
                output   = JSON.stringify(data, null, 4);

            Fs.writeFile(fileName, output, 'utf8', (err) => {
                if (err) console.log('outputApiFile error');
                delete this.classMap[className];
                // resolve after a timeout to let garbage collection catch up
                setTimeout(resolve, 100);
            });
        });
    }*/

    /**
     * @template
     * Template method to process the lists of related classes
     * @param {Object} cls The original class object
     * @param {Object} data The recipient of the processed related classes
     */
    processRelatedClasses () {}

    /**
     * Prepares additional api data processing prior to handing the data over to the api
     * template for final output
     * @param {Object} data The object to be processed / changed / added to before
     * supplying it to the template
     */
    processApiDataObject (data) {
        //this.log(`Begin 'SourceApi.processApiDataObject'`, 'info');
        let apiDir   = this.apiDir;

        data.prodVerPath = '../';
        data.cssPath     = Path.relative(apiDir, this.cssDir);
        data.jsPath      = Path.relative(apiDir, this.jsDir);
        data.imagesPath  = Path.relative(apiDir, this.imagesDir);
        data.myMeta      = this.getApiMetaData(data);
        data.isApi       = true;
        this.processCommonDataObject(data);
    }

    /**
     * Decorate each doxi class file with metadata / member groupings to be used by the
     * HTML docs or Ext app.  The class name is passed in and looked up in the `classMap`
     * which has cached a copy of the raw Doxi output (classMap.raw) and a copy to be
     * processed (classMap.processed).  This method evaluates the raw output and adjusts
     * / sorts / mutates it as needed for the final output and applies changes to the
     * 'processed' object.
     * @param {String} className The name of the class to be processed
     */
    decorateClass (className) {
        //this.log(`Begin 'SourceApi.decorateClass'`, 'log');
        let options  = this.options,
            classMap = this.classMap,
            raw      = classMap[className].raw,
            data     = classMap[className].prepared,
            cls      = raw.global.items[0],
            alias    = cls.alias;

        data.classText = this.markup(data.text);
        // TODO need to decorate the following.  Not sure if this would be done differently for HTML and Ext app output
        this.processRelatedClasses(cls, data);

        data.requiredConfigs     = [];
        data.optionalConfigs     = [];
        data.instanceMethods     = [];
        data.instanceMethodsObj  = {};
        data.staticMethods       = [];
        data.instanceProperties  = [];
        data.staticProperties    = [];

        data.contentPartial = '_html-apiBody';

        // set the alias info if the class has an alias
        // .. if the alias is widget use the alias of 'xtype' in the output
        // and list all aliases separated by a comma
        if (alias) {
            let isWidget = alias.includes('widget');

            cls.aliasPrefix = isWidget ? 'xtype' : alias.substr(0, alias.indexOf('.'));
            cls.aliasName   = (isWidget ? alias.replace(WidgetRe, '') : alias)
                              .replace(',', ', ');
        }

        // indicate if the class is deprecated
        cls.isDeprecated = !!(cls.deprecatedMessage || cls.deprecatedVersion);
        // indicate if the class is removed
        cls.isRemoved    = !!(cls.removedMessage    || cls.removedVersion);
        // indicate if the class is an enum
        cls.isEnum       = cls.$type === 'enum';
        data.cls = cls;

        this.processApiDataObject(data);

        // TODO there's a lot of overlap here with guides - should see how we can
        // reconcile some of this into some sort of applyContext(data) method
        data = Object.assign(data, options.prodVerMeta);
        data = Object.assign(data, options);

        // indicates whether the class is of type component, singleton, or some other
        // class
        if (cls.extended && cls.extended.includes('Ext.Component')) {
            cls.clsSpec     = 'title-decoration component';
            cls.clsSpecIcon = 'component-type fa fa-cog';
        } else if (cls.singleton === true) {
            cls.clsSpec     = 'title-decoration singleton';
            cls.clsSpecIcon = 'singleton-type fa fa-cube';
        } else {
            cls.clsSpec     = 'title-decoration class';
            cls.clsSpecIcon = 'class-type fa fa-cube';
        }

        // start keeping track of the class source files
        data.srcFiles = [];

        // get the source file path for the class
        let srcFilePath = this.getSourceFilePath(cls, raw),
            // and subsequently the source filename of the output source HTML
            filename      = this.srcFileMap[srcFilePath].filename + '.html',
            relPath       = Path.relative(this.options._myRoot, this.apiSourceDir) + '/',
            sanitizedPath = srcFilePath.replace(relPath, '').replace(/(\.\.\/)/g, ''),
            srcFileObj    = {
                pathText : sanitizedPath,
                path     : filename
            };

        // add the class source file info to the srcFiles array
        data.srcFiles.push(srcFileObj);

        let i                = 0,
            memberTypeGroups = cls.items || [],
            len              = memberTypeGroups.length;

        for (; i < len; i++) {
            let group   = memberTypeGroups[i],
                type    = group.$type,
                members = group.items;

            if (members && members.length) {
                data[type]      = this.processMembers(className, type, members);
            }
        }

        // process configs
        if (data.hasConfigs) {
            data.configs = this.splitMemberGroups(
                'configs',
                data,
                'requiredConfigs',
                'optionalConfigs'
            );
            data.configs.name = 'configs';
            this.postProcessConfigs(data);
            data.hasConfigs = !!data.requiredConfigs || !!data.optionalConfigs;
        }

        // process properties
        if (data.hasProperties) {
            data.properties = this.splitMemberGroups(
                'properties',
                data,
                'instanceProperties',
                'staticProperties'
            );
            data.properties.name = 'properties';
            data.hasProperties = !!data.instanceProperties || !!data.staticProperties;
        }

        // process methods
        if (data.hasMethods) {
            data.methods = this.splitMemberGroups(
                'methods',
                data,
                'instanceMethods',
                'staticMethods'
            );

            data.methods.instanceMethods = _.sortBy(
                data.methods.instanceMethods,
                'name'
            );
            data.hasMethods = !!data.instanceMethods || !!data.staticMethods;
        }

        // processes any enum type classes
        if (cls.$type === 'enum') {
            // if the class has properties find the first one for use in the template output
            if (data.hasProperties) {
                let propertiesObj = data.properties,
                    properties    = propertiesObj.hasInstanceProperties ? propertiesObj.instanceProperties : propertiesObj.staticProperties;

                data.enumProperty = properties[0].name;
            } else { // else mark this class as one to skip further processing on
                classMap[className].skip = true;
            }
        }

        // now that we have all source files for this class from the class itself and all
        // of its members remove duplicates and indicate the source file / files in the
        // class as well as whether there are one or more source files
        data.srcFiles = _.uniqBy(data.srcFiles, 'pathText');
        if (data.srcFiles.length === 1) {
            cls.srcLink = data.srcFiles[0].path;
        } else {
            data.myMeta.srcFiles = data.srcFiles;
            cls.multiSrc = true;
        }
    }

    /**
     * @private
     * Used by {@link #decorateClass} to create sub-objects for configs, properties, and
     * methods
     * @param {String} type The member type being processed
     * @param {Object} data The class object to be passed to the template
     * @param {String} strA The first property string
     * @param {String} strB The second property string
     * @return {Object} The prepared object
     */
    splitMemberGroups (type, data, strA, strB) {
        //this.log(`Begin 'SourceApi.splitMemberGroups'`, 'log');
        let obj = {},
            a = _.filter(data[strA], (obj) => {
                return !obj.hide;
            }),
            b = _.filter(data[strB], (obj) => {
                return !obj.hide;
            });

        obj['has' + Utils.capitalize(strA)] = !!a.length;
        obj['has' + Utils.capitalize(strB)] = !!b.length;
        obj[strA] = a;
        obj[strB] = b;

        return obj;
    }

    /**
     * Process all members of a given type
     * @param {String} className The name of the class that the members belong to
     * @param {String} type The type of member being processed
     * @param {Object[]} items Array of member objects to process
     * @return {Object[]} Array of processed member objects
     */
    processMembers (className, type, items) {
        //this.log(`Begin 'SourceApi.processMembers'`, 'log');
        let prepared        = this.classMap[className].prepared,
            i               = 0,
            len             = items.length,
            capitalizedType = Utils.capitalize(type);

        // loop over the member groups.  Indicate on the class object that each member
        // type is present and process the member object itself.
        for (; i < len; i++) {
            prepared[`has${capitalizedType}`] = true;
            this.processMember(className, type, items[i]);
        }

        // add hasProperties in case there is a class with only static properties
        //  .. the template wants to know if there are ANY properties
        if (prepared['hasStatic-properties']) {
            prepared.hasProperties = true;
        }
        //  .. same goes for methods
        if (prepared['hasStatic-methods']) {
            prepared.hasMethods = true;
        }

        return items;
    }

    /**
     * Process the raw class member object from Doxi for consumption by the HTML docs or
     * @param {String} className The name of the class that the members belong to
     * @param {String} type The type of member being processed
     * @param {Object} member The member object to process
     */
    processMember (className, type, member) {
        let classMap   = this.classMap,
            raw        = classMap[className].raw,
            prepared   = classMap[className].prepared,
            srcFileMap = this.srcFileMap,
            rawRoot    = raw.global.items[0],
            clsName    = rawRoot.name,
            name       = member.name;

        // get the source file path for the class member
        //
        // .. we'll exclude the check if type was not passed (params being processed) or
        // if there is a from property since that means the member came from some
        // ancestor class, not the class currently being processed
        if (type && !member.from) {
            let srcFilePath = this.getSourceFilePath(member, raw);

            // add the member source file info to the srcFiles array
            //
            // .. wrapped in a conditional since some members don't have an explicit src
            // object like evented events that are inferred by their class / mixins
            if (srcFilePath) {
                // get the source filename of the output source HTML
                let filename      = this.srcFileMap[srcFilePath].filename + '.html',
                    relPath       = Path.relative(this.options._myRoot, this.apiSourceDir) + '/',
                    sanitizedPath = srcFilePath.replace(relPath, '').replace(/(\.\.\/)/g, ''),
                    srcFileObj    = {
                        pathText : sanitizedPath,
                        path     : filename
                    };

                prepared.srcFiles.push(srcFileObj);
            }
        }

        // set the type to what the template is expecting for the SASS sections
        if (type === 'vars') {
            member.$type = 'css_var-S';
        }
        if (type === 'sass-mixins') {
            member.$type = 'css_mixin';
        }

        // split the member type if there are multiple
        if (member.type !== null) {
            member.type = this.splitInline(member.type,  ' / ');
        }
        member.text = this.markup(member.text);

        member.params     = [];
        member.returns    = [];
        member.properties = [];

        if (member.items) {
            let i   = 0,
                len = member.items.length;

            for (; i < len; i++) {
                let item = member.items[i];

                // prepare the param and return text
                if (item.text && (item.$type === 'param' || item.$type === 'return' || item.$type === 'property')) {
                    item.text = this.markup(item.text);
                }
                // linkify the return types
                if (item.$type === 'return' || item.$type === 'param') {
                    item.type = this.splitInline(item.type,  ' / ');
                }
                if (item.$type === 'return') {
                    member.returns.push(item);
                    member.hasReturn = true;
                }
                if (item.$type === 'param') {
                    member.params.push(item);
                }
                if (item.$type === 'property') {
                    member.properties.push(item);
                    member.hasProperties = true;
                }

                // process any sub-items that this param / property may have
                if (item.items) {
                    //this.processMembers(className, type, item.items);
                    this.processMember(className, null, item.items);
                }
            }

            // cache the private params in their own array for collection for removal
            // from the public params
            member.privateParams = [];
            // loop the params to see if there are any public params and if so say that
            // the member has params
            // also, collect up private params to be removed from the params list

            for (i = 0; i < member.params.length; i++) {
                let param = member.params[i];

                if (param.access === undefined) {
                    member.hasParams = true;
                }
                if (param.access === 'private') {
                    member.privateParams.push(param);
                }
            }
            // filter out the private params
            member.params = Utils.difference(member.params, member.privateParams);
        }

        // cache the instance and static methods and properties
        if (type === 'methods') {
            prepared.instanceMethods.push(member);
            // used when creating accessor methods
            prepared.instanceMethodsObj[name] = member;
        }
        if (type === 'static-methods') {
            prepared.staticMethods.push(member);
        }
        if (type === 'properties') {
            prepared.instanceProperties.push(member);
        }
        if (type === 'static-properties') {
            prepared.staticProperties.push(member);
        }

        if (type === 'events' || type === 'methods' || type === 'static-methods' || type === 'sass-mixins') {
            member.listParams = member.hasParams;
            member.listReturn = member.hasReturn;
        }

        // collect up the required and optional configs for sorting later
        if (type === 'configs') {
            member.$type = 'cfg'; // needed for linking using past parser schema
            prepared[member.required ? 'requiredConfigs' : 'optionalConfigs'].push(member);
        }

        // find the source class and note whether the member comes from an ancestor class
        member.srcClass     = member.from || clsName;
        member.srcClassText = member.srcClass;
        member.isInherited  = member.srcClass !== clsName;
        member.hide         = member.fromObject = member.from === 'Object';
        // TODO is this necessary if all of the $types are correct by the time we get here?
        member.linkType     = member.$type;

        // TODO is this necessary if all of the $types are correct by this time?
        if (member.static) {
            member.linkType = 'static-' + member.linkType;
        }

        // TODO seems we shouldn't HAVE to do this here.  I'd think this could be set as data on the member and the template stipulate the markup
        /*member.srcLink = '<div class="viewSource">' +
                         '<a target="_blank" href="src/' +
                            fileLink + '#' + member.srcClass + '-' + member.linkType + '-' + member.name + '">' +
                         'view source</a></div>';*/

        //member.srcLink = 'src/'
        //console.log(this.srcFileMap[className].filename);
        let src = member.src,
            idx = src && (src.text || src.name || src.constructor).split(',')[0],
            srcFile = Utils.isEmpty(idx) ? null : raw.files[idx];

        if (srcFile) {
            let filename = this.srcFileMap[srcFile].filename,
                srcClass = member.srcClass,
                type     = member.linkType;

            member.srcLink = `${filename}.html#${srcClass}-${type}-${name}`;
        }

        member.access = member.access || 'public';
        member.accessMini = member.access.substr(0, 3);

        if (member.static === true) {
            member.$type = 'static-' + member.$type;
        }
    }

    /**
     * @private
     * Injects getter and setter methods for config options with `accessor: true`.
     * Decorates bindable configs with `bindable: true`.  Used by {@link #decorateClass}
     * after {@link #processMembers} is complete
     * @param {Object} data The class object to be passed to the HTML template
     */
    postProcessConfigs (data) {
        let instanceMethods    = data.instanceMethods,
            instanceMethodsObj = data.instanceMethodsObj,
            configsObj         = data.configs,
            optionalConfigs    = configsObj.optionalConfigs,
            requiredConfigs    = configsObj.requiredConfigs,
            configs            = optionalConfigs.concat(requiredConfigs),
            configsLen         = configs.length,
            i                  = 0,
            mixins             = data.mixed && data.mixed.split(','),
            mixesBindable      = mixins && mixins.includes('Ext.mixin.Bindable');

        for (; i < configsLen; i++) {
            let config      = configs[i],
                name        = config.name || '',
                capitalName = Utils.capitalize(name),
                // edge cases like 'ui' and 'setUI'
                upperName   = name.toUpperCase(),
                accessor    = config.accessor;

            if (!config.name) {
                this.log('Missing config name: ' + JSON.stringify(config, null, 4), 'error');
            }

            // set the capitalized name on the config for use by the template
            config.capitalName = capitalName;

            // cache any existing getter / setter instance methods
            let g = config.getter = instanceMethodsObj[`get${capitalName}`] ||
                            instanceMethodsObj[`get${upperName}`];
            let s = config.setter = instanceMethodsObj[`set${capitalName}`] ||
                            instanceMethodsObj[`set${upperName}`];

            // if there is a getter or the config is accessor decorate the getter
            // method config
            if (g || accessor === true || accessor === 'r') {
                let idx = g ? instanceMethods.indexOf(g) : null;

                if (g) {
                    g.isGetter = true;
                }

                let getterName = g ? g.name : `get${capitalName}`,
                    getterCfg  = {
                        name         : getterName,
                        $type        : g ? 'placeholder-simple' : 'placeholder-accessor',
                        access       : g ? g.access : config.access,
                        text         : 'see: <a href="#method-' + getterName + '">' + config.name + '</a>',
                        isInherited  : g ? g.isInherited : config.isInherited,
                        isAutoGetter : !g,
                        srcLink      : config.srcLink,
                        srcClass     : config.srcClass,
                        srcClassText : config.srcClassText
                    };

                // if the getter came from the instance methods directly
                if (idx) {
                    // we're replacing the getter method in the instance methods with
                    // the placeholder config
                    instanceMethods[idx] = getterCfg;
                } else {
                    // else add it
                    if (instanceMethods) {
                        instanceMethods.push(getterCfg);
                    }
                }
            }
            // if there is a setter or the config is accessor decorate the setter
            // method config
            if (s || accessor === true || accessor === 'w') {
                let idx = s ? instanceMethods.indexOf(s) : null;

                if (s) {
                    s.isSetter = true;
                }

                let setterName = s ? s.name : `set${capitalName}`,
                    setterCfg  = {
                        name         : setterName,
                        $type        : s ? 'placeholder' : 'placeholder-accessor',
                        access       : s ? s.access : config.access,
                        text         : 'see: <a href="#method-' + setterName + '">' + config.name + '</a>',
                        isInherited  : s ? s.isInherited : config.isInherited,
                        isAutoSetter : !s,
                        srcLink      : config.srcLink,
                        srcClass     : config.srcClass,
                        srcClassText : config.srcClassText
                    };

                // if the getter came from the instance methods directly
                if (idx) {
                    // we're replacing the getter method in the instance methods with
                    // the placeholder config
                    instanceMethods[idx] = setterCfg;
                } else {
                    // else add it
                    if (instanceMethods) {
                        instanceMethods.push(setterCfg);
                    }
                }
                config.hasSetter = true;
            }

            // decorate the config as `bindable: true` if there is a setter method
            if (config.hasSetter && mixesBindable) {
                config.bindable = true;
            }

            // finally, note on any accessor configs when a getter / setter
            // should be added automatically for accessor configs that don't
            // have explicitly described getter / setter methods
            if (accessor) {
                config.autoGetter = !g;
                config.autoSetter = !s;
            }
        }
    }

    /**
     * @param {String} suffix A suffix to append to the search key.  Helpful when you are
     * combining multiple search results together.
     */
    getApiSearch () {
        //this.log(`Begin 'SourceApi.getApiSearch'`, 'info');
        let map         = this.classMap,
            classNames  = Object.keys(map),
            i           = 0,
            len         = classNames.length,
            //toolkit     = this.options.prodVerMeta.toolkit,
            toolkit     = this.options.toolkit,
            searchIndex = this.apiSearchIndex,
            // suffix allows us to combine toolkits in one search
            suffix = toolkit.charAt(0) || '',
            typeRef     = {
                optionalConfigs     : 'c',
                requiredConfigs     : 'c',
                instanceProperties  : 'p',
                staticProperties    : 'sp',
                instanceMethods     : 'm',
                staticMethods       : 'sm',
                events              : 'e',
                vars                : 'v',
                "sass-mixins"       : 'x'//,
                //"sass-mixin-params" : 'z'
            },
            memberTypes = [ // all possible member types in a given class
                'requiredConfigs',
                'optionalConfigs',
                'instanceProperties',
                'staticProperties',
                'instanceMethods',
                'staticMethods',
                'events',
                'vars',
                'sass-mixins'
            ];

        // loop over all class names to parse search from the class map
        for (; i < len; i++) {
            let className = classNames[i],
                cls       = map[className].prepared,
                key       = `${i}${suffix}`;

            // caches the member type short names on the class object for use in the
            // processMemberSearch method
            cls.typeRef = typeRef;

            // record the class name and toolkit
            searchIndex[key] = {
                n : cls.name,
                t : toolkit ? toolkit : null
            };

            // record the class access level
            if (cls.access) {
                searchIndex[key].a = 'i';
            }
            // record the alias / alias list
            if (cls.alias) {
                let alias = cls.alias.split(',');
                searchIndex[key].x = alias;
            }
            // record an entry for all alternate class names
            if (cls.alternateClassNames) {
                let altClassNames = cls.alternateClassNames.split(','),
                    j             = 0,
                    namesLength   = altClassNames.length;

                searchIndex[key].g = altClassNames;

                for (; j < namesLength; j++) {
                    let altName = altClassNames[j];

                    searchIndex[altName + key] = {
                        n : altName,
                        t : toolkit    ? toolkit : null,
                        a : cls.access ? 'i'     : null
                    };
                }
            }

            let typesLen = memberTypes.length,
                k        = 0;

            // loop over all possible member types
            for (; k < typesLen; k++) {
                let type       = memberTypes[k],
                    members    = cls[type],
                    membersLen = members ? members.length : 0,
                    l          = 0;

                // then over the members for each type to process each member into the
                // search object
                for (; l < membersLen; l++) {
                    let member = members[l];

                    this.processMemberSearch(member, key, cls, type, searchIndex);
                }
            }
        }

        return searchIndex;
    }

    /**
     * Process the class member for the API search output
     * @param {Object} member The member Object
     * @param {String} key The reference key for this class in the searchIndex object
     * @param {Object} cls The original class object
     * @param {String} type The member type
     * @param {Object} searchIndex The search object that all assembled search is being
     * cached on until it's output
     */
    processMemberSearch (member, key, cls, type, searchIndex) {
        //this.log(`Begin 'SourceApi.processMemberSearch'`, 'log');
        if (!member.hide && !member.from) {
            let acc = member.access === 'private' ? 'i' : (member.access === 'protected' ? 'o' : 'p'),
                extras;

            // evaluate possible extra metadata for this method
            if (member.removedVersion) {
                extras = 'r';
            } else if (member.deprecatedVersion) {
                extras = 'd';
            } else if (member.static) {
                extras = 's';
            } else if (member.readonly) {
                extras = 'ro';
            }

            // add any SASS mixin params found to the search index so they're discoverable in a global search
            if (member.$type === 'css_mixin' && member.items && member.items.length) {
                Utils.each(member.items, function (param) {
                    searchIndex[key]['z.' + param.name] = {
                        a : acc,
                        t : member.name
                    };
                });
            }

            // record the member access
            searchIndex[key][cls.typeRef[type] + '.' + member.name] = {
                a : acc
            };

            // record any extra metadata
            if (extras) {
                searchIndex[key][cls.typeRef[type] + '.' + member.name].x = extras;
            }

            // record whether a member is an accessor or not
            if (member.accessor) {
                searchIndex[key][cls.typeRef[type] + '.' + member.name].g = 1;
            }
        }
    }

    /**
     * Writes the parsed search output from all API classes to disk for use by the UI
     * @return {Object} Promise
     */
    outputApiSearch () {
        let apiSearch = this.apiSearchIndex,
            output    = JSON.stringify(apiSearch),
            options   = this.options,
            product   = options.product,
            version   = options.version;

        version = options.prodVerMeta.hasVersions ? `${version}` : '';
        output = `DocsApp.apiSearch =${output};`;

        return new Promise((resolve, reject) => {
            //this.log(`Begin 'SourceApi.outputApiSearch'`, 'info');
            Fs.writeFile(Path.join(this.jsDir, `${product}-${version}-apiSearch.js`), output, 'utf8', err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Sort the API trees
     * @return {Object} The sorted API tree
     */
    sortTrees (apiTrees) {
        let treeKeys = Object.keys(apiTrees),
            len      = treeKeys.length,
            apiTree;

        if (len === 1) {
            apiTree = {
                API : this.sortTree(apiTrees[treeKeys[0]])
            };
        } else {
            let i = 0;

            apiTree = {
                API : {}
            };

            for (; i < len; i++) {
                let key = treeKeys[i];

                apiTree.API[key] = this.sortTree(apiTrees[key]);
            }
        }

        return apiTree;
    }

    /**
     * Decorates parent nodes as private if all child nodes are private
     * @param {Array} nodes The array of nodes to process
     * @param {Object} parent The parent node of the `nodes` array param.  Will be
     * undefined if the root nodes of the tree are being processed.
     */
    decoratePrivateNodes (nodes, parent) {
        // initially we'll mark the parent node as private and later change it to public
        // if there are public children
        if (parent) {
            parent.access = 'private';
        }

        let len         = nodes.length,
            startingLen = len;

        // loop over all passed nodes
        while (len--) {
            let node     = nodes[len],
                children = node.children;

            // cache a reference to the parent node on each node for later use
            node.parentNode = parent;

            // if the node has children then process them first before proceeding with
            // the current node
            if (children) {
                this.decoratePrivateNodes(children, node);
            } else {
                // if the node has a parent then walk up the tree node's hierarchy and
                // with each parent node we'll evaluate all of its children and if it has
                // any public items then we'll mark the current parent node as public
                if (parent) {
                    while (parent) {
                        let access = 'private';

                        parent.children.forEach(child => {
                            if (child.access !== 'private') {
                                access = 'public';
                            }
                        });

                        parent.access = access;
                        parent = parent.parentNode;
                    }
                }
            }
            // finally, we'll delete the reference to the parent node else JSON.stringify
            // will fail as it's trying to stringify a circular reference
            delete node.parentNode;
        }
    }

    /**
     * Output the api tree for UI nav once all classes are processed
     * @return Promise wrapping the writing of the api tree file
     */
    outputApiTree () {
        return new Promise((resolve, reject) => {
            //this.log(`Begin 'SourceApi.outputApiTree'`, 'info');
            let apiTrees = this.apiTrees,
                apiTree  = this.sortTrees(apiTrees);

            // process all trees and indicate parent nodes as private if all child nodes
            // are
            if (_.isArray(apiTree.API)) {
                this.decoratePrivateNodes(apiTree.API);
            } else {
                Object.keys(apiTree.API).forEach(key => {
                    this.decoratePrivateNodes(apiTree.API[key]);
                });
            }

            apiTree = JSON.stringify(apiTree, null, 4);

            let wrap       = `DocsApp.apiTree = ${apiTree}`,
                product    = this.getProduct(),
                version    = this.options.version,
                dest       = Path.join(this.jsDir, `${product}-${version}-apiTree.js`);

            Fs.writeFile(dest, wrap, 'utf8', (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    /**
     * Create an HTML version of the each source JS file in the framework
     * @return {Object} Promise
     */
    createSrcFiles () {
        if (this.options.skipSourceFiles === true) {
            this.log('Skipping creating source HTML files: --skipSourceFiles');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            //this.log(`Begin 'SourceApi.createSrcFiles'`, 'info');
            console.log('CREATE SOURCE FILES !!!');
            let i         = 0,
                map       = this.srcFileMap,
                keys      = Object.keys(map),
                len       = keys.length,
                inputDir = this.doxiInputDir;

            for (; i < len; i++) {
                keys[i] = {
                    path     : keys[i],
                    inputDir : inputDir
                };
            }

            // time stamp and log status
            //this.openStatus('Create source HTML files');

            _.remove(keys, item => {
                return item.path.includes('/enums/');
            });

            // loop over the source file paths and HTML-ify them
            this.processQueue(keys, __dirname + '/htmlify.js', (items) => {
                // once all files have been HTML-ified add anchor tags with the name of each
                // class-member so that you can link to that place in the docs
                let anchored = this.addAnchorsAll(items);

                // conclude 'Create source HTML files' status
                //this.closeStatus();

                // output all of the source HTML files
                this.outputSrcFiles(anchored)
                .then(resolve)
                .catch(this.error.bind(this));
            });
        });
    }

    /**
     * Output all source SDK class files as HTML pages
     * @param {Object[]} contents The contents and file names to output.  Each item in
     * the `contents` should be an object with two keys:
     *
     *  - **html**: the HTML to output
     *  - **path**: the path of the original source file.  Used to look in the srcFileMap
     * to get the filename to output
     */
    outputSrcFiles (contents) {
        return new Promise((resolve, reject) => {
            //this.log(`Begin 'SourceApi.outputSrcFiles'`, 'info');
            console.log('OUTPUT SOURCE FILES');
            let i       = 0,
                len     = contents.length,
                map     = this.srcFileMap,
                options = this.options,
                // TODO = this should be set globally probably in the base constructor
                //outDir  = Path.join('output', options.product, options.version, options.toolkit || 'api', 'src'),
                outDir  = Path.join(this.apiDir, 'src');

            // create the output directory
            Fs.ensureDir(outDir, () => {
                // time stamp and lot status
                //me.openStatus('Write out source HTML files')

                let writes = [];

                // loop through all items to be output
                for (; i < len; i++) {
                    writes.push(new Promise((resolve, reject) => {
                        let content  = contents[i],
                            filename = map[content.path].filename, // the filename to write out
                            // the data object to apply to the source HTML handlebars template
                            data     = {
                                content    : content.html,
                                name       : filename,
                                title      : options.prodVerMeta.prodObj.title,
                                version    : options.version,
                                // TODO figure out what numVer is in production today
                                numVer     : '...',
                                // TODO this should be output more thoughtfully than just using options.toolkit
                                meta       : options.toolkit,
                                moduleName : this.moduleName,
                                cssPath    : Path.relative(outDir, this.cssDir)
                            };

                        // write out the current source file
                        Fs.writeFile(`${outDir}/${filename}.html`, this.srcTemplate(data), 'utf8', (err) => {
                            //if (err) console.log('outputSrcFiles error');
                            if (err) reject(err);

                            delete map[content.path];
                                resolve();
                        });
                    }));
                }

                console.log('OUTPUT SOURCE FILES IS DONE !!!');

                return Promise.all(writes)
                .then(resolve)
                .catch(this.error.bind(this));
            });
        });
    }

    /**
     * Get the location array showing where the item (class or class member) was
     * discovered in the source files.
     * Supports {@link #addAnchors}
     * @param {Object} item The class or class member object containing the src location
     * coordinates
     * @return {Array} The location coordinates of the src
     */
    getLocArray (item) {
        //this.log(`Begin 'SourceApi.getLocArray'`, 'log');
        let src = item.src.text || item.src.name;

        return src ? (src).split(',').map(function (item) {
            return parseInt(item, 10);
        }) : false;
    }

    /**
     * Adds anchors to all source HTML files
     * Supports {@link #createSrcFiles}
     * @param {Object} items An object of source file path and source HTML to be
     * processed
     * @return {Object} The source path and processed HTML
     */
    addAnchorsAll (items) {
        //this.log(`Begin 'SourceApi.addAnchorsAll'`, 'info');
        let i        = 0,
            len      = items.length,
            anchored = [];

        for (; i < len; i++) {
            let item = items[i],
                html = item.html,
                path = item.path;

            anchored.push({
                html : this.addAnchors(html, path),
                path : path
            });
        }

        return anchored;
    }

    /**
     * Adds anchor tags to the HTML source denoting where each class and class member
     * documentation is located.  Additionally adds line number anchors to each line.
     * Supports {@link #addAnchorsAll} + {@link #createSrcFiles}
     * @param {String} html The un-anchored HTML representing the framework class source
     * js file
     * @param {String} srcPath The path of the source class file
     * @return {String} The source HTML with anchors added
     */
    addAnchors (html, srcPath) {
        //this.log(`Begin 'SourceApi.addAnchors'`, 'log');
        let src    = this.srcFileMap[srcPath],
            clsSrc = src.input;

        if (clsSrc) {
            let cls         = clsSrc.global.items[0], // the class object
                clsName     = cls.name,               // class name
                memberTypes = cls.items,              // array of member type groups
                // split out all each line in the HTML
                lines       = html.split('<div class="line">'),
                loc;

            // if the class itself has documentation add the anchor for it
            if (cls.src) {
                // find the location within the file where the class is described
                loc = this.getLocArray(cls);
                // and prepend an anchor tag with the name of the class
                lines[loc[1]] = `<a name="${clsName}">` + lines[loc[1]];
            }

            // if there are any class members (an array of class member types)
            if (memberTypes) {
                let i   = 0,
                    len = memberTypes.length;

                // loop over each type group
                for (; i < len; i++) {
                    let group      = memberTypes[i],
                        // the collection of members of this type
                        members    = group.items,
                        membersLen = members.length;

                    // if there are members in this group
                    if (members && membersLen) {
                        let group = memberTypes[i],
                            type = this.memberTypesMap[group.$type],
                            // get the class + member type info to prefix to the
                            // following members as they're processed
                            name  = `${clsName}-${type}-`,
                            j     = 0;

                        // loop over all members in this type group
                        for (; j < membersLen; ++j) {
                            let member = members[j],
                                memloc;

                            // if the member has description in this class
                            if (member.src) {
                                // get the location where it's described
                                memloc = this.getLocArray(member);
                            }

                            // back the pointer up one so it's pointing to the top of
                            // the description
                            if (memloc && memloc[1]) {
                                memloc[1] = memloc[1] - 1;
                            }

                            // inject the class and member type and member name
                            if (memloc && memloc[0] === loc[0]) {
                                let memberName = member.name;

                                lines[memloc[1]] = `<a name="${name}${memberName}">` + lines[memloc[1]];
                            }
                        }
                    }
                }
            }

            let i = 0,
                len = lines.length;

            // loop over all of the lines and add an anchor for line number linking
            for (; i < len; i++) {
                if (i !== 0) {
                    lines[i] = `<a name="line${i}">` + lines[i];
                }
            }

            // re-assemble all of the split lines into an HTML string
            html = lines.join('<div class="line">');
        }

        return html;
    }
}

module.exports = SourceApi;
