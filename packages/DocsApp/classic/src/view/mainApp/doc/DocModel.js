Ext.define('DocsApp.view.mainApp.doc.DocModel', {
    extend: 'Ext.app.ViewModel',
    alias : 'viewmodel.mainapp-docmodel',

    requires: ['DocsApp.model.ClassMember'],

    data: {
        memberCfg         : true,
        memberProperty    : true,
        memberMethod      : true,
        memberEvent       : true,
        memberCss_var     : true,
        memberCss_mixin   : true,
        memberFilter      : '',
        memberFilterDocked: true
    },

    stores: {
        // the allMembers store is set in the controller when the classFile binding is executed
        /*allMembers: {
            //data  : '{classFile.classMembers}'
        },*/

        configs   : {
            type   : 'chained',
            //model  : 'ClassMember',
            //model  : 'DocsApp.model.ClassMember',
            source : '{allMembers}',
            filters: [{
                property: '$type',
                value   : 'config'
            }]
        },
        events    : {
            type   : 'chained',
            source : '{allMembers}',
            filters: [{
                property: '$type',
                value   : 'event'
            }]
        },
        methods   : {
            type   : 'chained',
            source : '{allMembers}',
            filters: [{
                property: '$type',
                value   : 'method'
            }]
        },
        properties: {
            type   : 'chained',
            source : '{allMembers}',
            filters: [{
                property: '$type',
                value   : 'property'
            }]
        }
    }
});
