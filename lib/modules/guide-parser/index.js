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

class Guide extends Base {
    get defaultOptions () {
        return {
            compress    : false,
            destination : {
                type  : 'path',
                value : __dirname + '/../../output/'
            },
            input       : {
                type  : 'path',
                value : __dirname + '/../../guides/'
            },
            stylesheet  : __dirname + '/css/styles.css',
            treestyle   : __dirname + '/css/treeview.css',
            extl        : __dirname + '/js/ExtL.js',
            treeview    : __dirname + '/js/treeview.js',
            template    : __dirname + '/template.hbs',
            hometemplate: __dirname + '/hometemplate.hbs'
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

    run () {
        let me           = this,
            options      = me.options,
            configFile   = fs.readFileSync(options.config, 'utf-8'),
            configs      = JSON.parse(configFile),
            input        = configs.input.value,
            guidesInput  = configs.guides.path,
            output       = configs.destination.value + '/guides/',
            compress     = configs.compress,
            productConfig= JSON.parse(fs.readFileSync(guidesInput + '/config.json', 'utf8')),
            hometemplate = options.hometemplate,
            versions     = productConfig.versions || "",
            contents     = productConfig.contents,
            imgs         = path.join(guidesInput, configs.guides.version, 'images/'),
            tree         = [], nodes = [],
            dt           = new Date(),
            date         = dt.toLocaleString("en-us",{month:"long"}) + ", " + dt.getDate() + " " + dt.getFullYear() + " at " + dt.getHours() + ":" + dt.getMinutes(),
            stringfiedTree, i;

        debug.info('Reading', 'product config.json');

        this.input = input;
        this.guidesInput = guidesInput;
        this.output = output;
        this.date = date;
        this.configs = configs;

        me.template = fs.readFileSync(options.template, 'utf-8');
        me.hometemplate = fs.readFileSync(hometemplate, 'utf-8');

        mkdirp.sync(output);

        me.parseContents(contents, tree, null, versions, nodes);

        stringfiedTree = JSON.stringify(tree, null, compress ? 0 : 4);

        if (me.targets[0] === 'tree') {
            debug.info('Writing', 'guide_tree.json');

            fs.writeFileSync(output + 'guide_tree.json', stringfiedTree, 'utf-8');
        } else {
            mkdirp.sync(output + 'css/');

            new compressor.minify({
                type    : compress ? 'yui-css' : 'no-compress',
                fileIn  : [options.stylesheet, options.treestyle],
                fileOut : output + '/css/app.css'
            });

            new compressor.minify({
                type    : compress ? 'yui-js' : 'no-compress',
                fileIn  : [options.treeview],
                fileOut : output + '/js/home.js'
            });
        }

        for (i=0; i<nodes.length; i++) {
            me.parseNode(nodes[i].node, nodes[i].versions, stringfiedTree);
        }

        // Check to see if images director exists in source folder
        // Copy if so
        fs.stat(imgs, function(err) {
            if(!err) {
                wrench.copyDirSyncRecursive(imgs, output + 'images/', {
                    forceDelete: true
                });

                wrench.chmodSyncRecursive(output + 'images/', '0755');
                debug.info('Writing image directory');
            } else {
                debug.info('No image directory found at ' + imgs);
            }
        });

        // Write guides "home" page
        let newhometemplate = handlebars.compile(me.hometemplate),
            homeoutput   = newhometemplate({
                name: 'Sencha Test Guides',
                tree: stringfiedTree,
                stylesheet : 'css/app.css',
                footer: 'ExtJS API Guides | <a href=\'https://www.sencha.com/legal/terms-of-use/\' target=\'_blank\'>Terms of Use</a> | ',
                date: date
            });

        fs.writeFileSync(output + 'index.html', homeoutput, 'utf-8');
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
                };

            if (content.children) {
                node.leaf     = false;
                node.children = [];

                me.parseContents(content.children, node.children, node.path, versions, nodes);
            } else {
                node.leaf = true;

                debug.info('Parsing Guide:', content.name);

                if (content.link) {
                    me.parseLink(node, content.link);
                } else {
                    nodes.push({
                        node : node,
                        versions: versions
                    });
                }
            }

            parent.push(node);
        });
    }

    parseLink (node, link) {
        node.link = link;
    }

    parseNode (node, versions, tree) {
        let target   = this.targets[0],
            options  = this.options,
            input    = this.input,
            guidesInput = this.guidesInput,
            output   = this.output,
            version  = this.configs.guides.version,
            filePath = this.getFilePath(guidesInput, node.path, version, versions),
            markdown = fs.readFileSync(filePath, 'utf8'),
            idRe     = /[^\w]+/g,
            html     = marked(markdown, {
                addHeaderId : function(text, level, raw) {
                    return node.path.replace(idRe, '-_-') + '_-_' + raw.toLowerCase().replace(idRe, '_');
                }
            });

        this.buildTOC(node, html);

        if (!target || target === 'html') {
            let pathArr     = node.path.split('/'),
                newtemplate = handlebars.compile(this.template), // Compile the handlebars template with the view object
                pathPrefix  = new Array(pathArr.length).join('../');

            html = newtemplate({
                content    : html,
                name       : node.name,
                title      : 'ExtJS API Guides',
                pathPrefix : pathPrefix,
                stylesheet : 'css/app.css',
                homejs     : 'js/home.js',
                tree       : tree,
                toc        : node.headers,
                date       : this.date
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
