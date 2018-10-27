/**
 * Created by seth on 11/19/15.
 */
Ext.define('DocsApp.view.mainApp.doc.MemberFilterPicker', {
    extend: 'Ext.form.field.Picker',
    xtype: 'mainapp-member-filter-picker',

    emptyText: 'filter members...',
    triggers: {
        picker: {
            cls: 'x-form-clear-trigger',
            handler: function () {
                this.reset();
            }
        }
    },

    onFocusEnter: function (e) {
        this.callParent([e]);

        this.expand();
    },

    createPicker: function () {
        return Ext.create({
            xtype: 'toolbar',
            vertical: true,
            floating: true,
            padding: 12,
            defaultType: 'checkboxfield',
            items: [{
                fieldLabel: 'Public',
                bind      : '{catFilters.pub}',
                margin: '0 0 0 5',
                listeners : {
                    change: 'onAccessFilterChange'
                }
            }, {
                fieldLabel: 'Protected',
                bind      : '{catFilters.prot}',
                margin: '0 0 0 5',
                listeners : {
                    change: 'onAccessFilterChange'
                }
            }, {
                fieldLabel: 'Private',
                bind      : '{catFilters.pri}',
                margin: '0 0 0 5',
                listeners : {
                    change: 'onAccessFilterChange'
                }
            }, {
                xtype: 'tbseparator'
            }, {
                fieldLabel: 'Inherited',
                bind      : '{catFilters.inherited}',
                margin: '0 0 0 5',
                listeners : {
                    change: 'onAccessFilterChange'
                }
            }, {
                fieldLabel: 'Accessor',
                bind      : '{catFilters.accessor}',
                margin: '0 0 0 5',
                listeners : {
                    change: 'onAccessFilterChange'
                }
            }, {
                fieldLabel: 'Deprecated',
                bind      : '{catFilters.deprecated}',
                margin: '0 0 0 5',
                listeners : {
                    change: 'onAccessFilterChange'
                }
            }, {
                fieldLabel: 'Removed',
                bind      : '{catFilters.removed}',
                margin    : '0 0 0 5',
                listeners : {
                    change: 'onAccessFilterChange'
                }
            }, {
                xtype: 'tbseparator',
                margin: '5 0 10 0'
            }, {
                xtype: 'button',
                ui: 'default',
                text : 'Dock Filter Menu',
                iconCls: 'x-fa fa-arrow-circle-o-right',
                handler: 'toggleFilterMenuDocked'
            }]
        });
    },

    onHide: function (animateTarget, callback, scope) {
        this.callParent([animateTarget, callback, scope]);
        this.collapse();
    }
});