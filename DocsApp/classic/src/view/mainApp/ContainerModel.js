Ext.define('DocsApp.view.mainApp.ContainerModel', {
    extend: 'Ext.app.ViewModel',
    alias: 'viewmodel.mainapp-container-model',

    data: {
        catFilters: {
            "public": true,
            "protected": false,
            "private": false,
            "inherited": false,
            accessor: false,
            deprecated: false,
            removed: false
        }
    },

    stores: {
        favorites: {
            fields: [],
            groupField: 'type',
            data: [{
                name: 'Ext.panel.Panel',
                id: 'Ext.panel.Panel',
                hash: '!/api/Ext.panel.Panel',
                type: 'API docs'
            }, {
                name: 'Ext.grid.Panel',
                id: 'Ext.grid.Panel',
                hash: '!/api/Ext.grid.Panel',
                type: 'API docs'
            }, {
                name: 'Ext.button.Button',
                id: 'Ext.button.Button',
                hash: '!/api/Ext.button.Button',
                type: 'API docs'
            }, {
                name: 'Memory Management',
                id: 'memory_management',
                hash: '!/guide/memory_management',
                type: 'Guides'
            }]
        },
        favoritedocs: {
            source: '{favorites}',
            filters: [{
                property: 'type',
                value: 'API docs'
            }]
        },
        favoriteguides: {
            source: '{favorites}',
            filters: [{
                property: 'type',
                value: 'Guides'
            }]
        }
    }
});