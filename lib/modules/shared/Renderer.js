var marked = require('marked');

/**
 * @cfg {Object} options Options for the renderer, same as marked.Renderer. Changes:
 *  - Added addHeaderId config. Can be Boolean or Function that returns Boolean.
 */

var configs   = [
        'addHeaderId'
    ],
    overrides = {
        heading : function(text, level, raw) {
            var addHeaderId = this.addHeaderId,
                id;

            if (addHeaderId !== false) {
                if (typeof addHeaderId === 'function') {
                    addHeaderId = addHeaderId(text, level, raw);
                }

                if (addHeaderId !== false) {
                    if (addHeaderId == undefined) {
                        id = this.options.headerPrefix + raw.toLowerCase().replace(this.idRe, '-');
                    } else {
                        id = addHeaderId;
                    }
                }
            }


          return '<h' + level + (id ? ' id="' + id + '"' : '') + '>' +
            text +
            '</h' + level + '>\n';
        }
    };

module.exports = function(options) {
    var renderer = new marked.Renderer(options),
        name;

    renderer.idRe = /[^\w]+/g;

    for (name in overrides) {
        renderer[name] = overrides[name];
    }

    if (options) {
        var i      = 0,
            length = configs.length,
            name;

        for (; i < length; i++) {
            name = configs[i];

            renderer[name] = options[name];
        }
    }

    return renderer;
};
