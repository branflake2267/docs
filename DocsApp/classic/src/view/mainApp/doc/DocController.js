Ext.define('DocsApp.view.mainApp.doc.DocController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.main-doc-controller',

    initViewModel: function (vm) {
        var me = this;

        me.callParent([vm]);

        vm.bind('{configs}', function (store) {
            me.memberStoreBound(store, 'configs');
        });
        vm.bind('{properties}', function (store) {
            me.memberStoreBound(store, 'properties');
        });
        vm.bind('{methods}', function (store) {
            me.memberStoreBound(store, 'methods');
        });
        vm.bind('{events}', function (store) {
            me.memberStoreBound(store, 'events');
        });
    },

    memberStoreBound: function (store, type) {
        this.hideShowMemberInfo(store, type);
        store.on({
            // we'll update the member list / count on the member type button / tab
            // on each filter call
            datachanged: function () {
                // show the member count / members on the type tab / button used for nav
            }
        });
    },

    hideShowMemberInfo: function (store, type) {
        var empty = store.getCount() === 0;

        this.getView().lookupReference(type + 'Header').setVisible(!empty);
    },

    addFavorite: function (btn) {
        var view = this.getView(),
            className = view.getClassName(),
            store = view.up('mainapp-container').lookupReference('favoritesCombined').getStore(),
            rec = store.getById(className);

        if (!rec) {
            store.add({
                name: className,
                id: className,
                hash: '!/api/' + className,
                type: 'API docs'
            });
        }
    }
});
