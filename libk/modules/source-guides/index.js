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

    run () {
        this.processGuides();
    }

    get guideTemplate () {
        let tpl = this._guideTpl;

        if (!tpl) {
            tpl = this._guideTpl = Handlebars.compile(Fs.readFileSync(Path.join(this.options._myRoot, 'templates/html-guide.hbs'), 'utf-8'));
        }

        return tpl;
    }

    get guidesRepoDir () {
        let dir = this._guidesRepoDir;

        if (!dir) {
            let o = this.options;
            dir = this._guidesRepoDir = Utils.format(o.guidesInputDir, o);
        }

        return dir;
    }

    get guideConfigPath () {
        console.log(this.guidesRepoDir);
        // TODO this needs to be resolved dynamically, not with static paths
        return Path.resolve('../', Path.join('localRepos/guides'), 'configs', this.options.product);
    }

    get guideConfig () {
        // TODO we need to be able to pick the right config file based on the currently processed version
        let files   = this.getFiles(this.guideConfigPath),
            version = this.options.version,
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

        // TODO make this path smarter
        return require(Path.resolve('../', Path.join('localRepos/guides', 'configs', this.options.product, file)));
    }

    get guidePath () {
        // TODO this needs to be intelligent, not static
        return Path.resolve('../', Path.join('localRepos/guides', this.options.product));
    }

    get guideDirs () {
        return this.getDirs(this.guidePath);
    }

    get guideDirPaths () {
        let dirs  = this.guideDirs,
            i     = 0,
            len   = dirs.length,
            paths = [];

        for (; i < len; i++) {
            // add only the eligible directories given the current product version being built
            if (CompareVersions(dirs[i], this.options.version) <= 0) {
                paths.push(Path.join(this.guidePath, dirs[i]));
            }
        }

        return paths;
    }

    get guidePathMap () {
        let map = this._guidePathMap;

        if (!map) {
            map = this._guidePathMap = {};

            let verDirs = this.guideDirPaths.reverse(),
                i       = 0,
                len     = verDirs.length;

            for (; i < len; i++) {
                let dir = verDirs[i];

                this.mapFiles(dir, '', dir, map);
            }
        }
        return map;
    }

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
        this.syncRemote('guides');
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
        Mkdirp.sync(Path.join(Path.resolve(__dirname, this.resourcesDir), 'guides', path));
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
