Ext.define('DocsApp.model.Class', {
    extend: 'DocsApp.model.Base',

    requires: [
        'DocsApp.model.DoxiClassReader'
    ],

    hasMany: {
        model: 'ClassMember',
        name: 'classMembers'
    },

    proxy: {
        type: 'rest',
        format: 'json',
        url : '/docs/DocsApp/resources/data/docs/',
        reader: {
            type: 'doxi'
        }
    }
});
