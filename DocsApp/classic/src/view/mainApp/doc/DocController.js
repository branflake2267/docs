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
    },

    onMemberClick: function (view, rec, el, i, e) {
        var expander = e.getTarget('.da-expander-toggle');

        if (expander) {
            Ext.fly(el).toggleCls('da-member-expanded');
            Ext.fly(expander).toggleCls('fa-compress');
        }
    },

    toggleMemberCollapse: function (button, pressed) {
        var items = this.getView().getEl().select('.da-member-item');

        items[pressed ? 'addCls' : 'removeCls']('da-member-expanded');

        button.setText(pressed ? 'Collapse All' : 'Expand All');
        button.setIconCls(pressed ? 'x-fa fa-compress' : 'x-fa fa-expand');
    },

    onMemberViewRefresh: function (dataview) {
        var store = dataview.getStore(),
            count, vm, ref;

        if (store.type === 'chained') {
            count = store.getCount();
            vm = this.getViewModel();
            ref = dataview.reference;

            if (!dataview.hasLoaded) {
                dataview.hasLoaded = true;
                vm.set(ref, count === 0);
            }
            vm.set(ref + 'Count', count);
        }
    },

    onFilterChange: function (field, val) {

    },

    onMemberNavBtnClick: function (btn) {
        var targetEl = this.lookupReference(btn.target).getEl(),
            scroller = this.getView().getScrollable();

        scroller.scrollTo(0, -1);
        targetEl.scrollIntoView(scroller.getElement(), false, true, true);
    }
});
