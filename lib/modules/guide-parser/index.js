'use strict';

const CT         = require('../json-parser');
const path       = require('path');
const util       = require('util');
const compressor = require('node-minify');
const handlebars = require('handlebars');
const marked     = require('sencha-marked');
const mkdirp     = require('mkdirp');
const Base       = require('../base');
const debug      = require('../../Debug');
const xmlbuild   = require('xmlbuilder');
const Utils      = require('../shared/Utils');
const gramophone = require('sencha-gramophone'); // https://github.com/edlea/gramophone
const shell      = require('shelljs');
const fs         = require('fs-extra');

var Entities = require('html-entities').AllHtmlEntities;
const fileArray = [];

class Guide extends Base {
    beforeExecute (fileArray) {
        super.beforeExecute(fileArray);
    }

    /**
     *
     */
    get guidesInput () {
        return this.guides.path;
    }

    /**
     *
     */
    get output () {
        let me = this,
            out = me._output;

        if (!out) {
            out = me._output = me.hasVersions ? path.join(me.destination, me.pversion, '/guides/') : path.join(me.destination, '/guides/');
        }

        return out;
    }

    /**
     *
     */
    get apiJson () {
        let json = this._apiJson;

        if (!json && this.hasApi) {
            let myJsonParser = new CT(this.options);
            json = this._apiJson = myJsonParser.createTree();
        }

        return json;
    }

    /**
     *
     */
    get docDir () {
        let me = this,
            dir = me._docDir;

        if (!dir) {
            dir = me._docDir = path.join(me.productDir, 'guides');
        }

        return dir;
    }

    /**
     * This is a supporting method used in parsing links like:
     * [[ext: ...]] or [[ext-5.0.0: ...]].
     * @param {String} product The product name or product and version separated by a
     * hyphen.
     * @return {Object} The production and version details
     * @return {String} return.product The normalized product name (i.e. ext will be
     * returned as extjs)
     * @return {String} return.version The version if one is passed on the product param,
     * else undefined
     * @return {String} return.productLiteral The product value that was literally passed
     * in.  For example, if the product param passed in was `classic` then the `product`
     * value returned would be "extjs" while the productLiteral would be "classic".
     */
    getNormalizedProductAndVersion (product) {
        let dashIndex = product.indexOf('-'),
            projectConfigs = this.projectConfigs,
            prod, ver;

        if (dashIndex > -1) {
            prod = product.substring(0, dashIndex);
            ver = product.substr(dashIndex + 1);
        } else {
            prod = product;
        }

        return {
            productLiteral: prod,
            product: projectConfigs.normalizedProductList[prod],
            version: ver
        };
    }

    getProductConfig (product) {
        if (product === 'ext' || product === 'extjs') {
            product = 'classic';
        }
        if (product === 'test') {
            product = 'orion';
        }
        if (product === 'touch') {
            product = 'classic';
        }

        let cfg = this[product + 'Cfg'];

        if (!cfg) {
            cfg = this[product + 'Cfg'] = require('../../configs/' + product);
        }

        return cfg;
    }

    getGuideJson (skipImages) {
        let me = this,
            json = me._guideJson;

        if (!json) {
            let me = this,
                guideCfg       = me.guides.config || 'config.json',
                productConfig  = require(path.relative(__dirname, me.guidesInput) + '/' + guideCfg),
                versions = productConfig.versions,
                contents = productConfig.contents,
                quickStart = productConfig.quickStart,
                tree = [],
                nodes = [],
                quickStartTree = [],
                quickStartNodes = [];

            me.parseContents(contents, tree, null, versions, nodes, skipImages);

            if (quickStart) {
                me.parseContents(quickStart, quickStartTree, 'quick_start', versions, quickStartNodes, skipImages);
            }

            json = me._guideJson = {
                tree: tree,
                nodes: nodes,
                quickStartTree: quickStartTree,
                quickStartNodes: quickStartNodes
            };
        }

        return json;
    }

