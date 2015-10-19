var util   = require('util'),
    marked = require('marked');

/**
 * @cfg {Object} options Options for the renderer, same as marked.Renderer. Changes:
 *  - Added addHeaderId config. Can be Boolean or Function that returns Boolean.
 */

function Renderer(options) {
    marked.Renderer.call(this, options);

    if (options) {
        this.addHeaderId = options.addHeaderId;
    }
}

util.inherits(Renderer, marked.Renderer);

Renderer.prototype.heading = function(text, level, raw) {
    var addHeaderId = this.addHeaderId,
        id;

    if (addHeaderId !== false) {
        if (typeof addHeaderId === 'function') {
            addHeaderId = addHeaderId(text, level, raw);
        }

        if (addHeaderId !== false) {
            id = this.options.headerPrefix + raw.toLowerCase().replace(/[^\w]+/g, '-');
        }
    }


  return '<h' + level + (id ? ' id="' + id + '"' : '') + '>' +
    text +
    '</h' + level + '>\n';
};

module.exports = Renderer;
