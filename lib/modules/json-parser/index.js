var fs         = require('fs'),
    util       = require('util'),
    handlebars = require('handlebars'),
    junk       = require('junk'),
    mkdirp     = require('mkdirp'),
    marked     = require('marked'),
    compressor = require('node-minify'),
    ClassTree  = require('../class-tree'),
    Renderer   = require('./Renderer'),
    Tree       = require('../shared/Tree'),
    Utils      = require('../shared/Utils'),
    debug      = require('../../Debug');

var exampleRe   = /@example/g,
    hashStartRe = /^#/,
    linkRe      = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g,
    safeLinkRe  = /(\[\]|\.\.\.)/g,
    widgetRe    = /widget./g;

marked.setOptions({
    renderer : new Renderer({
        addHeaderId : false
    })
});

function JsonParser(targets, options) {
    ClassTree.call(this, targets, options);
}

util.inherits(JsonParser, ClassTree);

JsonParser.register = function(argv) {
    argv.mod({
        mod         : 'json-parser',
        description : 'Parse JSON',
        options     : [
            {
                name        : 'input',
                short       : 'i',
                type        : 'string',
                description : 'The location where the JSON files are contained. Defaults to "./json".',
                example     : '`index json-parser --input=./json` or `index json-parser -i ./json`'
            },
            {
                name        : 'stylesheet',
                short       : 's',
                type        : 'string',
                description : 'The CSS stylesheet for use in the template. Defaults to "./modules/json-parser/css/styles.css".',
                example     : '`index json-parser --stylesheet=./modules/json-parser/css/styles.css` or `index json-parser -s ./modules/json-parser/css/styles.css`'
            },
            {
                name        : 'template',
                short       : 't',
                type        : 'string',
                description : 'The handlebars template file. Defaults to "./modules/json-parser/template.hbs".',
                example     : '`index json-parser --template=./modules/json-parser/template.hbs` or `index json-parser -t ./modules/json-parser/template.hbs`'
            },
            {
                name        : 'destination',
                short       : 'd',
                type        : 'string',
                description : 'The destination location of the generated html. Defaults to "./output".',
                example     : '`index json-parser --destination=./output` or `index json-parser -d ./output`'
            }
        ]
    });
};

JsonParser.prototype.beforeExecute = function(input, output) {
    var options     = this.options,
        stylesheet  = options.stylesheet || __dirname + '/css/styles.css',
        templateLoc = options.template   || __dirname + '/template.hbs',
        compress    = true; //true to compress js/css files, false to only concatenate

    this.template = fs.readFileSync(templateLoc, 'utf-8')

    //create the output directories
    mkdirp.sync(output + 'css/');
    mkdirp.sync(output + 'js/');

    new compressor.minify({
        type    : compress ? 'yui-js' : 'no-compress',
        fileIn  : [__dirname + '/js/ExtL.js', __dirname + '/js/treeview.js', __dirname + '/js/main.js'],
        fileOut : output + '/js/app.js'
    });

    new compressor.minify({
        type    : compress ? 'yui-css' : 'no-compress',
        fileIn  : [stylesheet, __dirname + '/css/treeview.css'],
        fileOut : output + '/css/app.css'
    });
};

JsonParser.prototype.scrubText = function(text) {
    if (!text) {
        return '';
    }

    // Remove the example tag
    text = text.replace(exampleRe, '');

    return marked(text);
};

JsonParser.prototype.createLink = function(href, text) {
    if (!text) {
        text = href;
    }

    if (!href.includes('.html')) {
        href += '.html';
    }

    return "<a href='" + href + "'>" + text + "</a>";
};

JsonParser.prototype.splitCommas = function(splitstring) {
    var me         = this,
        linkstring = '';

    if (splitstring && splitstring.includes(',')) {
        splitstring = splitstring.split(',');

        splitstring.forEach(function(str) {
            linkstring += me.createLink(str) + '<br>';
        });
    } else {
       linkstring = me.createLink(splitstring);
    }

    return linkstring;
};

JsonParser.prototype.parser = function(datas, outputDir) {
    var me = this;

    if (datas && datas.length) {
        var tree = JSON.stringify(me.createTree());

        datas.forEach(function(data) {
            var obj       = JSON.parse(data),
                cls       = obj.global.items[0],
                members   = cls.items,
                name      = cls.name,
                types     = cls.$type;

            // Loop through members so we can markup our member text
            if (members && members.length) {
                members.forEach(function(member) {
                    var containers = member.items;

                    if (containers && containers.length) {
                        containers.forEach(function(container) {
                            if (container.type != null) {
                                var typelinks = container.type;

                                // Check for types and make them links
                                if (typelinks.includes('/')) {
                                    typelinks = typelinks.split('/');

                                    container.type = '';

                                    if (typelinks && typelinks.length) {
                                        typelinks.forEach(function(typelink, idx, arr) {
                                            var safelinks = typelink.replace(safeLinkRe, '');

                                            container.type += me.createLink(safelinks, typelink);

                                            if (idx != typelinks.length-1) {
                                                container.type += '/';
                                            }
                                        });
                                    }
                                } else {
                                    container.type = me.createLink(typelinks);
                                }
                            }
                            container.text = me.scrubText(container.text);
                        });
                    }
                });
            }

            // Prepare the handlebars view object
            var view = {
                    name       : name,
                    altNames   : cls.alternateClassNames                    ? cls.alternateClassNames.split(',').join('<br>') : '',
                    mixins     : cls.mixins                                 ? me.splitCommas(cls.mixins)                      : '',
                    requires   : cls.requires                               ? me.splitCommas(cls.requires)                    : '',
                    classAlias : cls.alias && cls.alias.includes('widget.') ? cls.alias.replace(widgetRe, '')                 : cls.alias,
                    classText  : me.scrubText(cls.text),
                    classType  : types,
                    members    : members,
                    tree       : tree
                },
                newtemplate = handlebars.compile(me.template), // Compile the handlebars template with the view object
                output      = newtemplate(view);

            debug.info('Writing', name + '.html');

            fs.writeFileSync(outputDir + name + '.html', output, 'utf-8');
        });
    }
};

JsonParser.prototype.addClass = function(file, json) {
    var me = this;

    return ClassTree.prototype.addClass.call(me, file, json).replace(linkRe, function(match, link, text) {
        if (!text) {
            text = link;
        }

        if (link.charAt(0) != '#') {
            if (link.includes('#')) {
                link = link.replace('#', '.html#');
            } else {
                link = link + '.html';
            }
        } else {
            link = file.replace('.json', '') + '.html' + link;
        }

        return me.createLink(link, text.replace(hashStartRe, ''));
    });
};

module.exports = JsonParser;
