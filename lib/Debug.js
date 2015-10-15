//colors: http://telepathy.freedesktop.org/doc/telepathy-glib/telepathy-glib-debug-ansi.html

;(function() {
    var scope  = this,
        colors = {
            reset : '\x1b[0m',
            bg    : {
                blue    : '\x1b[44m',
                cyan    : '\x1b[46m',
                green   : '\x1b[42m',
                magenta : '\x1b[45m',
                red     : '\x1b[41m',
                white   : '\x1b[47m',
                yellow  : '\x1b[43m'
            },
            fg    : {
                black   : '\x1b[30m',
                blue    : '\x1b[34m',
                cyan    : '\x1b[36m',
                green   : '\x1b[32m',
                magenta : '\x1b[35m',
                red     : '\x1b[31m',
                white   : '\x1b[37m',
                yellow  : '\x1b[33m'
            }
        },
        Debug  = {
            errorEnabled : false,
            infoEnabled  : false,
            logEnabled   : false,

            _setEnabled : function(level, value) {
                var me = this;

                if (level) {
                    switch (level) {
                        case 'error' :
                            me.errorEnabled = value;
                            break;
                        case 'info' :
                            me.infoEnabled = value;
                            break;
                        case 'log' :
                            me.logEnabled = value;
                            break;
                    }
                } else {
                    me.errorEnabled = me.infoEnabled = me.logEnabled = value;
                }
            },

            enable : function(level) {
                this._setEnabled(level, true);
            },
            disable : function(level) {
                this._setEnabled(level, false);
            },
            error : function() {
                if (this.errorEnabled && scope.console) {
                    var args = Array.prototype.slice.call(arguments, 0);

                    args.unshift(colors.bg.red + colors.fg.white);
                    args.push(colors.reset);

                    console.info.apply(console, args);
                }
            },
            info : function() {
                if (this.infoEnabled && scope.console) {
                    var args = Array.prototype.slice.call(arguments, 0);

                    args.unshift(colors.bg.blue + colors.fg.white);
                    args.push(colors.reset);

                    console.info.apply(console, args);
                }
            },
            log : function() {
                if (this.logEnabled && scope.console) {
                    console.log.apply(console, arguments);
                }
            }
        };

    if (typeof module !== 'undefined' && typeof exports === 'object') {
        module.exports = Debug;
    } else if (typeof define === 'function' && define.amd) {
        define(function() {
            return Debug;
        });
    } else {
        scope.DoxxiDiffDebugger = Debug;
    }
}).call(function() {
    return this || (typeof window !== 'undefined' ? window : global);
}());
