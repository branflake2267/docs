var util = require('util'),
    Base = require('../base');

function Sample(targets, options) {
    Base.call(this, targets, options);
}

util.inherits(Sample, Base);

module.exports = Sample;
