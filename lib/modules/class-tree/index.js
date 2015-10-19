var util = require('util'),
    Base = require('../base');

function Tree(targets, options) {
    Base.call(this, targets, options);
}

util.inherits(Tree, Base);

Tree.register = function(argv) {
    argv.mod({
        mod         : 'class-tree',
        description : 'Parse class tree into JSON',
        options     : []
    });
};

Tree.prototype.run = function() {
    console.log('hello');
};

module.exports = Tree;
