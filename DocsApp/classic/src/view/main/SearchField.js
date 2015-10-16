Ext.define('DocsApp.view.main.SearchField', {
    extend: 'Ext.form.field.Picker',
    xtype: 'main-searchfield',

    emptyText: 'search...',
    matchFieldWidth: false,
    pickerAlign: 'tr-br?',
    triggers: {
        picker: {
            cls: 'x-form-clear-trigger',
            handler: function () {
                this.reset();
            }
        }
    },

    createPicker: function () {
        return Ext.create({
            xtype: 'container',
            floating: true,
            title: 'Search Picker',
            height: 300,
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            defaults: {
                xtype: 'panel',
                width: 200,
                titleAlign: 'center',
                frame: true
            },
            items: [{
                title: 'Examples'
            }, {
                title: 'Guides'
            }, {
                title: 'Docs'
            }]
        });
    },

    onChange: function (newVal, oldVal) {
        this.callParent([newVal, oldVal]);

        if (newVal.length) {
            this.expand();
        } else {
            this.collapse();
        }
    }
});
