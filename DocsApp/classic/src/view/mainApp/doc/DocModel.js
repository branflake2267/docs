Ext.define('DocsApp.view.mainApp.doc.DocModel', {
    extend: 'Ext.app.ViewModel',
    alias: 'viewmodel.mainapp-docmodel',

    links: {
        panel: {
            type: 'Class',
            id: 'Ext.panel.Panel'
        }
    },

    stores: {
        configs: {
            type: 'chained',
            source: '{panel.classMembers}',
            filters: [{
                property: '$type',
                value: 'config'
            }]
        },
        events: {
            type: 'chained',
            source: '{panel.classMembers}',
            filters: [{
                property: '$type',
                value: 'event'
            }]
        },
        methods: {
            type: 'chained',
            source: '{panel.classMembers}',
            filters: [{
                property: '$type',
                value: 'method'
            }]
        },
        properties: {
            type: 'chained',
            source: '{panel.classMembers}',
            filters: [{
                property: '$type',
                value: 'property'
            }]
        }
    }
});
