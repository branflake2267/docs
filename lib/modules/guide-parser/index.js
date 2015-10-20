var fs         = require('fs'),
    path       = require('path'),
    util       = require('util'),
    compressor = require('node-minify'),
    handlebars = require('handlebars'),
    jsdom      = require('jsdom'),
    marked     = require('marked'),
    mkdirp     = require('mkdirp'),
    Base       = require('../base'),
    debug      = require('../../Debug'),
    Renderer   = require('../shared/Renderer');

function Guide(targets, options) {
    Base.call(this, targets, options);
}

util.inherits(Guide, Base);

Guide.prototype.defaultOptions = {
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
    template    : __dirname + '/template.hbs'
};

Guide.register = function(argv) {
    argv.mod({
        mod         : 'guide-parser',
        description : 'Parse guides',
        options     : [
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
};

Base.prototype.checkArgs = function() {
    return !!this.options.version;
};

Guide.prototype.run = function() {
    debug.info('Reading', 'config.json');

    var options  = this.options,
        input    = options.input,
        output   = options.destination,
        compress = options.compress,
        config   = JSON.parse(fs.readFileSync(input + 'config.json', 'utf8')),
        versions = config.versions,
        contents = config.contents,
        tree     = [];

    this.template = fs.readFileSync(options.template, 'utf-8');

    mkdirp.sync(output);

    this.parseContents(contents, tree, null, versions);

    if (this.targets[0] === 'tree') {
        debug.info('Writing', 'guide_tree.json');

        fs.writeFileSync(output + 'guide_tree.json', JSON.stringify(tree, null, compress ? 0 : 4), 'utf-8');
    } else {
        mkdirp.sync(output + 'css/');

        new compressor.minify({
            type    : compress ? 'yui-css' : 'no-compress',
            fileIn  : [options.stylesheet],
            fileOut : output + '/css/app.css'
        });
    }
};

Guide.prototype.parseContents = function(contents, parent, paths, versions) {
    var me = this;

    contents.forEach(function(content) {
        var nodePath = paths ? paths + '/' + content.slug : content.slug,
            node     = {
                id   : content.slug,
                name : content.name,
                path : nodePath
            };

        if (content.children) {
            node.leaf     = false;
            node.children = [];

            me.parseContents(content.children, node.children, node.path, versions);
        } else {
            node.leaf = true;

            debug.info('Parsing Guide:', content.name);

            if (content.link) {
                me.parseLink(node, content.link);
            } else {
                me.parseNode(node, versions);
            }
        }

        parent.push(node);
    });
};

Guide.prototype.parseLink = function(node, link) {
    node.link = link;
};

Guide.prototype.parseNode = function(node, versions) {
    var target   = this.targets[0],
        options  = this.options,
        input    = options.input,
        output   = options.destination,
        version  = options.version,
        filePath = this.getFilePath(input, node.path, version, versions),
        markdown = fs.readFileSync(filePath, 'utf8'),
        html     = marked(markdown, {
            renderer : Renderer({
                addHeaderId : function(text, level, raw) {
                    return node.path.replace(/[^\w]+/g, '-_-') + '_-_' + raw.toLowerCase().replace(/[^\w]+/g, '-');
                }
            })
        });

    this.buildTOC(node, html);

    if (!target || target === 'html') {
        var pathArr     = node.path.split('/'),
            newtemplate = handlebars.compile(this.template), // Compile the handlebars template with the view object
            pathPrefix  = new Array(pathArr.length).join('../');

        html = newtemplate({
            content    : html,
            name       : node.name,
            stylesheet : pathPrefix + 'css/app.css',
            toc        : node.headers
        });

        pathArr.pop();

        debug.info('Writing HTML:', node.name);

        mkdirp.sync(path.join(output, pathArr.join('/')));

        fs.writeFileSync(path.join(output, node.path + '.html'), html, 'utf-8');
    }
};

Guide.prototype.getFilePath = function(input, nodePath, version, versions) {
    var pathTest = path.join(input, version, nodePath + '.md'),
        stats;

    try {
        stats = fs.lstatSync(pathTest);

        return pathTest;
    } catch(e) {
        //this version did not have the file, check next version
        var idx = versions.indexOf(version);

        idx++;

        return this.getFilePath(input, nodePath, versions[idx], versions);
    }
};

Guide.prototype.buildTOC = function(node, html, callback) {
    debug.info('Building TOC for:', node.name);

    var doc     = jsdom.jsdom(html, {
            ProcessExternalResources : false
        }),
        headers = doc.querySelectorAll('h2, h3, h4, h5, h6'),
        i       = 0,
        length  = headers.length,
        tocs    = [],
        el;

    if (length) {
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
};

module.exports = Guide;
