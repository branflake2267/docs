Ext.define('DocsApp.view.mainApp.doc.DocModel', {
    extend: 'Ext.app.ViewModel',
    alias : 'viewmodel.mainapp-docmodel',

    data: {
        memberCfg      : true,
        memberProperty : true,
        memberMethod   : true,
        memberEvent    : true,
        memberCss_var  : true,
        memberCss_mixin: true
    },

    stores: {
        allMembers: {
            fields: [],
            data  : '{classFile.classMembers}'
        },
        configs   : {
            type   : 'chained',
            model  : 'ClassMember',
            source : '{allMembers}',
            //source: '{classFile.classMembers}',
            filters: [{
                property: '$type',
                value   : 'config'
            }]
        },
        events    : {
            type   : 'chained',
            source : '{allMembers}',
            //source: '{classFile.classMembers}',
            filters: [{
                property: '$type',
                value   : 'event'
            }]
        },
        methods   : {
            type   : 'chained',
            source : '{allMembers}',
            //source: '{classFile.classMembers}',
            filters: [{
                property: '$type',
                value   : 'method'
            }]
        },
        properties: {
            type   : 'chained',
            source : '{allMembers}',
            //source: '{classFile.classMembers}',
            filters: [{
                property: '$type',
                value   : 'property'
            }]
        }
    }
});
