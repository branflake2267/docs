'use strict';

const debug = require('../../Debug');
const Utils = require('../shared/Utils');

class Base {
    constructor (targets, options) {
        let defaultOptions = this.defaultOptions;

        if (defaultOptions) {
            let name, type, value;

            for (name in defaultOptions) {
                type  = null;
                value = defaultOptions[name];

                if (typeof value === 'object' && (value.type || value.value)) {
                    type  = value.type;
                    value = value.value;
                }

                if (options[name] === undefined) {
                    //default option is not present in the options passed

                    if (type && Utils[type]) {
                        //parse the default option
                        value = Utils[type](value);
                    }

                    options[name] = value;
                } else if (type && Utils[type]) {
                    //parse the option that was passed
                    options[name] = Utils[type](options[name]);
                }
            }
        }

        this.options = options;
        this.targets = targets;
    }

    /**
     * Method to register this module's command line arguments.
     *
     * @static
     * @cfg {argv} argv The argv node module.
     */
    static register (argv) {}

    /**
     * Checks to see if the required command line arguments are present.
     *
     * @return {Boolean}
     */
    checkArgs () {
        return true;
    }

    /**
     * Runs the module.
     */
    run () {
        debug.error('`run` method needs to be implemented');
    }
}

module.exports = Base;