    /**
     * Returns a search object used when searching guides
     * @param {Array/String} blacklist A string or array of string names of the titles of
     * guides to be omitted from the search.
     * @return {Object}
     */
    getSearch (blacklist) {
        let me = this,
            json = me.getGuideJson(),
            guides = json.nodes,
            projectConfigs = me.projectConfigs,
            prod = projectConfigs.normalizedProductList[me.config],
            version = projectConfigs.productIndex[prod].hasVersions ? me.pversion : false,
            obj = {
                searchWordsIndex: null,
                searchWords: {},
                searchRef: [],
                searchUrls: [],
                prod: prod,
                version: version
            };

        blacklist = blacklist || 'Release Notes';
        blacklist = Utils.from(blacklist);

        guides.forEach(function (guide, i) {
            if (!Utils.arrayContains(blacklist, guide.name)) {
                obj.searchRef.push(guide.name.replace(/&amp;/g, '&'));
                obj.searchUrls.push(guide.id.replace('_-_', '/'));
                obj.searchWordsIndex = i;
                me.parseSearchWords(obj, guide.name, guide.text);
            }
        });

        return obj;
    }

    run () {
        let dt = new Date();
        let me             = this,
            output         = me.docDir,
            guideJsonObj   = me.getGuideJson(),
            nodes          = guideJsonObj.nodes,
            allNodes       = nodes.concat(guideJsonObj.quickStartNodes),
            root           = xmlbuild.create('urlset').att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9"),
            apiJson = me.apiJson,
            guideSearches = [],
            i, xmlString;

        if (me.beforeExecute) {
            // overwrite here if possible
            me.beforeExecute(fileArray);
        }

        me.log('info', 'Reading', 'product config.json');

        me.template = fs.readFileSync(me.guides.template, 'utf-8');

        for (i = 0; i < allNodes.length; i++) {
            me.parseNode(allNodes[i], allNodes[i].versions, guideJsonObj, apiJson);

            if (allNodes[i]) {
                let obj = {
                    url : {
                        loc: me.docroot + 'guides/' + allNodes[i].path + '.html'
                    }
                };

                root.ele(obj);
            }
        }

        if (me.search !== false) {

            guideSearches.push(me.getSearch());
            if (me.search) {
                Utils.from(me.search).forEach(function (item) {
                    guideSearches.push(new Guide(item).getSearch());
                });
            }
        }

        fs.writeFileSync(path.join(me.productDir, 'js', 'guideSearch.js'), 'var guideSearches = ' + JSON.stringify(guideSearches));

        mkdirp.sync(output);
        xmlString = root.doc().end({ pretty: true, indent: '  ', newline: '\n' });
        fs.writeFileSync(path.join(output, 'guide-sitemap.xml'), xmlString, 'utf-8');

        me.createProductHomePage();
    }

    /**
     *
     */
    createProductHomePage () {
        let me = this,
            guideJsonObj = me.getGuideJson(),
            tree = guideJsonObj.tree,
            quickStartTree = guideJsonObj.quickStartTree,
            apiJson = me.apiJson,
            productTree = me.productTree,
            dest = me.productDir;

        me.prependHrefPath(tree, dest, me.docDir);
        me.prependHrefPath(quickStartTree, dest, me.docDir);
        me.prependHrefPath(productTree, dest, dest);

        me.createIndexPage({
            date: me.date,
            title: me.title,
            docroot: me.docroot,
            headhtml: me.headhtml,
            version : me.pversion,
            description: me.description,
            stylesheet : 'app.css',
            canonical : me.docroot + 'index.html',
            apiJson: apiJson,
            guideJson: tree,
            quickStartJson: quickStartTree,
            productTree: productTree,
            numVer : me.numberVer,
            toolkit     : me.otherToolkit ? Utils.capitalize(me.otherToolkit) : '',
            toolkitLink : me.toolkitLink,
            hasVersions : false
        });
    }

