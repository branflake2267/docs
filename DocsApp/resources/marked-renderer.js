(function() {
    /**
     * @cfg {Object} options Options for the renderer, same as marked.Renderer. Changes:
     *  - Added addHeaderId config. Can be Boolean or Function that returns Boolean.
     */
    var idRe      = /[^\w]+/g,
        configs   = [
            'addHeaderId'
        ],
        overrides = {
            heading : function(text, level, raw) {
                var addHeaderId = this.addHeaderId,
                    id;

                if (addHeaderId !== false) {
                    if (typeof addHeaderId === 'function') {
                        addHeaderId = addHeaderId.call(this, text, level, raw);
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

    var Renderer = function(options) {
        var renderer = new marked.Renderer(options),
            name;

        renderer.idRe = idRe;

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

    if (typeof module !== 'undefined' && typeof exports === 'object') {
        module.exports = Renderer;
    } else if (typeof define === 'function' && define.amd) {
        define(function() { return Renderer; });
    } else {
        this.markedRenderer = Renderer;
    }
}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}())
