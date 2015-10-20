var fs     = require('fs'),
    util   = require('util'),
    junk   = require('junk'),
    mkdirp = require('mkdirp'),
    Base   = require('../base'),
    debug  = require('../../Debug'),
    Tree   = require('../shared/Tree');

function ClassTree(targets, options) {
    Base.call(this, targets, options);

    this.classes  = [];
    this.classMap = {};
}

util.inherits(ClassTree, Base);

ClassTree.prototype.defaultOptions = {
    compress    : false,
    destination : {
        type  : 'path',
        value : __dirname + '/../../output/'
    },
    input       : {
        type  : 'path',
        value : __dirname + '/../../json/'
    }
};

ClassTree.register = function(argv) {
    argv.mod({
        mod         : 'class-tree',
        description : 'Parse class tree into JSON',
        options     : [
            {
                name        : 'input',
                short       : 'i',
                type        : 'string',
                description : 'The location where the JSON files are contained. Defaults to "./json".',
                example     : '`index json-parser --input=./json` or `index json-parser -i ./json`'
            },
            {
                name        : 'destination',
                short       : 'd',
                type        : 'string',
                description : 'The destination location of the generated JSON. Defaults to "./output".',
                example     : '`index json-parser --destination=./output` or `index json-parser -d ./output`'
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

ClassTree.prototype.run = function() {
    var options = this.options,
        input   = options.input,
        output  = options.destination;

    if (this.beforeExecute) {
        this.beforeExecute(input, output);
    }

    this.execute(input, output);
};

ClassTree.prototype.execute = function(inputDir, outputDir) {
    var me = this;

    //Read all of our DOXI JSON output files into data object
    fs.readdir(inputDir, function(error, files) {
        var tempData = [];

        if (error) {
            throw(error);
        }

        if (!files) {
            throw ('You seem to be missing your json folder...exiting parser');
        }

        if (files) {
            files.forEach(function(file) {
                if (junk.not(file) && !file.includes('-all-classes')) {
                    debug.info('Reading ', file);

                    var json = fs.readFileSync(inputDir + file, 'utf-8');

                    tempData.push(me.addClass(file, json));
                }
            });
        }

        debug.info('Finished reading files into memory...');

        me.parser(tempData, outputDir);
    });
};

ClassTree.prototype.addClass = function(file, json) {
    var name = file.replace('.json', '');

    this.classes.push(name);

    this.classMap[name] = JSON.parse(json);

    return json;
};

ClassTree.prototype.createTree = function() {
    var me      = this,
        classes = me.classes,
        map     = me.classMap;

    debug.info('Creating Class Tree');

    return new Tree({
        nodeParser : function(node, className) {
            var item   = map[node.className],
                access;

            if (item) {
                access = access = item.global.items[0].access;

                if (access) {
                    node.access = access;
                }
            }

            node.expanded = node.className === 'Ext';

            return node;
        }
    }).fromArray(classes);
};

ClassTree.prototype.parser = function(datas, outputDir) {
    var tree = JSON.stringify(this.createTree(), null, this.options.compress ? 0 : 4);

    debug.info('Writing', 'class_tree.json');

    mkdirp.sync(outputDir);

    fs.writeFileSync(outputDir + 'class_tree.json', tree, 'utf-8');
};

module.exports = ClassTree;
