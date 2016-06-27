'use strict';

const CT         = require('../class-tree');
//const fs         = require('fs');
const path       = require('path');
const util       = require('util');
const compressor = require('node-minify');
const handlebars = require('handlebars');
const marked     = require('sencha-marked');
const mkdirp     = require('mkdirp');
const Base       = require('../base');
const debug      = require('../../Debug');
const wrench     = require('wrench');
const xmlbuild   = require('xmlbuilder');
const Utils      = require('../shared/Utils');
const gramophone = require('sencha-gramophone'); // https://github.com/edlea/gramophone
const shell      = require('shelljs');
const fs         = require('fs-extra');

var Entities = require('html-entities').AllHtmlEntities;
const fileArray = [];

handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
});

class Guide extends Base {
    get defaultOptions () {
        return {
            compress    : true,
            destination : {
                type  : 'path',
                value : __dirname + '/../../output/'
            },
            stylesheet  : __dirname + '/../base/css/styles.css',
            treestyle   : __dirname + '/../base/css/treeview.css',
            extl        : __dirname + '/../base/js/ExtL.js',
            treeview    : __dirname + '/../base/js/treeview.js'
        };
    }

    static register (argv) {
        argv.mod({
            mod         : 'guide-parser',
            description : 'Parse guides',
            options     : [
                {
                    name        : 'config',
                    short       : 'con',
                    type        : 'string',
                    description : 'The config file holding all of the configurations for the build process.',
                    example     : '`index guide-parser --config=./classic-toolkit-config.json`'
                },
                {
                    name        : 'input',
                    short       : 'i',
                    type        : 'string',
                    description : 'The location where the markdown files are contained. Defaults to "./guides".',
                    example     : '`index guide-parser --input=./guides` or `index guide-parser -i ./guides`'
                },
                {
                    name        : 'stylesheet',
                    short       : 's',
                    type        : 'string',
                    description : 'The CSS stylesheet for use in the template. Defaults to "./modules/guide-parser/css/styles.css".',
                    example     : '`index guide-parser --stylesheet=./modules/guide-parser/css/styles.css` or `index guide-parser -s ./modules/guide-parser/css/styles.css`'
                },
                {
                    name        : 'template',
                    short       : 't',
                    type        : 'string',
                    description : 'The handlebars template file. Defaults to "./modules/guide-parser/template.hbs".',
                    example     : '`index guide-parser --template=./modules/guide-parser/template.hbs` or `index guide-parser -t ./modules/guide-parser/template.hbs`'
                },
                {
                    name        : 'destination',
                    short       : 'd',
                    type        : 'string',
                    description : 'The destination location of the generated markdown. Defaults to "./output".',
                    example     : '`index guide-parser --destination=./output` or `index guide-parser -d ./output`'
                },
                {
                    name        : 'compress',
                    short       : 'c',
                    type        : 'boolean',
                    description : 'Whether or not to compress the JSON or leave whitespaces. Defaults to `false`.',
                    example     : '`index json-parser --compress` or `index json-parser -c'
                },
                {
                    name        : 'pversion',
                    short       : 'pv',
                    type        : 'string',
                    description : 'The version of the product you are building',
                    example     : 'index source-parser -v 1.0.1'
                }
            ]
        });
    }

    /*
    checkArgs () {
        return !!this.options.version;
    }*/

    beforeExecute (fileArray) {
        let me = this;

        super.beforeExecute(fileArray);

        new compressor.minify({
            type    : me.compress ? 'yui-js' : 'no-compress',
            fileIn  : [me.extl, me.treeview, './modules/base/js/main.js'],
            fileOut : path.join(me.destination, '/js/app.js')
        });
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
            projectConfigs = require('../../configs/projectConfigs'),
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
            projectConfigs = require('../../configs/projectConfigs'),
            hasVersions    = projectConfigs.productIndex[projectConfigs.normalizedProductList[me.config]].hasVersions,
            guideCfg       = me.guides.config || 'config.json',
            productConfig  = require(path.relative(__dirname, me.guides.path) + '/' + guideCfg),
            versions = productConfig.versions,
            contents = productConfig.contents,
            tree = [],
            nodes = [];

        me.guidesInput = me.guides.path;
        me.output = hasVersions ? path.join(me.destination, me.pversion, '/guides/') : path.join(me.destination, '/guides/');
        me.parseContents(contents, tree, null, versions, nodes, skipImages);

        return {
            tree: tree,
            nodes: nodes
        };
    }