    parseContents (contents, parent, paths, versions, nodes, skipImages) {
        let me = this;

        contents.forEach(function(content, i) {

            let nodePath = paths ? paths + '/' + content.slug : content.slug,
                specificId = nodePath.replace('/', '_-_'),
                node     = {
                    id         : specificId,
                    slug       : content.slug,
                    elIdSlug   : specificId.toLowerCase(),
                    name       : content.name,
                    summary    : content.summary,
                    myToolkit  : content.toolkit,
                    path       : nodePath,
                    displayNew : content.displayNew,
                    guideTlkit : content.toolkit || 'universal',
                    tier       : content.tier,
                    index      : i,
                    count      : (i + 1),
                    paths      : paths
                },
                isRoot = false;

            if (content.children) {
                node.leaf     = false;
                node.children = [];
                me.log('info', 'Parsing Guide: ' + content.name);
                me.parseContents(content.children, node.children, node.path, versions, nodes, skipImages);
            } else {
                if (!parent.length) {
                    isRoot = true;
                }
                node.leaf = true;

                if (content.link) {     // this is an external link node only
                    me.parseLink(node, content.link);
                } else {                // this is a guide node
                    let version  = me.guides.version,
                        filePath = me.getFilePath(me.guidesInput, node.path, version, versions),
                        markdown = fs.readFileSync(filePath, 'utf8'),
                        idRe     = /[^\w]+/g,
                        html     = marked(markdown, {
                            addHeaderId     : function(text, level, raw) {
                                return node.path.replace(idRe, '-_-') + '_-_' + raw.toLowerCase().replace(idRe, '_');
                            },
                            appendLink      : true,
                            decorateExternal: true
                        });

                    node.text = html;
                    node.href = nodePath;
                    node.versions = versions;
                    nodes.push(node);
                }
            }

            me.syncImages(node, versions, isRoot);

            parent.push(node);
        });
    }

    /**
     *
     */
    static copyDirectory (inPath, outPath) {
        // Check to see if inPath directory exists in source folder
        // Copy if so
        if (fs.existsSync(inPath)) {
            shell.mkdir('-p', outPath);
            fs.copy(inPath, outPath);

            if(fs.existsSync(outPath)) {
                fs.chmod(outPath, '0755');
            }
        }
    }

    syncImages (node, versions, isRoot) {
        let me = this,
            guidesInput = me.guidesInput,
            output = me.docDir,
            outPath = path.join(output, (isRoot ? '' : node.path)),
            v = versions.slice(0),
            vers = v.slice(0),
            srcPath;

        Utils.each(vers.reverse(), function (ver) {
            srcPath = guidesInput + '/' +  ver + (isRoot ? '' : ('/' + node.path));
            Guide.copyDirectory(srcPath + '/images', outPath + '/images/');
            Guide.copyDirectory(srcPath + '/resources', outPath + '/resources/');
        });
    }

