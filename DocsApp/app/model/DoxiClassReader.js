Ext.define('DocsApp.model.DoxiClassReader', {
    extend: 'Ext.data.reader.Json',
    alias: 'reader.doxi',

    rootProperty: 'items',

    _names: {
        configs: {
            countProperty: 'numConfigs',
            type: 'config'
        },
        events: {
            countProperty: 'numEvents',
            type: 'event'
        },
        methods: {
            countProperty: 'numMethods',
            type: 'method'
        },
        properties: {
            countProperty: 'numProperties',
            type: 'property'
        }
    },

    getData: function(data) {

        var cls = data.global.items[0],
            members = cls.items;

        var output = {
            items:[cls]
        }

        delete cls.items;
        delete cls.src;

        cls.classMembers = [];

        for(var i=0; i < members.length; i++) {
            var container = members[i];

            var names = this._names[container.$type];

            if(names) {
                cls[names.countProperty] = container.items.length;

                for(var j=0; j < container.items.length; j++) {
                    cls.classMembers.push(container.items[j]);
                    container.items[j].$type = names.type;
                    delete container.items[j].src;
                }
            }
        }
        //console.log(output);
        return output;
    }
})