    run () {
        let me             = this,
            guidesInput    = me.guides.path,
            version        = me.pversion,
            versionNumber  = version ? version.split("-")[0] : version,
            projectConfigs = require('../../configs/projectConfigs'),
            hasVersions    = projectConfigs.productIndex[projectConfigs.normalizedProductList[me.config]].hasVersions,
            homedest       = hasVersions ? path.join(me.destination, version, '/') : path.join(me.destination, '/'),
            output         = hasVersions ? path.join(me.destination, version, '/guides/') : path.join(me.destination, '/guides/'),
            guideJsonObj   = me.getGuideJson(),
            tree           = guideJsonObj.tree,
            nodes          = guideJsonObj.nodes,
            headhtml       = me.headhtml,
            root           = xmlbuild.create('urlset').att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9"),
            productMapJson = require('../base/product-map'),
            otherToolkit   = me.otherToolkit || null,
            stringfiedTree, i, xmlString, myJsonParser, apiJson;

        //me.buildTOC(tempObj, helpText);

        if(otherToolkit) {
            me.toolkit = otherToolkit;
            me.toolkitLink = versionNumber + '-' + otherToolkit;
        }

        if (me.hasApi) {
            myJsonParser = new CT(this.targets, this.options)
            myJsonParser.run(true);
            apiJson = myJsonParser.createTree();
        }

        if (me.beforeExecute) {
            // overwrite here if possible
            me.beforeExecute(fileArray);
        }

        debug.info('Reading', 'product config.json');

        me.guidesInput = guidesInput;
        me.output      = output;
        me.template    = fs.readFileSync(me.guides.template, 'utf-8');
        me.version     = version;

        mkdirp.sync(output);

        stringfiedTree = JSON.stringify(tree, null, me.compress ? 0 : 4);

        if (me.targets[0] === 'tree') {
            debug.info('Writing', 'guide_tree.json');

            fs.writeFileSync(output + 'guide_tree.json', stringfiedTree, 'utf-8');
        } else {
            mkdirp.sync(me.destination + '/css/');
            mkdirp.sync(me.destination + '/js/');

            new compressor.minify({
                type    : me.compress ? 'yui-css' : 'no-compress',
                fileIn  : [me.stylesheet, me.treestyle],
                fileOut : me.destination + '/css/app.css'
            });
        }

        me.searchWords = {};
        me.searchRef = [];
        me.searchUrls = [];
        for (i = 0; i < nodes.length; i++) {
            me.searchWordsIndex = i;
            //nodes[i].node.helpText = helpText;
            //nodes[i].node.helpToc = tempObj.headers;
            me.parseNode(nodes[i].node, nodes[i].versions, stringfiedTree, apiJson);

            if (nodes[i]) {
                let obj = {
                    url : {
                        loc: me.docroot + 'guides/' + nodes[i].node.path + '.html'
                    }
                };

                root.ele(obj);
            }
        }

        fs.writeFileSync(homedest + 'js/guideSearch.js', 'var guideSearchWords = ' + JSON.stringify(me.searchWords) + ';var guideSearchRef = ' + JSON.stringify(me.searchRef) + ';var guideSearchUrls = ' + JSON.stringify(me.searchUrls) + ';', 'utf-8');

        xmlString = root.doc().end({ pretty: true, indent: '  ', newline: '\n' });

        fs.writeFileSync(output + 'guide-sitemap.xml', xmlString, 'utf-8');

        me.prependHrefPath(tree, me.destination);
        if (me.hasApi) {
            me.prependHrefPath(apiJson, me.destination);
        }
        me.prependHrefPath(productMapJson, me.destination);

        me.createIndexPage({
            date: me.date,
            title: me.title,
            docroot: me.docroot,
            headhtml: headhtml,
            version : version,
            description: me.description,
            stylesheet : 'app.css',
            canonical : me.docroot + 'index.html',
            apiJson: apiJson,
            guideJson: tree,
            productMapJson: productMapJson,
            numVer : me.numberVer,
            meta : me.meta,
            toolkit     : me.toolkit ? me.toolkit.charAt(0).toUpperCase() + me.toolkit.slice(1) : '',
            toolkitLink : me.toolkitLink,
            hasVersions : false
        });
    }

