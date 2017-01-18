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
      Utils           = require('../shared/Utils');

class SourceGuides extends SourceApi {
    constructor (options) {
        super(options);

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
     * The handlebars template for guide output (may be overridden by the post processor
     * modules)
     * @return {Object} The compiled handlebars template
     */
    get guideTemplate () {
        let tpl = this._guideTpl;

        if (!tpl) {
            tpl = this._guideTpl = Handlebars.compile(Fs.readFileSync(Path.join(this.options._myRoot, 'templates/guide.hbs'), 'utf-8'));
        }

        return tpl;
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
        let me      = this,
            files   = me.getFiles(me.guideConfigPath),
            version = me.options.version,
            cfgVer  = '0',
            file;

        let i   = 0,
            len = files.length;

        for (; i < len; i++) {
            let name = Path.parse(files[i]).name,
                v    = name.substring(name.indexOf('-') + 1);

            if (CompareVersions(v, version) <= 0 && CompareVersions(v, cfgVer) > 0) {
                cfgVer = v;
                file = name;
            }
        }

        return require(Path.join(me.guideConfigPath, file));
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
     */
    processGuides () {
        console.log('PROCESSING GUIDES');
        this.syncRemote('guides', this.guideSourceDir);
        this.readGuideCfg();
        this.copyResources();
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

        return Promise.all(promises);
    }

    /**
     * Processes the guide config by:
     *
     *  - adding the guides to a guide tree to be used by the HTML docs and Ext app
     *  - processing the guides (their markdown, links, etc)
     *
     * Finally, the guide tree is output
     */
    readGuideCfg () {
        let cfg   = this.guideConfig,
            items = cfg.items,
            i     = 0,
            len   = items.length;

        for (; i < len; i++) {
            let guidesObj = items[i];
            //this.processGuideTree(items[i]);
            this.guidesTree[guidesObj.text] = guidesObj.items;
            this.prepareGuides(guidesObj.items, guidesObj.rootPath || '');
        }

        // TODO output the guide tree
    }

    /**
     * The guides from the guide config are processed; making the guide directory in the
     * output directory, decorating the tree nodes for consumption by the
     * post-processors, and outputting the guide itself
     * @param {Object[]} nodes The nodes (or child nodes) from the guide tree to process
     * @param {String} rootPath the path on disc where the guides from the nodes are
     * located
     */
    prepareGuides (nodes, rootPath) {
        let i   = 0,
            len = nodes.length;

        // loop through all nodes
        for (; i < len; i++) {
            let node     = nodes[i],
                children = node.children,
                slug     = node.slug;

            // if a rootPath was passed in create a directory in the output folder
            if (rootPath) {
                this.makeGuideDir(rootPath);
            }
            // if this node has children create the directory in the output folder for
            // the child guides and prepared the child nodes
            if (children) {
                this.makeGuideDir(Path.join(rootPath, slug));
                this.prepareGuides(children, Path.join(rootPath, slug));
            // else decorate the node as leaf = true
            } else {
                node.leaf = true;
                // if the node isn't simply a link itself then output its guide
                if (!node.link) {
                    this.outputGuide(node, rootPath);
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
     * @param {String} rootPath The path of the guide file
     * @param {String} name The guide file name
     * @return {String} The full path for the guide file
     */
    getGuideFilePath (rootPath, name) {
        let path = Path.join(
                Path.resolve(
                    __dirname,
                    this.resourcesDir
                ),
                'guides',
                rootPath,
                name
            );

        return path  + '.html';
    }

    /**
     * Output the guide for the passed node
     * @param {Object} node The guide tree node describing the guide
     * @param {String} rootPath The path where the guide resides on disk and where it
     * will be subsequently be written for final output
     */
    outputGuide (node, rootPath) {
        let html     = Fs.readFileSync(this.guidePathMap[Path.join(rootPath, node.slug)], 'utf-8'),
            filePath = this.getGuideFilePath(rootPath, node.name),
            data     = Object.assign({}, node);

        Object.assign(this.options, data);
        Object.assign(this.options.prodVerMeta, data);
        data.content = this.processGuideHtml(html);
        this.processGuideDataObject(data);

        Fs.writeFileSync(filePath, this.guideTemplate(data), 'utf8', (err) => {
            if (err) throw err;
        });
    }

    /**
     * @template
     * Template method to allow for additional guide data processing prior to handing the
     * data over to the guide template for final output
     * @param {Object} data The object to be processed / changed / added to before
     * supplying it to the template
     */
    processGuideDataObject (data) {
        // can be extended in the app post-processor subclasses
    }

    /**
     * Translates the guide markdown file to HTML markup
     * // can be extended in an app post-processor subclass to do this and that if needed
     * @param {String} html The markdown from the guide source file
     * @return {String} The HTML processed from the markdown processor
     */
    processGuideHtml (html) {
        // TODO finish with the guide HTML: decorate @examples, process links, etc.  Some of that may happen in some base class or may happen in a post processor module
        html = this.decorateExamples(html);
        return this.markup(html);
    }

    /**
     * Decorate @example blocks so that they can operate as inline fiddle examples
     * @param {String} html The guide body HTML
     * @return {String} The decorated guide body HTML
     */
    // TODO
    decorateExamples (html) {
        return html;
    }
}

module.exports = SourceGuides;