    /**
     * Create the link markup from links formatted like: `[[product: ...]]`.
     * @param {String} namespace The class name and any passed member name
     * @param {String} className The class name
     * @param {String} memberName The member name to be hash linked to
     * @param {String} text The text to display in the link (will default to the
     * namespace if no text is passed)
     * @param {String} node
     * @param {String} product The product (or product-version) found in the
     * [[product: ...]] link
     * @return {String} The anchor tag markup for the processed [[product: ...]] link
     */
    createLink (namespace, className, memberName, text, node, product) {
        let me = this,
            normalized = me.getNormalizedProductAndVersion(product),
            prodLiteral = normalized.productLiteral,
            prod = normalized.product,
            self = me.getNormalizedProductAndVersion(me.config),
            projectConfigs = me.projectConfigs,
            index = projectConfigs.productIndex,
            ver = normalized.version || ((prod === self && index[prod]) ? me.numberVer : index[prod].currentVersion),
            hasVersions = index[prod] && index[prod].hasVersions,
            majorVer = hasVersions ? ((ver.indexOf(".x") > -1) ? ver : ver.substr(0, 1)) : null,
            link = index[prod].link || (index[prod][majorVer] ? index[prod][majorVer].link : null),
            linkObj = {
                prod: prod,
                page: className,
                majorVer: majorVer
            },
            prefix, productConfig, outputPath, href;

        if (index[prod].slashifyClassName) {
            linkObj.page = className.replace(/\./g, '/');
        }

        // if the product in the link was literally 'classic' or 'modern' use that after
        // the version number
        if (prodLiteral === 'classic' || prodLiteral === 'modern') {
            ver += '/' + prodLiteral;
        } else if (index[prod].toolkits) {
            // else if the product has toolkits and the current product version is in the
            // list of versions that have toolkits then append that product's default
            // toolkit as defined in the product index since no literal toolkit was
            // indicated
            if (index[prod].toolkits.indexOf(majorVer) !== -1) {
                if (ver.indexOf('-') === -1) {
                    ver += '/' + index[prod].defaultToolkit;
                }
            }
        }
        // connect the version to the linkObject to be used in formatting the href string
        linkObj.ver = ver;

        // if a link was not found on the product index we'll need to construct it using
        // the output path on the product config file to find the relative path prefix
        if (!link) {
            productConfig = me.getProductConfig(prod);
            outputPath = productConfig.destination;
            if (Utils.isObject(outputPath)) {
                outputPath = outputPath.value;
            }
            prefix = path.relative(node.guideDir, outputPath);
            link = prefix + '/';
            if (hasVersions && ver) {
                link += '{ver}/';
            }
            link += '{page}.html';
        }

        // apply the linkObj hash to the link string
        href = Utils.format(link, linkObj);
        memberName = memberName || '';

        // if no text was passed we'll use the whole value found after the indicated
        // product in the [[product: namespace]] formatted link
        if (!text) {
            text = namespace;
        }

        return "<a href='" + href + memberName + "'>" + text + "</a>";
    }

