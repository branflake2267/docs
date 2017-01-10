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
      Fs              = require('fs'),
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
        let o = this.options,
            cfg = Object.assign({}, o, {
                repo: o.products.guides.repo || null
            });

        return Path.resolve(o._myRoot, Utils.format(o.guideSourceDir, cfg));
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
     *
     */
    mapFiles (sourceDir, path, dir, map) {
        let files = this.getFiles(sourceDir),
            i   = 0,
            len = files.length;

        for (; i < len; i++) {
            let file   = files[i],
                full   = Path.join(path, file),
                parsed = Path.parse(full);

            if (!map[full]) {
                map[Path.join(parsed.dir, parsed.name)] = Path.join(dir, full);
            }
        }

        let dirs = this.getDirs(sourceDir);

        i   = 0;
        len = dirs.length;

        for (; i < len; i++) {
            let d = dirs[i];

            this.mapFiles(Path.join(sourceDir, d), Path.join(path, d), dir, map);
        }
    }

    /**
     *
     */
    processGuides () {
        this.syncRemote('guides', this.guideSourceDir);
        this.guidePathMap;
        this.readGuideCfg();
    }

    /**
     *
     */
    readGuideCfg () {
        let cfg   = this.guideConfig,
            items = cfg.items,
            i     = 0,
            len   = items.length;

        for (; i < len; i++) {
            this.processGuideTree(items[i]);
        }
    }

    /**
     *
     */
    processGuideTree (guidesObj) {
        let nodes = this.guidesTree[guidesObj.text] = guidesObj.items;

        this.prepareGuides(guidesObj.items, guidesObj.rootPath || '');
    }

    /**
     *
     */
    prepareGuides (nodes, rootPath) {
        let i   = 0,
            len = nodes.length;

        for (; i < len; i++) {
            let node     = nodes[i],
                children = node.children,
                slug     = node.slug;

            if (rootPath) {
                this.makeGuideDir(rootPath);
            }
            if (children) {
                this.makeGuideDir(Path.join(rootPath, slug));
                this.prepareGuides(children, Path.join(rootPath, slug));
            } else {
                node.leaf = true;
                //console.log(rootPath, this.guidePathMap[Path.join(rootPath, slug)]);
                if (!node.link) {
                    this.outputGuide(node, rootPath);
                }
            }
        }
    }

    /**
     *
     */
    makeGuideDir (path) {
        Mkdirp.sync(Path.join(this.resourcesDir, 'guides', path));
    }

    /**
     *
     */
    outputGuide (node, rootPath) {
        let html     = Fs.readFileSync(this.guidePathMap[Path.join(rootPath, node.slug)], 'utf-8'),
            filePath = Path.join(Path.resolve(__dirname, this.resourcesDir), 'guides', rootPath, node.name) + '.html',
            data     = Object.assign({}, node);

        Object.assign(this.options, data);
        Object.assign(this.options.prodVerMeta, data);
        data.content = this.processGuideHtml(html);

        Fs.writeFileSync(filePath, this.guideTemplate(data), 'utf8', (err) => {
            if (err) throw err;
        });
    }

    /**
     * // can be extended in an app post-processor subclass to do this and that if needed
     */
    processGuideHtml (html) {
        // TODO finish with the guide HTML: decorate @examples, process links, etc.
        return this.markup(html);
    }
}

module.exports = SourceGuides;
