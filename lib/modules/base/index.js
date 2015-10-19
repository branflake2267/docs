function Base(targets, options) {
    this.options = options;
    this.targets = targets;
}

Base.register = function(argv) {};

Base.prototype.checkArgs = function() {
    return true;
};

Base.prototype.run = function() {};

module.exports = Base;