    parseContents (contents, parent, paths, versions, nodes, skipImages) {
        let me = this;

        contents.forEach(function(content) {
            let nodePath = paths ? paths + '/' + content.slug : content.slug,
                guideDir = path.join(me.output, nodePath),
                specificId = nodePath.replace('/', '_-_'),
                node     = {
                    id        : specificId,
                    slug      : content.slug,
                    elIdSlug  : specificId,
                    name      : content.name,
                    path      : nodePath,
                    displayNew: content.displayNew
                },
                copyImages = false,
                isRoot = false;

            if (content.children) {
                node.leaf     = false;
                node.children = [];
                debug.info('Parsing Guide', content.name);
                me.parseContents(content.children, node.children, node.path, versions, nodes, skipImages);
                copyImages = true;
            } else {
                if (!parent.length) {
                    copyImages = true;
                    isRoot = true;
                }
                node.leaf = true;

                if (content.link) {
                    me.parseLink(node, content.link);
                } else {
                    node.href = me.guides.output + '/' + nodePath;
                    nodes.push({
                        node : node,
                        versions: versions
                    });
                }
            }

            // if getGuideJson > parseContents was called by json-parser to create the
            // guide json for navigation we'll skip creating images
            if (skipImages) {
                copyImages = false;
            }

            if (copyImages) {
                me.syncImages(node, versions, isRoot);
            }

            parent.push(node);
        });
    }

    syncImages (node, versions, isRoot) {
        let me = this,
            guidesInput = me.guidesInput,
            currentVersion = versions[0],
            output = me.output,
            outPath = output + (isRoot ? '' : node.path) + '/images/',
            v = versions.slice(0),
            vers = v.slice(0),
            imagesPath;

        Utils.each(vers.reverse(), function (ver) {
            imagesPath = guidesInput + '/' +  ver + (isRoot ? '' : ('/' + node.path)) + '/images';

            // Check to see if images director exists in source folder
            // Copy if so
            if (fs.existsSync(imagesPath)) {
                shell.mkdir('-p', outPath);
                fs.copy(imagesPath, outPath);

                if(fs.existsSync(outPath)) {
                    fs.chmod(outPath, '0755');
                }

                debug.info('Writing image directory ' + currentVersion + '/' + node.path);
            }
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
        let normalized = this.getNormalizedProductAndVersion(product),
            pVersion = this.pversion,
            //toolkit = pVersion.indexOf('-') > -1 ? pVersion.substr(pVersion.indexOf('-') + 1) : false,
            //myVersion = toolkit ? pVersion.substring(0, pVersion.indexOf('-')) : pVersion,
            prodLiteral = normalized.productLiteral,
            prod = normalized.product,
            projectConfigs = require('../../configs/projectConfigs'),
            index = projectConfigs.productIndex,
            //ver = normalized.version || (index[prod] ? index[prod].currentVersion : null),
            ver = normalized.version || (index[prod] ? pVersion : index[prod].currentVersion),
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
            ver += '-' + prodLiteral;
        } else if (index[prod].toolkits) {
            // else if the product has toolkits and the current product version is in the
            // list of versions that have toolkits then append that product's default
            // toolkit as defined in the product index since no literal toolkit was
            // indicated
            if (index[prod].toolkits.indexOf(majorVer) !== -1) {
                if (ver.indexOf('-') === -1) {
                    ver += '-' + index[prod].defaultToolkit;
                }
            }
        }
        // connect the version to the linkObject to be used in formatting the href string
        linkObj.ver = ver;

        // if a link was not found on the product index we'll need to construct it using
        // the output path on the product config file to find the relative path prefix
        if (!link) {
            productConfig = this.getProductConfig(prod);
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

        html = html.replace(/\[{2}([a-z0-9]+):([a-z.\-#]+)\s?([a-z$\/'.()[\]\-\s]*)\]{2}/gim, function(match, product, namespace, text) {
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
                        debug.error ('Ambiguous member name \'' + match + '\'.  Consider adding a type to the URL');
                    }

                    return memberInfo;
                });
            }

            return me.createLink(namespace, className, memberName, text, node, product);
        });

        return html;
    }

    /**
     * Method used by parseAPILinks to loop through all classes to find a member and
     * report back its type
     * @param {String} className The class name itself
     * @param {String} memberName The name of the class member.  This could be the name,
     * type-name pair, or null if no member is included in the link
     * @return {String} Returns the linkable member along with its type
     */
    findMemberType (className, memberName, classList) {
        let classObj = classList[className],
            type = '',
            typeArr;

        typeArr = classObj['n-' + memberName];
        if (typeArr && typeArr.length) {
            if (typeArr.length > 1) {
                debug.error('Ambiguous link.  Member: ' + memberName + ' exists as more than one type on class: ' + className);
            }

            type = typeArr[0];
        }

        if (!typeArr) {
            if (classObj.__parent) {
                type = this.findMemberType(classObj.__parent, memberName, classList);
            } else {
                debug.error('Class member not found.  Member: ' + memberName + ' was not found when inspecting ' + className);
            }
        }

        return type;
    }

