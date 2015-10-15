var indentInc   = 2,
    memberOrder = [
        'configs',
        'properties',
        'methods',
        'static-methods',
        'events'
    ];

function Output(diff) {
    this.diff = diff;
}

Output.prototype.prettyJson = function() {
    console.log(JSON.stringify(this.diff, null, 4));
};

Output.prototype.markdown = function() {
    var output = [];

    this
        .output('added',    output)
        .output('modified', output)
        .output('removed',  output);

    if (output.length) {
        output.unshift('### ' + this.diff.name);

        return output.join('\n');
    }
};

Output.prototype._capitalize = function(text) {
    return text.substr(0, 1).toUpperCase() + text.substr(1);
};

Output.prototype.output = function(type, output) {
    var me        = this,
        diff      = me.diff,
        obj       = diff[type],
        indention = 1;

    if (obj) {
        me.addBullet(me._capitalize(type), output, indention);

        memberOrder.forEach(function(order) {
            var members = obj[order];

            if (members) {
                indention += indentInc;

                me.addBullet(me._capitalize(order), output, indention);

                members.forEach(function(member) {
                    indention += indentInc;

                    if (typeof member === 'object') {
                        me.addObject(member, output, indention);
                    } else {
                        me.addBullet(member, output, indention);
                    }

                    indention -= indentInc;
                });

                indention -= indentInc;
            }
        });
    }

    return me;
};

Output.prototype.addBullet = function(text, output, indention) {
    output.push(new Array(indention + 1).join(' ') + '- ' + text);
};

Output.prototype.addObject = function(obj, output, indention) {
    var me       = this,
        encoders = me.encoders,
        encoder;

    me.addBullet(obj.name, output, indention);

    if (obj.newValue || obj.oldValue) {
        encoder = encoders[obj.key];

        indention += indentInc;

        me.addBullet(obj.key, output, indention);

        indention += indentInc;

        me.addBullet(
            'is ' + (encoder ? encoder(obj.newValue) : obj.newValue),
            output,
            indention
        );

        me.addBullet(
            'was ' + (encoder ? encoder(obj.oldValue) : obj.oldValue),
            output,
            indention
        );
    }
};

Output.prototype.encoders = {
    access : function(value) {
        return value ? value : 'public';
    }
};

module.exports = Output;
