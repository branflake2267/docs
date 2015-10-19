var util = require('util'),
    Base = require('../base');

function Tree(targets, options) {
    Base.call(this, targets, options);
}

util.inherits(Tree, Base);

module.exports = Tree;