    parseNode (node, versions, stringifiedTree, apiJson) {
        let me = this,
            target   = me.targets[0],
            guidesInput = me.guidesInput,
            output   = me.output,
            version  = me.guides.version,
            filePath = me.getFilePath(guidesInput, node.path, version, versions),
            markdown = fs.readFileSync(filePath, 'utf8'),
            idRe     = /[^\w]+/g,
            html     = marked(markdown, {
                addHeaderId : function(text, level, raw) {
                    return node.path.replace(idRe, '-_-') + '_-_' + raw.toLowerCase().replace(idRe, '_');
                },
                appendLink: true,
                decorateExternal: true
            }),
            pathArr     = node.path.split('/'),
            pathPrefix  = new Array(pathArr.length).join('../'),
            myPath = node.path.substr(0, node.path.lastIndexOf('/')),
            guideDir = path.join(output, myPath),
            homePath = path.relative(guideDir, me.destination) + '/',
            tree = JSON.parse(stringifiedTree),
            productMapJson = require('../base/product-map'),
            specificId = node.path.replace('/', '_-_'),
            projectConfigs = require('../../configs/projectConfigs'),
            hasVersions    = projectConfigs.productIndex[projectConfigs.normalizedProductList[me.config]].hasVersions;

        node.guideDir = guideDir;

        me.buildTOC(node, html);

        me.searchRef.push(node.name);
        me.parseSearchWords(node.name, html);

        html = me.parseAPILinks(html, node);

        if (!target || target === 'html') {
            let newtemplate = handlebars.compile(me.template); // Compile the handlebars template with the view object;

            me.searchUrls.push(node.id.replace('_-_', '/'));

            me.prependHrefPath(tree, guideDir);
            if (me.hasApi) {
                me.prependHrefPath(apiJson, guideDir);
            }
            me.prependHrefPath(productMapJson, guideDir);

            html = newtemplate({
                version       : version,
                content       : html,
                name          : node.name,
                nodeId        : node.id,
                title         : me.title || node.name,
                pathPrefix    : pathPrefix,
                stylesheet    : 'app.css',
                footer        : me.footer,
                toc           : node.headers,
                date          : me.date,
                description   : Utils.striphtml(html),
                isGuide       : true,
                imagePath     : path.relative(guideDir, me.destination + '/home-images') + '/',
                cssPath       : path.relative(guideDir, me.destination + '/css') + '/',
                homePath      : homePath,
                jsPath        : path.relative(guideDir, me.destination + '/js') + '/',
                hasApi        : me.hasApi,
                hasGuides     : me.hasGuides,
                canonical     : me.docroot + node.path + '.html',
                product       : me.productMap[me.config],
                pversion      : me.pversion,
                guideJson     : tree,
                apiJson       : apiJson,
                toolkit       : me.toolkit ? me.toolkit.charAt(0).toUpperCase() + me.toolkit.slice(1) : '',
                toolkitLink   : me.toolkitLink,
                productMapJson: productMapJson,
                numVer        : me.numberVer,
                meta          : me.meta,
                specificId    : specificId,
                hasVersions   : hasVersions,
                helpText      : me.helpText,
                helpToc       : me.helpToc
            });

            pathArr.pop();

            debug.info('Writing HTML:', node.name);

            mkdirp.sync(path.join(output, pathArr.join('/')));

            html = me.decorateExamples(html);

            fs.writeFileSync(path.join(output, node.path + '.html'), html, 'utf-8');
        }
    }

    /**
     * Collect up keywords from the doc
     * @param {String} title The doc title
     * @param {String} body The body text of the document
     */
    parseSearchWords (title, body) {
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

        me.addTerms(parsedTitle, 't');
        me.addTerms(parsedBody, 'b');
    }

    /**
     * @private
     * Private method used by parseSearchWords to add the collected words to the parent
     * search words object
     */
    addTerms (terms, type) {
        let me = this,
            words = me.searchWords;

        terms.forEach(function (item) {
            let term = item.term;

            item.t = type;
            // the index of the guide where the match was made
            item.r = me.searchWordsIndex;
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
