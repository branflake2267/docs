function Base(targets, options) {
    this.options = options;
    this.targets = targets;
}

/**
 * Method to register this module's command line arguments.
 *
 * @static
 * @cfg {argv} argv The argv node module.
 */
Base.register = function(argv) {};

/**
 * Checks to see if the required command line arguments are present.
 *
 * @return {Boolean}
 */
Base.prototype.checkArgs = function() {
    return true;
};

/**
 * Runs the module.
 */
Base.prototype.run = function() {};

module.exports = Base;
