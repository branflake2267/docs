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

const Base = require('../base'),
  Path = require('path'),
  Utils = require('../shared/Utils'),
  Handlebars = require('handlebars'),
  Fs = require('fs-extra'),
  Shell = require('shelljs'),
  //path       = require('path'),
  // TODO - is Mkdirp being used in any module or it's all Fs-extra now?  Might be able to remove its require statements if it can be purged via Fs-extra
  //Mkdirp     = require('mkdirp'),
  _ = require('lodash'),
  WidgetRe = /widget\./g,
  sencha = require('@sencha/cmd'),
  { spawnSync } = require('child_process');

const Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

class SourceApi extends Base {
  constructor(options) {
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
  get parentChain() {
    return super.parentChain.concat([Path.parse(__dirname).base]);
  }

  /**
   * Default entry point for this module. Run the target source-api.
   */
  run() {
    this.log(`Begin 'SourceApi run'`, 'info');

    let options = this.options;
    let meta = this.options.prodVerMeta;
    let toolkitList = Utils.from(meta.hasToolkits ? (options.toolkit || meta.toolkits) : false);

    // Build the doxi files for api docs
    let promises = [];
    toolkitList.forEach((toolkit) => {
      promises.push(this.prepareApiSource(toolkit));
    });

    return Promise.all(promises)
      .then(() => {
        console.log("SourceApi.run: Completed.");
      })
      .catch(this.error.bind(this));
  }

  /**
   * Returns the name of the doxi config file name to use when parsing the SDK.  Uses
   * the product, version, and toolkit currently being acted on.
   * @return {String} The doxi config file name
   */
  get doxiCfgFileName() {
    let { options, apiProduct: product, apiVersion: version } = this;
    let toolkits = this.getToolkits(product, version);
    let toolkit = toolkits ? options.toolkit : 'config';
    let path = this.getDoxiCfgPath();

    this.log('\tgetDoxiCfgPath path=' + path + ' versin=' + version);

    // find the nearest matching config file based on version
    let file = this.getFileByVersion(path, version);

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
  getDoxiCfgPath(fromDir) {
    const dir = fromDir || __dirname;

    return Path.resolve(
      dir,
      Path.join(
        Path.relative(dir, this.options._myRoot),
        Utils.format(this.options.parserConfigPath, { product: this.getProduct() })
      )
    );
  }

  /**
   * Returns the doxi config using the current product / version (used by the
   * {@link #createTempDoxiFile} method)
   * @return {Object} The original doxi config
   */
  get doxiCfg() {
    let path = Path.join(this.getDoxiCfgPath(), this.doxiCfgFileName);
    this.log("doxiCfg path=" + path);
    let doxiCfgJson = Fs.readJsonSync(path);
    return doxiCfgJson;
  }

  /**
   * The doxi config used by the app processors.  It is created using the
   * {@link #createTempDoxiFile} method.
   * @return {Object} The doxi config object used by the docs processors
   */
  get tempDoxiCfg() {
    return Fs.readJsonSync(Path.join(this.tempDir, 'tempDoxiCfg.json'));
  }

  /**
   * The full path to the temp directory used to host the doxi config file assembled
   * for the docs processors
   * @return {String} The path to the temp directory
   */
  get tempDir() {
    return Path.join(this.options._myRoot, 'build', "_temp");
  }

  /**
   * The full path to the directory housing all of the class json files created by
   * running doxi for all products / versions.  Used by {@link #getDoxiInputDir}
   * @return {String} The path to the directory of the doxi-processed files
   */
  get rootApiInputDir() {
    let { options } = this;

    return Path.join(options._myRoot, options.apiInputDir);
  }

  /**
   * The full path of the doxi output files for the current product / version (/
   * toolkit potentially)
   * @param {String} [buildType=combo-nosrc] The doxi build type you want the input 
   * directory for
   * @return {String} The path to the doxi files for the current product / version
   */
  getDoxiInputDir(buildType) {
    buildType = buildType || this.options.doxiBuild || 'combo-nosrc';

    let cfgDir = this.getDoxiCfgPath(),
      cfg = this.tempDoxiCfg,
      outputDir = cfg.outputs[buildType].dir,
      relToDoxiCfg = Path.resolve(__dirname, cfgDir),
      inputDir = Path.resolve(relToDoxiCfg, outputDir);

    return inputDir;
  }

  /**
   * Returns the input file name for the given `buildType`
   * 
   * **NOTE:** Does not apply to the `combo-nosrc` build type as that generates an 
   * input file for each class parsed by the Doxi run
   * 
   * @param {String} buildType The build type to read the input file name from within 
   * the Doxi config file
   * @return {String} The input file generated by doxi
   */
  getDoxiInputFile(buildType = this.options.doxiBuild) {
    const cfg = this.tempDoxiCfg;

    return cfg.outputs[buildType].file;
  }

  /**
   * Create the doxi config file used when processing the docs.  The original config
   * file for the given product / version is fetched and any placeholder tokens in the
   * paths are replaced with values supplied by the passed options (projectDefaults,
   * app.json, CLI)
   */
  createTempDoxiFile(product = this.getProduct()) {
    this.log(`Begin 'SourceApi.createTempDoxiFile'`, 'info');
    const { options, doxiCfg: cfg } = this;
    const { doxiProcessLinks } = options;
    const { sources, outputs } = cfg;
    const len = sources.length;
    const apiInputDir = this.rootApiInputDir;

    for (let i = 0; i < len; i++) {
      const { path } = sources[i];
      const jLen = path.length;

      for (let j = 0; j < jLen; j++) {
        path[j] = Utils.format(path[j], {
          apiSourceDir: this.apiSourceDir,
          _myRoot: options._myRoot
        });
      }
    }

    const inputObj = {
      apiInputDir: apiInputDir,
      product: product,
      version: this.apiVersion,
      toolkit: options.toolkit || ''
    };

    outputs['combo-nosrc'].dir = Utils.format(outputs['combo-nosrc'].dir, inputObj);
    outputs['combo-nosrc'].links = doxiProcessLinks;
    outputs['all-classes'].dir = Utils.format(outputs['all-classes'].dir, inputObj);
    outputs['all-classes'].links = doxiProcessLinks;
    if (outputs['all-classes-flatten']) {
      outputs['all-classes-flatten'].dir = Utils.format(outputs['all-classes-flatten'].dir, inputObj);
      outputs['all-classes-flatten'].links = doxiProcessLinks;
    }

    if (!Fs.existsSync(this.tempDir)) {
      Fs.ensureDirSync(this.tempDir);
    }

    Fs.writeJsonSync(Path.join(this.tempDir, 'tempDoxiCfg.json'), cfg);
    this.log(`End 'SourceApi.createTempDoxiFile'`, 'info');
  }

  /**
   * Checks to see if the doxi files folder is missing (not yet created with a previous
   * run of the docs processor) or empty
   * @return {Boolean} True if the folder is missing or empty
   */
  get doxiInputFolderIsEmpty() {
    const dir = this.getDoxiInputDir();

    if (!Fs.existsSync(dir) || this.isEmpty(dir)) {
      return true;
    }
  }

  /**
   * Returns the api source directory used by Doxi to create all of the doxi (input)
   * files.  By default the product's repo (if configured in the projectDefaults or
   * app.json) will be appended to the SDK source directory.
   */
  get apiSourceDir() {
    let { options } = this,
      cfg = Object.assign({}, options, {
        repo: options.products[this.apiProduct].repo || null
      });

    var p = Path.join(
      options._myRoot,
      Utils.format(
        options.apiSourceDir,
        cfg
      )
    );

    // Something went wrong with the api source
    if (p.indexOf("null") > -1) {
      this.error("apiSourceDir is null. apiProduct=" + this.apiProduct);
      this.error("apiSourceDir is null. repo=" + options.products[this.apiProduct].repo);
    }

    //console.log(">>> repo=" + options.products[this.apiProduct].repo);

    return p;
  }

  /**
   * Returns the product passed by the CLI build command
   * @return {String} The product to generate the API output for
   */
  get apiProduct() {
    const { options } = this;

    return this._apiProd = options.product;
  }

  /**
   * Returns the version passed by the CLI build command or the `currentVersion` from
   * the config file if there was no version passed initially
   * @return {String} The version number for the current product
   */
  get apiVersion() {
    const { options } = this;

    return options.version || options.currentVersion;
  }

  /**
   * Determines whether doxi should be run or can be skipped
   * @return {Boolean} Returns `true` if the doxi input folder is empty
   */
  get doxiRequired() {
    return this.doxiInputFolderIsEmpty;
  }

  /**
   * Returns the versions for the current product that are eligible to be diffed; all 
   * of the versions in the version menu minus the last one one the list and any 
   * versions in the build exceptions list.
   * @return {String[]} Array of eligible versions
   */
  get diffableVersions() {
    const { options, apiProduct } = this,
      { products, buildExceptions } = options,
      { productMenu = [] } = products[apiProduct];

    return _.differenceWith(
      productMenu,
      buildExceptions[apiProduct] || [],
      _.isEqual
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
  getApiTree(className) {
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
  getApiMetaData(data) {
    const meta = this.commonMetaData;

    if (data && data.cls) {
      const { name } = data.cls,
        { apiDirName } = this,
        docsRelativePath = Path.relative(
          this.apiDir,
          this.options.outputDir
        );

      Object.assign(meta, {
        //navTreeName : 'API',
        //navTreeName : apiDirName === 'api' ? 'API' : apiDirName,
        navTreeName: apiDirName === 'api' ? 'API' : `API.${apiDirName}`,
        myId: name,
        rootPath: '../',
        pageType: 'api',
        pageName: name,
        docsRootPath: `${docsRelativePath}/`
      });

      //this.log(`CONFIG: source-api: meta.navTreeName=${apiDirName}`);
    }

    // DocsApp.meta = myMeta - search hint
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
  getSourceFilePath(obj, raw) {
    let srcObj = obj.src,
      files = raw.files,
      srcFilePath;

    if (srcObj) {
      let target = srcObj.inheritdoc || srcObj.text || srcObj.name || srcObj.constructor;

      if (target && target.split) {
        let srcArr = target.split(','),
          srcIdx = srcArr[0];

        srcFilePath = files[srcIdx];
      } else {
        this.log('Source file could not be found', 'info');
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
  prepareApiSource(toolkit) {
    this.options.toolkit = toolkit;

    this.log('prepareApiSource: Starting SourceApi.prepareApiSource... TOOLKIT=' + this.options.toolkit);

    // Create the file Doxi will use to parse the SDK
    this.createTempDoxiFile();

    this.classMap = {};
    this.srcFileMap = {};

    return this.doRunDoxi()
      .then(this.readDoxiFiles.bind(this))
      .then(() => {
        console.log("prepareApiSource: Completed! toolkit=" + this.options.toolkit);
      })
      .catch(this.error.bind(this));
  }

  /**
   * Public method to run Doxi ad hoc
   */
  runDoxi(buildName) {
    let force = this.options.forceDoxi;
    this.options.forceDoxi = true;
    this.createTempDoxiFile();
    this.doRunDoxi(buildName);
    this.options.forceDoxi = force;
  }

  /**
   * Runs doxi against the SDK to output class files used by the docs post processors (HTML docs or Ext app)
   */
  doRunDoxi(buildName) {
    return new Promise((resolve) => {
      let { options } = this;
      let { doxiQuiet, forceDoxi } = options;
      let triggerDoxi = this.triggerDoxi;
      let doxiBuild = buildName || options.doxiBuild || 'combo-nosrc';
      let doxiRequired = this.doxiRequired;
      let runQuiet = doxiQuiet === true ? '--quiet' : '';

      this.log('RunDoxi: Begin doRunDoxi buildName=' + buildName);
      this.log('\tdoRunDoxi: apiProduct=' + this.apiProduct + ' apisourceDir=' + this.apiSourceDir);

      this.syncRemote(this.apiProduct, this.apiSourceDir);

      // Skip processing doxi
      if (forceDoxi === false) {
        return;
      }

      // If the `forceDoxi` options is passed or the doxi input directory is empty / missing then run doxi
      if (forceDoxi || doxiRequired || (triggerDoxi && triggerDoxi[this.apiProduct])) {
        // Empty the folder (or remove the input file) first before running doxi
        if (doxiBuild === 'combo-nosrc') {
          if (Fs.existsSync(this.getDoxiInputDir())) {
            Fs.emptyDirSync(this.getDoxiInputDir());
          }
        } else {
          const inputFile = Path.join(this.getDoxiInputDir(doxiBuild), this.getDoxiInputFile(doxiBuild));
          if (Fs.existsSync(inputFile)) {
            Fs.rmdirSync(inputFile)
          }
        }

        // Wait for the generation to complete
        this.generateDoxiConfig(this.tempDir, doxiBuild, runQuiet);
      }

      this.log('RunDoxi: Completed: doxiBuild=' + doxiBuild);
      resolve();
    })
      .catch(this.error.bind(this));
  }

  /**
   * Generates a theme package with provided arguments in config object (name and baseTheme).
   * @param {String} tmpDir The directory to output the doxi config to. 
   * @param {*} doxiBuild The doxi build flag. 
   */
  generateDoxiConfig(tmpDir, doxiBuild, runQuiet) {
    console.log('generateDoxiConfig: Started...');
    console.log('generateDoxiConfig: Starting CMD to build doxi...');

    var tempDoxiCfgFile = Path.join(tmpDir, 'tempDoxiCfg.json');

    console.log("generateDoxiConfig: tempDoxiCfgFile=" + tempDoxiCfgFile);

    const args = [
      runQuiet,
      'doxi',
      'build',
      '-p', tempDoxiCfgFile,
      doxiBuild
    ];

    // TODO increase the verbosity of the output
    spawnSync(sencha, args, { stdio: 'inherit' });

    console.log('generateDoxiConfig: Completed CMD doxi output!');
  }

  /**
   * Catalog each of the source file paths used in building the classes of the
   * framework.  Data relating to those source files like the source HTML file name can
   * then be associated to the source file path.
   * @param {Array/String} files A file or array of files to be added to the map
   */
  mapSrcFiles(files) {
    //this.log(`Begin 'SourceApi.outputApiSearch'`, 'info');
    files = Utils.from(files);

    let i = 0,
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
  createSrcFileMap() {
    //this.log(`Begin 'SourceApi.createSrcFileMap'`, 'info');
    let inputDir = this.getDoxiInputDir();
    let map = this.srcFileMap;
    let classMap = this.classMap;
    let files = this.getFilteredFiles(Fs.readdirSync(inputDir));
    let len = files.length;
    let ops = [];
    let modifiedList = this.modifiedList;

    this.log('Processing the parsed SDK source files', 'info');

    for (let i = 0; i < len; i++) {
      ops.push(
        new Promise((resolve) => {
          let path = Path.join(inputDir, files[i]);

          console.log("createSrcFileMap: " + i + " path=" + path);

          const cls = Fs.readJsonSync(path, { throws: false });

          let [clsObj] = cls.global.items; // the class obj
          let { ignore } = clsObj;

          if (ignore === true) {
            console.log("createSrcFileMap: IGNORE. path=" + path);
            resolve();
          } else {
            let type = clsObj.$type,     // the class type (class or enum)
              validType = type === 'class' || type === 'enum',
              // the index in the files list where the class is primarily sourced
              srcIdx = (clsObj.src.text || clsObj.src.name).substring(0, 1),
              srcFiles = cls.files, // ths list of class source files
              primarySrc = srcFiles[0] || '',
              // the path of the class source from the SDK
              srcPath = srcFiles[srcIdx],
              hasOverride = clsObj.src.override,
              overrideIdx = hasOverride && hasOverride.split(',')[0],
              overridePath = overrideIdx && srcFiles[overrideIdx],
              { modifiedList } = this,
              modifiedMatch = [];

            // if there is are modified files in the SDK source then see if
            // the primary source file for the current class is in the
            // modified list.  If so, we'll mark the class as modified in the
            // classMap
            if (modifiedList && modifiedList.length) {
              modifiedMatch = _.filter(modifiedList, item => {
                return _.endsWith(primarySrc, item);
              });
            }

            // add all source files for this class to the master source file map
            this.mapSrcFiles(srcFiles || []);

            // if the current file is a "class" file then cache the contents
            // in the source file hash
            // Supports #addAnchors
            if (validType) {
              map[srcPath].input = cls;
              if (overridePath) {
                map[overridePath].input = cls;
              }
            }

            if (validType) {
              let prepared = Object.assign({}, clsObj);
              delete prepared.items;

              classMap[clsObj.name] = {
                raw: cls,
                prepared: prepared,
                modified: !!modifiedMatch.length
              };
            }

            resolve();
          }
        }).catch(this.error.bind(this))
      );
    }
    return Promise.all(ops)
      .then(() => {
        let map = this.srcFileMap;
        let keys = Object.keys(map);
        let len = keys.length;
        let names = {};
        let inputDir = this.getDoxiInputDir();

        for (let i = 0; i < len; i++) {
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
            path: keys[i],
            inputDir: inputDir
          };
        }
        console.log("createSrcFileMap: completed");
      })
      .catch(this.error.bind(this));
  }

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
  addToApiTree(className, icon, apiTree, idSuffix = '') {
    //this.log(`Begin 'SourceApi.addToApiTree'`, 'info');
    let nameArray = className.split('.'),
      elementsLen = nameArray.length,
      apiDirName = this.apiDirName;

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
      let leaf = (i === (elementsLen - 1)),
        id = this.getNodeId(className, i),
        // the default node configuration
        baseNode = {
          name: name,
          text: name,
          navTreeName: 'api',
          id: id,
          leaf: leaf,
          idSuffix: idSuffix
        };

      let target = this.getExistingNode(nodes, id),
        folderNodeCls = this.folderNodeCls,
        mapped = this.classMap[id],
        isSingleton = mapped && mapped.prepared.singleton,
        access = mapped && mapped.prepared.access,
        newNode;

      if (!leaf) {
        newNode = Object.assign(baseNode, {
          iconCls: isSingleton ? icon : folderNodeCls,
          children: []
        });
        // else we're processing a leaf node (note, this could be a node / namespace
        // like "Ext" or "ST", but we account for that in the processing above)
      } else {
        //create the leaf node configuration
        newNode = Object.assign(baseNode, {
          access: access || 'public',
          iconCls: `${icon}`
        });
      }

      if (this.classMap[id]) {
        newNode.href = `${apiDirName}/${id}.html`;

        // FRAMEWORK CHOICE
        let webComponent = this.getWebComponentDeclaration(id);
        if (webComponent) {
          newNode.webComponent = webComponent;
        }
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
  sortNodes(nodes) {
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
  sortTree(tree) {
    //this.log(`Begin 'SourceApi.sortTree'`, 'info');
    let len = tree.length,
      i = 0;

    for (; i < len; i++) {
      let node = tree[i],
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
  getNodeId(className, currentIndex) {
    //this.log(`Begin 'SourceApi.getNodeId'`, 'log');
    let nameArr = className.split('.'),
      id = [],
      i = 0;

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
  getExistingNode(nodes, name) {
    //this.log(`Begin 'SourceApi.getExistingNode'`, 'log');
    let len = nodes.length,
      i = 0,
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
   * Logs out a list of classes with no examples in the description
   */
  listMissingExamples() {
    this.bulkClassReportedUtil('doListMissingExamples');
  }

  /**
   * Logs out a list of component classes with no examples in the description
   */
  listMissingComponentExamples() {
    this.bulkClassReportedUtil('doListMissingExamples', true);
  }

  /**
   * See {@link #listMissingComponentExamples}
   * @param {Object} prepared The prepared class object
   * @param {Boolean} [componentsOnly] True to list only component classes missing an
   * example
   */
  doListMissingExamples(prepared, componentsOnly) {
    let text = prepared.text,
      extendsList = prepared.extends;

    if (text && !text.includes('@example')) {
      if (!componentsOnly || (componentsOnly && extendsList && extendsList.split(',')[0].includes('Ext.Component'))) {
        console.log('MISSING EXAMPLE', prepared.name);
      }
    }
  }

  /**
   * Logs out a list of classes with no description or a description less than 80
   * characters
   */
  listLackingDescription() {
    this.bulkClassReportedUtil('doListLackingDescription');
  }

  /**
   * See {@link #listLackingDescription}
   * @param {Object} prepared The prepared class object
   */
  doListLackingDescription(prepared) {
    let text = prepared.text;

    if (!text || (text && text.length < 80)) {
      console.log('LACKING DESCRIPTION', prepared.name);
    }
  }

  /**
   * @private
   * Helper class used to support util classes like {@link #listMissingExamples}
   * @param {String} methodName The name of the method to call passing both the
   * prepared class object from {@link #createSrcFileMap} and any passed `param`
   * @param {Object} [param] An optional param used by the specified `methodName`
   * method
   * @return {Promise}
   */
  bulkClassReportedUtil(methodName, param) {
    this.classMap = {};
    this.srcFileMap = {};

    return this.createSrcFileMap()
      .then(() => {
        let classMap = this.classMap,
          classNames = Object.keys(classMap),
          i = 0,
          len = classNames.length,
          modifiedOnly = this.options.modifiedOnly;

        // loops through all class names from the classMap
        for (; i < len; i++) {
          let className = classNames[i],
            prepared = classMap[className].prepared;

          this[methodName](prepared, param);
        }
      })
      .then(() => {
        this.concludeBuild();
      })
      .catch(this.error.bind(this));
  }

  /**
   * Entry method to process the doxi files into files for use by the HTML docs or Ext app
   */
  readDoxiFiles() {
    return this.createSrcFileMap()
      .then(() => {
        if (!Fs.existsSync(this.apiDir)) {
          Fs.ensureDirSync(this.apiDir);
        }
      })
      .then(this.processApiFiles.bind(this))
      .then(this.getApiSearch.bind(this))
      .then(this.outputApiFiles.bind(this))
      .then(this.outputApiTree.bind(this))
      .then(this.createSrcFiles.bind(this))
      .then(() => {
        this.log("readDoxiFiles: Finished. toolkit=" + this.options.toolkit);
      })
      .catch(this.error.bind(this));
  }

  /**
   * Outputs all class files from the Doxi processing (and any post-processing from
   * source-api) by passing the classname and class object to {@link #outputApiFile}
   * @return {Object} A Promise that processes all class files and calls to
   * `outputApiFile`
   */
  processApiFiles() {
    return new Promise((resolve, reject) => {
      console.log("processApiFiles: Started...");
      let classMap = this.classMap;
      let classNames = Object.keys(classMap);
      let len = classNames.length;
      let modifiedOnly = this.options.modifiedOnly;

      // loops through all class names from the classMap
      for (let i = 0; i < len; i++) {
        let className = classNames[i],
          classObj = classMap[className],
          // the prepared object is the one that has been created by
          // `createSrcFileMap` and will be processed in `decorateClass`
          prepared = classMap[className].prepared,
          apiTree = this.getApiTree(className),
          isModified = classMap[className].modified,
          modified = !modifiedOnly || (modifiedOnly && isModified);

        if (modified) {
          this.decorateClass(className);
        }

        // the class could be marked as skip=true if it's not something we wish to
        // process after running it through decorateClass.  i.e. an enums class with
        // no properties is empty so is skipped
        if (classObj.skip || (modifiedOnly && !modified)) {
          delete classMap[className];
        } else {
          this.addToApiTree(className, prepared.cls.clsSpecIcon, apiTree);
        }
      }
      console.log("processApiFiles: Completed.");
      resolve();
    });
  }

  /**
   * Outputs all API doc files
   * @return {Object} Promise
   */
  outputApiFiles() {
    this.log(`Begin 'SourceApi.outputApiFiles'`, 'info');
    let classMap = this.classMap;
    let classNames = Object.keys(classMap);
    let len = classNames.length;
    let outputs = [];

    if (!Fs.existsSync(this.apiDir)) {
      Fs.ensureDirSync(this.apiDir);
    }

    // loops through all class names from the classMap
    for (let i = 0; i < len; i++) {
      let className = classNames[i],
        // the prepared object is the one that has been created by
        // `createSrcFileMap` and will be processed in `decorateClass`
        prepared = classMap[className].prepared;

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
              if (err) this.log('outputApiFile error');
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
  processRelatedClasses() { }

  /**
   * Prepares additional api data processing prior to handing the data over to the api
   * template for final output
   * @param {Object} data The object to be processed / changed / added to before
   * supplying it to the template
   */
  processApiDataObject(data) {
    //this.log(`Begin 'SourceApi.processApiDataObject'`, 'info');
    let { apiDir } = this;

    data.prodVerPath = '../';
    data.cssPath = Path.relative(apiDir, this.cssDir);
    data.jsPath = Path.relative(apiDir, this.jsDir);
    data.imagesPath = Path.relative(apiDir, this.imagesDir);
    data.myMeta = this.getApiMetaData(data);
    data.isApi = true;
    data.description = Utils.striphtml(this.parseApiLinks(data.classText));
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
  decorateClass(className) {
    this.log(`decorateClass: ${className}`, 'log');
    const {
      options,
      classMap,
      sinceMap,
      apiProduct,
      apiDirName,
      diffableVersions
    } = this,
      { raw } = classMap[className],
      [cls] = raw.global.items,
      { alias, name, since } = cls,
      mappedSince = _.get(sinceMap, [apiProduct, apiDirName, name, 'since']);
    let { prepared: data } = classMap[className];

    data.classText = this.markup(data.text);
    // TODO need to decorate the following.  Not sure if this would be done differently for HTML and Ext app output
    this.processRelatedClasses(cls, data);

    if (mappedSince) {
      if (!since) {
        cls.since = mappedSince;
      } else if (since && since !== mappedSince && _.includes(diffableVersions, since)) {
        this.log(`Mismatch between declared @since (${since}) and sinceMap value (${mappedSince})`, 'info');
      }
    }

    data.requiredConfigs = [];
    data.optionalConfigs = [];
    data.instanceMethods = [];
    data.instanceMethodsObj = {};
    data.staticMethods = [];
    data.instanceProperties = [];
    data.staticProperties = [];

    data.contentPartial = '_html-apiBody';

    // set the alias info if the class has an alias
    // .. if the alias is widget use the alias of 'xtype' in the output
    // and list all aliases separated by a comma
    if (alias) {
      let isWidget = alias.includes('widget');

      //cls.aliasPrefix = isWidget ? 'xtype' : alias.substr(0, alias.indexOf('.'));
      cls.aliasPrefix = isWidget ? 'xtype' : 'alias';
      cls.aliasName = (isWidget ? alias.replace(WidgetRe, '') : alias).replace(/,/g, ', ');
    }

    // indicate if the class is deprecated
    cls.isDeprecated = !!(cls.deprecatedMessage || cls.deprecatedVersion);
    // indicate if the class is removed
    cls.isRemoved = !!(cls.removedMessage || cls.removedVersion);
    // indicate if the class is an enum
    cls.isEnum = cls.$type === 'enum';
    cls.originalName = cls.name;
    data.cls = cls;

    // TODO there's a lot of overlap here with guides - should see how we can
    // reconcile some of this into some sort of applyContext(data) method
    data = Object.assign(data, options.prodVerMeta);
    data = Object.assign(data, options);

    this.processApiDataObject(data);

    // indicates whether the class is of type component, singleton, or some otherclass
    if (cls.extended && cls.extended.includes('Ext.Component')) {
      cls.clsSpec = 'title-decoration component';
      cls.clsSpecIcon = 'component-type fa fa-cog';
    } else if (cls.singleton === true) {
      cls.clsSpec = 'title-decoration singleton';
      cls.clsSpecIcon = 'singleton-type fa fa-cube';
    } else {
      cls.clsSpec = 'title-decoration class';
      cls.clsSpecIcon = 'class-type fa fa-cube';
    }

    // start keeping track of the class source files
    data.srcFiles = [];

    // get the source file path for the class
    let srcFilePath = this.getSourceFilePath(cls, raw),
      // and subsequently the source filename of the output source HTML
      filename = this.srcFileMap[srcFilePath].filename + '.html',
      relPath = Path.relative(this.options._myRoot, this.apiSourceDir) + '/',
      sanitizedPath = srcFilePath.replace(relPath, '').replace(/(\.\.\/)/g, ''),
      srcFileObj = {
        pathText: sanitizedPath,
        path: filename
      };

    // add the class source file info to the srcFiles array
    data.srcFiles.push(srcFileObj);

    let i = 0,
      memberTypeGroups = cls.items || [],
      len = memberTypeGroups.length;

    for (; i < len; i++) {
      let group = memberTypeGroups[i],
        type = group.$type,
        members = group.items;

      if (members && members.length) {
        data[type] = this.processMembers(className, type, members);
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
          properties = propertiesObj.hasInstanceProperties ? propertiesObj.instanceProperties : propertiesObj.staticProperties;

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
  splitMemberGroups(type, data, strA, strB) {
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
  processMembers(className, type, items) {
    //this.log(`Begin 'SourceApi.processMembers'`, 'log');
    const { sinceMap, apiProduct, apiDirName, diffableVersions } = this,
      { prepared } = this.classMap[className],
      len = items.length,
      capitalizedType = Utils.capitalize(type);
    let i = 0;

    // loop over the member groups.  Indicate on the class object that each member
    // type is present and process the member object itself.
    for (; i < len; i++) {
      const item = items[i],
        { $type, name, since } = item,
        mappedSince = _.get(sinceMap, [apiProduct, apiDirName, className, 'items', `${$type}|${name}`, 'since']);

      if (mappedSince) {
        if (!since) {
          item.since = mappedSince;
        } else if (since && since !== mappedSince && _.includes(diffableVersions, since)) {
          this.log(`Mismatch between declared @since (${since}) and sinceMap value (${mappedSince})`, 'info');
        }
      }

      prepared[`has${capitalizedType}`] = true;
      this.processMember(className, type, item);
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
  processMember(className, type, member) {
    let classMap = this.classMap,
      raw = classMap[className].raw,
      prepared = classMap[className].prepared,
      srcFileMap = this.srcFileMap,
      rawRoot = raw.global.items[0],
      clsName = rawRoot.name,
      name = member.name;

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
        let filename = this.srcFileMap[srcFilePath].filename + '.html',
          relPath = Path.relative(this.options._myRoot, this.apiSourceDir) + '/',
          sanitizedPath = srcFilePath.replace(relPath, '').replace(/(\.\.\/)/g, ''),
          srcFileObj = {
            pathText: sanitizedPath,
            path: filename
          };

        prepared.srcFiles.push(srcFileObj);
      }
    }

    if (member.value) {
      member.value = `<pre class="defaults-to-dec">${_.escape(member.value)}</pre>`;
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
      member.type = this.splitInline(member.type, ' / ');
    }
    member.text = this.markup(member.text);
    member.params = [];
    member.returns = [];
    member.properties = [];

    if (member.items) {
      let i = 0,
        len = member.items.length;

      for (; i < len; i++) {
        let item = member.items[i],
          { text, $type, type, items } = item;

        // prepare the param and return text
        if (text && ($type === 'param' || $type === 'return' || $type === 'property')) {
          item.text = this.markup(text);
        }
        // linkify the return types
        if ($type === 'return' || $type === 'param') {
          type = this.splitInline(type, ' / ');
        }
        if ($type === 'return') {
          member.returns.push(item);
          member.hasReturn = true;
        }
        if ($type === 'param') {
          member.params.push(item);
        }
        if ($type === 'property') {
          member.properties.push(item);
          member.hasProperties = true;
        }

        // process any sub-items that this param / property may have
        if (items) {
          let itemsLen = items.length;

          while (itemsLen--) {
            this.processMember(className, null, items[itemsLen]);
          }
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
    member.srcClass = member.from || clsName;
    member.srcClassText = member.srcClass;
    member.isInherited = member.srcClass !== clsName;
    member.fromObject = member.from === 'Object';
    member.hide = member.hide || member.fromObject;
    // TODO is this necessary if all of the $types are correct by the time we get here?
    member.linkType = member.$type;

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
    //this.log(this.srcFileMap[className].filename);
    let src = member.src,
      idx = src && (src.text || src.name || src.constructor).split(',')[0],
      srcFile = Utils.isEmpty(idx) ? null : raw.files[idx];

    if (srcFile) {
      let filename = this.srcFileMap[srcFile].filename,
        srcClass = member.srcClass,
        type = member.linkType;

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
  postProcessConfigs(data) {
    let instanceMethods = data.instanceMethods,
      instanceMethodsObj = data.instanceMethodsObj,
      configsObj = data.configs,
      optionalConfigs = configsObj.optionalConfigs,
      requiredConfigs = configsObj.requiredConfigs,
      configs = optionalConfigs.concat(requiredConfigs),
      configsLen = configs.length,
      i = 0,
      mixins = data.mixed && data.mixed.split(','),
      mixesBindable = mixins && mixins.includes('Ext.mixin.Bindable');

    for (; i < configsLen; i++) {
      let config = configs[i],
        name = config.name || '',
        capitalName = Utils.capitalize(name),
        // edge cases like 'ui' and 'setUI'
        upperName = name.toUpperCase(),
        accessor = config.accessor;

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
          getterCfg = {
            name: getterName,
            $type: g ? 'placeholder-simple' : 'placeholder-accessor',
            access: g ? g.access : config.access,
            text: 'see: <a href="#method-' + getterName + '">' + config.name + '</a>',
            isInherited: g ? g.isInherited : config.isInherited,
            isAutoGetter: !g,
            srcLink: config.srcLink,
            srcClass: config.srcClass,
            srcClassText: config.srcClassText
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
          setterCfg = {
            name: setterName,
            $type: s ? 'placeholder' : 'placeholder-accessor',
            access: s ? s.access : config.access,
            text: 'see: <a href="#method-' + setterName + '">' + config.name + '</a>',
            isInherited: s ? s.isInherited : config.isInherited,
            isAutoSetter: !s,
            srcLink: config.srcLink,
            srcClass: config.srcClass,
            srcClassText: config.srcClassText
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
      if (accessor === true || accessor === 'r') {
        config.autoGetter = !g;
      }
      if (accessor === true || accessor === 'w') {
        config.autoSetter = !s;
      }
    }
  }

  /**
   * @param {String} suffix A suffix to append to the search key.  Helpful when you are
   * combining multiple search results together.
   */
  getApiSearch() {
    this.log(`Begin 'SourceApi.getApiSearch'`, 'info');
    let map = this.classMap,
      classNames = Object.keys(map),
      i = 0,
      len = classNames.length,
      toolkit = this.options.toolkit,
      searchIndex = this.apiSearchIndex,
      // suffix allows us to combine toolkits in one search
      suffix = (toolkit && toolkit.charAt(0)) || '',
      typeRef = {
        optionalConfigs: 'c',
        requiredConfigs: 'c',
        instanceProperties: 'p',
        staticProperties: 'sp',
        instanceMethods: 'm',
        staticMethods: 'sm',
        events: 'e',
        vars: 'v',
        "sass-mixins": 'x'//,
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
        cls = map[className].prepared,
        key = `${i}${suffix}`;

      // caches the member type short names on the class object for use in the
      // processMemberSearch method
      cls.typeRef = typeRef;

      // FRAMEWORK CHOICE
      let webComponent = this.getWebComponentDeclaration(className, false);
      if (webComponent) {
        webComponent = webComponent.replace(/</g, '');
        webComponent = webComponent.replace(/\/>/g, '');
      }

      // record the class name and toolkit
      searchIndex[key] = {
        d: webComponent || cls.name,
        n: cls.cls.originalName,
        t: toolkit ? toolkit : null
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
          j = 0,
          namesLength = altClassNames.length;

        searchIndex[key].g = altClassNames;

        for (; j < namesLength; j++) {
          let altName = altClassNames[j];

          searchIndex[altName + key] = {
            n: altName,
            t: toolkit ? toolkit : null,
            a: cls.access ? 'i' : null
          };
        }
      }

      let typesLen = memberTypes.length,
        k = 0;

      // loop over all possible member types
      for (; k < typesLen; k++) {
        let type = memberTypes[k],
          members = cls[type],
          membersLen = members ? members.length : 0,
          l = 0;

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
  processMemberSearch(member, key, cls, type, searchIndex) {
    //this.log(`Begin 'SourceApi.processMemberSearch'`, 'log');
    // initially we'll check to see see if the member belongs to the current class.  
    // If so, then we'll process it. 
    let hidden = member.hide,
      processMember = !member.from;

    // if the member is not hidden and if it's not from the current class then check 
    // to see if the member is found on the parent class.  If it exists on the 
    // current class and not on the parent class then we'll want to add it to the 
    // search output
    if (!hidden && !processMember) {
      let classMap = this.classMap,
        prepared = classMap[cls.cls.originalName].prepared,
        ancestorList = prepared.extended;

      // if the current class has a parent then get a reference to the parent class 
      // object
      if (ancestorList) {
        let ancestors = ancestorList.split(','),
          ancestorsLen = ancestors.length;

        processMember = true;

        // loop over any ancestor classes
        while (ancestorsLen--) {
          let ancestor = ancestors[ancestorsLen],
            ancestorPrepared = classMap[ancestor] && classMap[ancestor].prepared,
            ancestorTypeCollection = ancestorPrepared && ancestorPrepared[type];

          // and see if it has member of the type currently being evaluated
          if (ancestorTypeCollection) {
            let nameExists = _.find(ancestorTypeCollection, ancestorMember => {
              return ancestorMember.name === member.name;
            });
            // if there is not a member of the same type matching the name of 
            // the current member being evaluated then we'll mark 
            // processMember as true for the next step in member processing
            if (nameExists) {
              processMember = false;
            }
          }
        }
      }
    }

    if (!hidden && processMember) {
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
            a: acc,
            t: member.name
          };
        });
      }

      // record the member access
      searchIndex[key][cls.typeRef[type] + '.' + member.name] = {
        a: acc
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
  outputApiSearch() {
    console.log("outputApiSearch: Started...");

    let apiSearch = this.apiSearchIndex,
      output = JSON.stringify(apiSearch),
      options = this.options,
      product = options.product,
      version = options.version;

    version = options.prodVerMeta.hasVersions ? `${version}` : '';
    output = `DocsApp.apiSearch =${output};`;

    return new Promise((resolve, reject) => {
      Fs.writeFile(Path.join(this.jsDir, `${product}-${version}-apiSearch.js`), output, 'utf8', err => {
        if (err) {
          console.log("outputApiSearch: ERROR. ", err);
          reject(err);
        } else {
          console.log("outputApiSearch: Completed");
          resolve();
        }
      });
    });
  }

  /**
   * Sort the API trees
   * @return {Object} The sorted API tree
   */
  sortTrees(apiTrees) {
    let treeKeys = Object.keys(apiTrees),
      len = treeKeys.length,
      apiTree;

    // There can be more than one api tree, such as modern or classic. This determines how it lays out. 
    // If modern or classic is by it self be sure to move on to the the else statement
    // Otherwise, most everythign will only have one set of api docs. 
    if (len === 1 && !treeKeys.includes('modern') && !treeKeys.includes('classic')) {
      apiTree = {
        API: this.sortTree(apiTrees[treeKeys[0]])
      };
    } else {
      apiTree = {
        API: {}
      };

      for (let i = 0; i < len; i++) {
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
  decoratePrivateNodes(nodes, parent) {
    // initially we'll mark the parent node as private and later change it to public
    // if there are public children
    if (parent) {
      parent.access = 'private';
    }

    let len = nodes.length,
      startingLen = len;

    // loop over all passed nodes
    while (len--) {
      let node = nodes[len],
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
  outputApiTree() {
    return new Promise((resolve, reject) => {
      this.log(`SourceApi.outputApiTree: Starting...`);

      let apiTrees = this.apiTrees,
        apiTree = this.sortTrees(apiTrees);

      // process all trees and indicate parent nodes as private if all child nodes are
      if (_.isArray(apiTree.API)) {
        this.decoratePrivateNodes(apiTree.API);
      } else {
        Object.keys(apiTree.API).forEach(key => {
          this.decoratePrivateNodes(apiTree.API[key]);
        });
      }

      apiTree = JSON.stringify(apiTree, null, 4);

      let wrap = `DocsApp.apiTree = ${apiTree}`,
        product = this.getProduct(),
        version = this.options.version,
        dest = Path.join(this.jsDir, `${product}-${version}-apiTree.js`);

      Fs.writeFile(dest, wrap, 'utf8', (err) => {
        if (err) {
          reject(err);
        }
      });

      this.log(`SourceApi.outputApiTree: Finished`);
      resolve();
    });
  }

  /**
   * Create an HTML version of the each source JS file in the framework
   * @return {Object} Promise
   */
  createSrcFiles() {
    if (this.options.skipSourceFiles === true) {
      this.log('Skipping creating source HTML files: --skipSourceFiles toolkit=' + this.options.toolkit);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.log('Start SourceApi.createSrcFiles');

      var map = this.srcFileMap;
      var keys = Object.keys(map);
      var len = keys.length;
      var inputDir = this.getDoxiInputDir();

      for (var i = 0; i < len; i++) {
        keys[i] = {
          path: keys[i],
          inputDir: inputDir
        };
      }

      _.remove(keys, item => {
        return item.path.includes('/enums/');
      });

      console.log("createSrcFiles: keys.length=" + keys.length);

      // loop over the source file paths and HTML-ify them
      this.processQueue(keys, __dirname + '/htmlify.js', (items) => {
        console.log("processQueue..");
        console.log("createSrcFiles: processQueue: Started... items.len=" + items.length);

        // once all files have been HTML-ified add anchor tags with the name of each
        // class-member so that you can link to that place in the docs
        var anchored = this.addAnchorsAll(items);

        // output all of the source HTML files
        this.outputSrcFiles(anchored)
          .then(() => {
            console.log("createSrcFiles: processQueue: outputSrcFiles: Completed. toolkit=" + this.options.toolkit);
            resolve();
          })
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
  outputSrcFiles(contents) {
    return new Promise((resolve, reject) => {
      this.log(`Start SourceApi.outputSrcFiles`);

      var len = contents.length;
      var map = this.srcFileMap;
      var options = this.options;
      // TODO = this should be set globally probably in the base constructor
      //outDir  = Path.join('output', options.product, options.version, options.toolkit || 'api', 'src'),
      var outDir = Path.join(this.apiDir, 'src');

      // create the output directory
      Fs.ensureDir(outDir, () => {
        // time stamp and lot status
        //me.openStatus('Write out source HTML files')

        var writes = [];

        // loop through all items to be output
        for (let i = 0; i < len; i++) {
          writes.push(new Promise((resolve, reject) => {
            var content = contents[i];
            var path = map[content.path];

            // TODO why would this be null? Second time? 
            if (path != null) {
              var filename = path.filename;

              // TODO why would this be null?
              if (filename == null) {
                console.console("outputSrcFiles: ERROR: filename-=null content.path=" + content.path);
              } else {
                // the data object to apply to the source HTML handlebars template
                var data = {
                  content: content.html,
                  name: filename,
                  title: options.prodVerMeta.prodObj.title,
                  version: options.version,
                  // TODO figure out what numVer is in production today
                  numVer: '...',
                  // TODO this should be output more thoughtfully than just using options.toolkit
                  meta: options.toolkit,
                  moduleName: this.moduleName,
                  cssPath: Path.relative(outDir, this.cssDir)
                };

                console.log(`outputSrcFiles: write file=${outDir}/${filename}.html`)

                // write out the current source file
                Fs.writeFile(`${outDir}/${filename}.html`, this.srcTemplate(data), 'utf8', (err) => {
                  if (err) {
                    this.log("outputSrcFiles: ERROR, can't write file.")
                    reject(err);
                  }

                  delete map[content.path];
                  resolve();
                });
              }
            } else {
              console.log("outputSrcFiles: path == null SKIPPING content.path=" + content.path);
            }
          }));
        }

        return Promise.all(writes)
          .then(() => {
            this.log(`outputSrcFiles: Completed.`);
            resolve();
          })
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
  getLocArray(item) {
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
  addAnchorsAll(items) {
    //this.log(`Begin 'SourceApi.addAnchorsAll'`, 'info');
    let len = items.length,
      anchored = [];

    // collect up the positions in each source file where anchors should be added
    // allowing linking directly to where each class / member is documented in the 
    // source files
    while (len--) {
      let item = items[len],
        path = item.path;

      this.catalogAnchors(path);
    }

    // then add the anchor tags to the source files
    len = items.length;
    while (len--) {
      let item = items[len],
        html = item.html,
        path = item.path;

      anchored.push({
        html: this.addAnchors(html, path),
        path: path
      });
    }

    return anchored;
  }

  /**
   * Identifies where in the HTML source all class and class member documentation is 
   * located.  The position and class name / class name + member name are added to the 
   * srcFileMap for use in the {@link #addAnchors} method.
   * Supports {@link #addAnchorsAll} + {@link #addAnchors} + {@link #createSrcFiles}
   * @param {String} srcPath The path of the source class file
   */
  catalogAnchors(srcPath) {
    this.log(`CatalogAnchors ${srcPath}`);

    let src = this.srcFileMap[srcPath];
    if (!src) {
      this.log("catalogAnchors: Error: srcPath=" + srcPath);
      return;
    }

    let clsSrc = src.input;   // the doxi output for this class at srcPath
    let clsFiles = clsSrc && clsSrc.files; // array of all source files

    // reference / create the anchorLocs map on the `src` object for use in the
    // `addAnchors` method
    src.anchorLocs = src.anchorLocs || {};

    // if the srcPath has a class object associated with it
    if (clsSrc) {
      let cls = clsSrc.global.items[0], // the class object
        clsName = cls.name,               // class name
        memberTypes = cls.items,              // array of member type groups
        loc, clsFileNum, clsLineNum;

      // if the class itself has documentation log the position for it
      if (cls.src) {
        // find the location within the file where the class is described
        loc = this.getLocArray(cls);
        // and log the position with the name of the class
        if (loc) {
          [clsFileNum, clsLineNum] = loc;
          src.anchorLocs[clsLineNum] = `${clsName}`;
        }
      }

      // if there are any class members (an array of class member types)
      if (memberTypes) {
        let i = 0,
          len = memberTypes.length;

        // loop over each type group
        for (; i < len; i++) {
          let group = memberTypes[i];
          // the collection of members of this type
          let members = group.items;
          let membersLen = 0;
          if (members) {
            membersLen = members.length;
          } else {
            console.log("---->>> There are no members for: group=", group);
          }

          // if there are members in this group
          if (members && membersLen) {
            let type = this.memberTypesMap[group.$type],
              j = 0;

            // loop over all members in this type group
            for (; j < membersLen; ++j) {
              let member = members[j],
                // get the source class + member type info to prefix to 
                // the following members as they're processed
                fromName = member.from || clsName,
                name = `${fromName}-${type}-`,
                memloc, memFileNum, memLineNum;

              // if the member has description in this class
              if (member.src) {
                // get the location where it's described
                memloc = this.getLocArray(member);
                if (memloc) {
                  [memFileNum, memLineNum] = memloc;
                }
              }

              // back the pointer up one so it's pointing to the top of
              // the description block
              if (memloc && memLineNum) {
                memLineNum -= 1;
              }

              // log the class and member type and member name
              if (memloc) {
                let memberName = member.name;

                if (clsFiles) {
                  // we look up the source class here as it may or may 
                  // not be the same as `clsSrc` looked up above
                  let memSrc = this.srcFileMap[clsFiles[memFileNum]];

                  if (memSrc) {
                    memSrc.anchorLocs = memSrc.anchorLocs || {};
                    memSrc.anchorLocs[memLineNum] = `${name}${memberName}`;
                  }
                }

              }
            }
          }
        }
      }
    }
  }

  /**
   * Adds anchor tags to the source files.  Used when you link to the source of a class 
   * or member description within the source files.  Each anchor will include a name 
   * attribute with either the class name (for the class description) or class name + 
   * member name (for member descriptions).  Additionally adds line number anchors to 
   * each line.
   * @param {String} html The HTML of the class source file that anchor tags will be 
   * injected into
   * @param {String} srcPath The path to the file being decorated with anchors.  Used 
   * to fetch the anchor positions from the srcFileMap hash (anchor positions collected 
   * in the {@link #catalogAnchors} method).
   * @return {String} The html string for the class source file including the injected 
   * anchor tags
   */
  addAnchors(html, srcPath) {
    let src = this.srcFileMap[srcPath];
    if (!src) {
      console.log("addAnchors: Error: srcPath=" + srcPath);
      return;
    }
    let anchorLocs = src.anchorLocs;

    if (anchorLocs) {
      // split out all each line in the HTML
      let lines = html.split('<div class="line">'),
        locs = Object.keys(anchorLocs),
        len = locs.length;

      while (len--) {
        let loc = locs[len],
          name = anchorLocs[loc];

        lines[loc] = `<a name="${name}">` + lines[loc];
      }

      let linesLen = lines.length;

      while (linesLen--) {
        lines[linesLen] = `<a name="line${linesLen}">` + lines[linesLen];
      }

      html = lines.join('<div class="line">');
    }

    return html;
  }
}

module.exports = SourceApi;
