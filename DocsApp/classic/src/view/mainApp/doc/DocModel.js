Ext.define('DocsApp.view.mainApp.doc.DocModel', {
    extend: 'Ext.app.ViewModel',
    alias: 'viewmodel.mainapp-docmodel',

    links: {
        classFile: {
            type: 'Class',
            id: 'Ext.panel.Panel'
        }
    },

    stores: {
        allMembers: {
            fields: [],
            data: '{classFile.classMembers}'
        },
        configs: {
            type: 'chained',
            model: 'ClassMember',
            source: '{allMembers}',
            //source: '{classFile.classMembers}',
            filters: [{
                property: '$type',
                value: 'config'
            }]
        },
        events: {
            type: 'chained',
            source: '{allMembers}',
            //source: '{classFile.classMembers}',
            filters: [{
                property: '$type',
                value: 'event'
            }]
        },
        methods: {
            type: 'chained',
            source: '{allMembers}',
            //source: '{classFile.classMembers}',
            filters: [{
                property: '$type',
                value: 'method'
            }]
        },
        properties: {
            type: 'chained',
            source: '{allMembers}',
            //source: '{classFile.classMembers}',
            filters: [{
                property: '$type',
                value: 'property'
            }]
        }
    }
});
