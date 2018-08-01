'use strict';

class Debug {
    get errorEnabled () {
        return this._errorEnabled;
    }
    set errorEnabled (enabled) {
        this._errorEnabled = enabled;
    }

    get infoEnabled () {
        return this._infoEnabled;
    }
    set infoEnabled (enabled) {
        this._infoEnabled = enabled;
    }

    get logEnabled () {
        return this._logEnabled;
    }
    set logEnabled (enabled) {
        this._logEnabled = enabled;
    }

    get colors () {
        //colors: http://telepathy.freedesktop.org/doc/telepathy-glib/telepathy-glib-debug-ansi.html
        return {
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
        };
    }

    _setEnabled (level, value) {
        let me = this;

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
    }

    enable (level) {
        this._setEnabled(level, true);
    }

    disable (level) {
        this._setEnabled(level, false);
    }

    error () {
        if (this.errorEnabled) {
            let args   = Array.prototype.slice.call(arguments, 0),
                colors = this.colors;

            args.unshift(colors.bg.red + colors.fg.white);
            args.push(colors.reset);

            console.info.apply(console, args);
        }
    }

    info () {
        if (this.infoEnabled) {
            let args   = Array.prototype.slice.call(arguments, 0),
                colors = this.colors;

            args.unshift(colors.bg.blue + colors.fg.white);
            args.push(colors.reset);

            console.info.apply(console, args);
        }
    }

    log () {
        if (this.logEnabled) {
            console.log.apply(console, arguments);
        }
    }
}

module.exports = new Debug();