    parseAPILinks (html, node) {
        let me = this;

        html = html.replace(/\[{2}([a-z0-9]+):([a-z0-9._\-#]+)\s?([a-z$\/'.()[\]\\_-\s]*)\]{2}/gim, function(match, product, namespace, text) {
            let hasHash = namespace.indexOf('#'),
                hasDash = namespace.indexOf('-'),
                canSplit = !!(hasHash > -1 || hasDash > -1),
                splitIndex = (hasHash > -1) ? hasHash : hasDash,
                className = canSplit ? namespace.substring(0, splitIndex) : namespace,
                hash = canSplit ? namespace.substring(splitIndex + 1) : null,
                memberName;

            if (hash) {
                memberName = hash.replace(/^(cfg-|property-|static-property-|method-|static-method-|event-|css_var-S-|css_mixin-)?([a-zA-Z0-9$-_]+)/, function (match, type, memberName) {
                    let memberInfo = '#' + type + memberName;
                    if (!type) {
                        me.log('error', 'Ambiguous member name \'' + match + '\'.  Consider adding a type to the URL');
                    }

                    return memberInfo;
                });
            }

            return me.createLink(namespace, className, memberName, text, node, product);
        });

        return html;
    }

    parseNode (node, versions, guideJsonObj, apiJson) {
        let me = this,
            output   = me.docDir,
            version  = me.guides.version,
            html = node.text,
            pathArr     = node.path.split('/'),
            pathPrefix  = new Array(pathArr.length).join('../'),
            myPath = node.path.substr(0, node.path.lastIndexOf('/')),
            guideDir = path.join(output, myPath),
            homePath = path.relative(guideDir, me.productDir) + '/',
            tree = guideJsonObj.tree,
            quickStartTree = guideJsonObj.quickStartTree,
            productTree = me.productTree,
            specificId = node.path.replace('/', '_-_'),
            hasVersions    = me.hasVersions,
            isQuickStart = node.paths === 'quick_start',
            isGuide = !isQuickStart,
            guidetreeview, guidetreeoutput;

        node.guideDir = guideDir;

        me.buildTOC(node, html);

        html = me.parseAPILinks(html, node);

        me.prependHrefPath(tree, guideDir, me.docDir);
        me.prependHrefPath(quickStartTree, guideDir, me.docDir);

        me.prependHrefPath(productTree, guideDir, guideDir);

        let newtemplate = handlebars.compile(me.template); // Compile the handlebars template with the view object;
        let treetemplate   = handlebars.compile(handlebars.partials.treeHolderPartial);

        guidetreeview = {
            guideJson : tree,
            quickStartJson : quickStartTree
        };

        guidetreeoutput = treetemplate(guidetreeview);

        html = newtemplate({
            version          : version,
            content          : html,
            name             : node.name,
            nodeId           : node.id,
            title            : me.title || node.name,
            pathPrefix       : pathPrefix,
            stylesheet       : 'app.css',
            footer           : me.footer,
            toc              : node.headers,
            date             : me.date,
            description      : Utils.striphtml(html),
            isGuide          : isGuide,
            isQuickStart     : isQuickStart,
            imagePath        : path.relative(guideDir, me.productDir + '/home-images') + '/',
            cssPath          : path.relative(guideDir, me.productDir + '/css') + '/',
            homePath         : homePath,
            jsPath           : path.relative(guideDir, me.productDir + '/js') + '/',
            hasApi           : me.hasApi,
            hasGuides        : me.hasGuides,
            canonical        : me.docroot + "guides/" + node.path + '.html',
            product          : me.projectConfigs.normalizedProductList[me.config],
            pversion         : me.pversion,
            treeview         : guidetreeoutput,
            guideJson        : tree,
            quickStartJson   : quickStartTree,
            toolkit          : me.otherToolkit ? Utils.capitalize(me.otherToolkit) : '',
            toolkitLink      : me.toolkitLink,
            productTree      : productTree,
            numVer           : me.numberVer,
            specificId       : specificId,
            hasVersions      : hasVersions,
            helpText         : me.helpText,
            helpToc          : me.helpToc,
            myToolkit        : me.toolkit,
            tier             : node.tier,
            appliesToToolkit : node.myToolkit,
            myVersion        : me.getProductVersion()
        });

        pathArr.pop();

        me.log('info', 'Writing HTML: ' + node.name);

        mkdirp.sync(path.join(output, pathArr.join('/')));

        html = me.decorateExamples(html);

        fs.writeFileSync(path.join(output, node.path + '.html'), html, 'utf-8');
    }

    /**
     * Collect up keywords from the doc
     * @param {Object} obj The accumulating search object
     * @param {String} title The doc title
     * @param {String} body The body text of the document
     */
    parseSearchWords (obj, title, body) {
        let me = this,
            entities = new Entities(),
            whitelist = ['vs', 'getting', 'new'],
            parsedTitle, parsedBody;

        parsedTitle = gramophone.extract(entities.decode(title), {
            html: true,
            score: true,
            ngrams: [1, 2, 3, 4, 5, 6, 7],
            alternativeTokenizer: true,
            min: 1,
            startWords: whitelist
        });

        parsedBody = gramophone.extract(entities.decode(body), {
            html: true,
            score: true,
            ngrams: [1, 2, 3, 4, 5, 6, 7],
            alternativeTokenizer: true
        });

        me.addTerms(obj, parsedTitle, 't');
        me.addTerms(obj, parsedBody, 'b');
    }

    /**
     * @private
     * Private method used by parseSearchWords to add the collected words to the parent
     * search words object
     */
    addTerms (obj, terms, type) {
        let words = obj.searchWords;

        terms.forEach(function (item) {
            let term = item.term;

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
        });
    }

    getFilePath (input, nodePath, version, versions) {

        var pathTest = path.join(input, version, nodePath + '.md');

        try {
            let stats = fs.lstatSync(pathTest);

            return pathTest;
        } catch(e) {
            //this version did not have the file, check next version
            let idx = versions.indexOf(version);

            idx++;

            return this.getFilePath(input, nodePath, versions[idx], versions);
        }
    }
}

module.exports = Guide;
