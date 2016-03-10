'use strict';

const fs         = require('fs');
const path       = require('path');
const util       = require('util');
const compressor = require('node-minify');
const handlebars = require('handlebars');
const jsdom      = require('jsdom');
const marked     = require('sencha-marked');
const mkdirp     = require('mkdirp');
const Base       = require('../base');
const debug      = require('../../Debug');
const wrench     = require('wrench');
const xmlbuild   = require('xmlbuilder');
const fileArray = [];

handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
});

class Guide extends Base {
    get defaultOptions () {
        return {
            compress    : false,
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
                    name        : 'version',
                    short       : 'v',
                    type        : 'string',
                    description : 'The version to parse',
                    example     : '`index guide-parser --version=6.0` or `index guide-parser -v 6.0`'
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
        debug.info(__dirname);

        new compressor.minify({
            type    : me.compress ? 'yui-js' : 'no-compress',
            fileIn  : [me.extl, me.treeview, './modules/base/js/main.js'],
            fileOut : me.destination + '/js/app.js'
        });
    }

    run () {
        let me            = this,
            options       = me.options,
            guidesInput   = me.guides.path,
            output        = me.destination + '/guides/',
            productConfig = JSON.parse(fs.readFileSync(guidesInput + '/config.json', 'utf8')),
            versions      = productConfig.versions || "",
            contents      = productConfig.contents,
            tree          = [], nodes = [],
            headhtml      = me.headhtml,
            root          = xmlbuild.create('urlset').att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9"),
            stringfiedTree, i, xmlString;

        if (me.beforeExecute) {

            // overwrite here if possible
            me.beforeExecute(fileArray);
        }

        debug.info('Reading', 'product config.json');

        me.guidesInput = guidesInput;
        me.output      = output;
        me.template    = fs.readFileSync(me.guides.template, 'utf-8');

        mkdirp.sync(output);

        me.parseContents(contents, tree, null, versions, nodes);

        stringfiedTree = JSON.stringify(tree, null, me.compress ? 0 : 4);

        if (me.targets[0] === 'tree') {
            debug.info('Writing', 'guide_tree.json');

            fs.writeFileSync(output + 'guide_tree.json', stringfiedTree, 'utf-8');
        } else {
            mkdirp.sync(output + 'css/');
            mkdirp.sync(output + 'js/');

            new compressor.minify({
                type    : me.compress ? 'yui-css' : 'no-compress',
                fileIn  : [options.stylesheet, options.treestyle],
                fileOut : output + '/css/app.css'
            });
        }

        for (i=0; i<nodes.length; i++) {
            me.parseNode(nodes[i].node, nodes[i].versions, stringfiedTree);

            if (nodes[i]) {
                let obj = {
                    url : {
                        loc: me.docroot + 'guides/' + nodes[i].node.path + '.html'
                    }
                };

                root.ele(obj);
            }
        }

        xmlString = root.doc().end({ pretty: true, indent: '  ', newline: '\n' });

        fs.writeFileSync(output + 'guide-sitemap.xml', xmlString, 'utf-8');

        debug.info('Writing Tree JSON');

        fs.writeFileSync(output + 'js/guide-tree.js', 'ExtL.treeDataGuide = ' + stringfiedTree + ';', 'utf-8');

        me.createIndexPage({
            date: me.date,
            footer: me.footer,
            title: me.title
        });
    }

    parseContents (contents, parent, paths, versions, nodes) {
        let me = this;

        contents.forEach(function(content) {
            let nodePath = paths ? paths + '/' + content.slug : content.slug,
                node     = {
                    id   : nodePath.replace('/', '_-_'),
                    slug : content.slug,
                    name : content.name,
                    path : nodePath
                },
                copyImages = false,
                isRoot = false;

            if (content.children) {
                node.leaf     = false;
                node.children = [];
                debug.info('Parsing Guide', content.name);
                me.parseContents(content.children, node.children, node.path, versions, nodes);
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
                    nodes.push({
                        node : node,
                        versions: versions
                    });
                }
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
            imagesPath = guidesInput + '/' +  currentVersion + (isRoot ? '' : ('/' + node.path)) + '/images',
            output = me.output,
            v = versions.slice(0);

        // Check to see if images director exists in source folder
        // Copy if so
         fs.stat(imagesPath, function(err) {
            if(!err) {
                wrench.copyDirSyncRecursive(imagesPath, output + (isRoot ? '' : node.path) + '/images/', {
                    forceDelete: true
                });
                wrench.chmodSyncRecursive(output + (isRoot ? '' : node.path) + '/images/', '0755');

                debug.info('Writing image directory ' + currentVersion + '/' + node.path);
            } else {
                debug.info('No image directory found at ' + currentVersion + '/' + node.path);
                if (v.length > 1) {
                    v.splice(0,1);
                    me.syncImages.call(me, node, v, isRoot);
                }
            }
        });
    }

    parseLink (node, link) {
        node.link = link;
    }

    createLink (link, namespace, text) {
        let flinks = this.frameworks[link];

        if (!text) {
            text = namespace;
        }

        if (!flinks) {
            console.log(link);
            console.log(namespace);
            console.log(text);
        }

        return "<a target='_blank' href='" + flinks + namespace + "'>" + text + "</a>";
    }

    parseAPILinks (html) {
        let me = this;

        html = html.replace(/\[\[(.*?):(.*?)\s?(.*?)]]/gim, function(match, link, namespace, text) {
            return me.createLink(link, namespace, text);
        });

        return html;
    }

    parseNode (node, versions) {
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
                }
            });

        me.buildTOC(node, html);

        html = me.parseAPILinks(html);

        if (!target || target === 'html') {
            let pathArr     = node.path.split('/'),
                newtemplate = handlebars.compile(me.template), // Compile the handlebars template with the view object
                pathPrefix  = new Array(pathArr.length).join('../');

            html = newtemplate({
                content    : html,
                name       : node.name,
                nodeId     : node.id,
                title      : me.title,
                pathPrefix : pathPrefix,
                stylesheet : 'css/app.css',
                footer     : me.footer,
                toc        : node.headers,
                date       : me.date
            });

            pathArr.pop();

            debug.info('Writing HTML:', node.name);

            mkdirp.sync(path.join(output, pathArr.join('/')));

            fs.writeFileSync(path.join(output, node.path + '.html'), html, 'utf-8');
        }
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

    buildTOC (node, html, callback) {
        debug.info('Building TOC for:', node.name);

        let doc     = jsdom.jsdom(html, {
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

module.exports = Guide;
