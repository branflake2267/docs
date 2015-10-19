Ext.define('DocsApp.view.mainApp.doc.MemberDataview', {
    extend: 'Ext.view.View',
    xtype: 'main-member-dataview',

    itemTpl: new Ext.XTemplate(
        '<h3 class="{$type}">{name} : {type}' ,

        '<tpl if="readonly"><span class="readonly">READONLY</span></tpl>',
            '<tpl if="access">',
                "<tpl if='access == \"private\"'>" ,
                    '<span class="private">PRIVATE</span>' ,
                "<tpl elseif='access == \"protected\"'>",
                    '<span class="protected">PROTECTED</span>' ,
            '</tpl>',
        '</tpl></h3>',

        '<div class="full_text"><tpl if="text"><p>{text}</p></tpl>',
        '<tpl if="value"><p>Defaults to: {type}</p></tpl></div>'
    )
});
