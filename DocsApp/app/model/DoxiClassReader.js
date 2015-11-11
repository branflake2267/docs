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

        var classList = [],
            files = data.files;

        for (var i = 0; i < files.length; i++) {
            var path = files[i];
            var str = '';
            if (path.indexOf('sass/') > -1) {
                str += path.substring(path.lastIndexOf('/') + 1);
            } else {
                if (path.indexOf('ext/') > -1) {
                    str += 'Ext';
                }

                str += path.substring(path.indexOf('src/') + 3).replace(/\//g, '.').replace('.js', '');
            }

            classList.push(str);
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
                    container.items[j].text = marked(container.items[j].text || '');
                    var idx = container.items[j].src.name.substring(0, 1);
                    container.items[j].isInherited = !(idx === '0');
                    container.items[j].srcClass = classList[idx];
                    delete container.items[j].src;
                }
            }
        }
        //console.log(output);
        return output;
    }
})
