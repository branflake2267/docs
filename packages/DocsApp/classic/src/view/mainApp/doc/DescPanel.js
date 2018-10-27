/**
 * Created by seth on 11/24/15.
 */
Ext.define('DocsApp.view.mainApp.doc.DescPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'descpanel',

    requires: ['DocsApp.view.mainApp.doc.DescPanelController'],

    controller: 'descpanel',

    bodyPadding: '0 20 20 20',
    bind       : {
        data: '{classFile}'
    },
    resizers: [],
    editors: [],
    editorResizeIds: [],
    editorMap: {},
    applyData: function (data) {
        var me = this;

        me.callParent([data]);

        Ext.each(this.editors, function (editorId) {
            var editor = ace.edit(editorId);
            editor.setTheme("ace/theme/chrome");
            editor.getSession().setMode("ace/mode/javascript");
            editor.setShowPrintMargin(false);

            if (me.editorMap[editorId] === editorId) {
                editor.setReadOnly(true);
            }

            me.resizers.push(new Ext.resizer.Resizer({
                target: Ext.get(me.editorMap[editorId]),
                listeners: {
                    resize: function () {
                        editor.resize();
                        me.fireEvent('editorResize');
                    }
                }
            }));
        });
    },
    onDestroy: function () {
        Ext.destroy(this.resizers);
    },
    //tpl        : '{[marked(values.text, { addHeaderId: false })]}',
    initComponent: function () {
        var me = this;

        //me.editors = [];
        //me.editorResizeIds = [];
        //me.editorMap = {};

        me.tpl = new Ext.XTemplate(
            '<div class="da-class-meta-ct">',
                '<tpl if="alternateClassNames">',
                    '<div class="ad-class-meta-header ad-class-meta-header-top">Alternate Class Names</div>',
                    '<div class="da-class-meta-list-body">',
                        '{[this.splitItems(values, "alternateClassNames")]}',
                    '</div>',
                '</tpl>',
                '<tpl if="mixins">',
                    '<div class="ad-class-meta-header">Mixins</div>',
                    '<div class="da-class-meta-list-body">',
                        '{[this.splitItems(values, "mixins")]}',
                    '</div>',
                '</tpl>',
                '<tpl if="requires">',
                    '<div class="ad-class-meta-header">Requires</div>',
                    '<div class="da-class-meta-list-body">',
                        '{[this.splitItems(values, "requires")]}',
                    '</div>',
                '</tpl>',
            '</div>',
            //'{[marked(values.text, { addHeaderId: false })]}',
            '{[this.processDesc(values.text)]}',
            {
                processDesc: function (text) {
                    me.editors = [];
                    me.editorResizeIds = [];
                    me.editorMap = {};

                    var out = marked(text, { addHeaderId: false }),
                        codeWrap = '<div class="da-inline-code-wrap" id="{0}">{1}</div>',
                        fiddleWrap = '<div class="da-inline-code-wrap da-inline-code-wrap-fiddle" id="{2}">' +
                            '<div class="da-inline-fiddle-nav">' +
                                '<span class="da-inline-fiddle-nav-code da-inline-fiddle-nav-active x-fa fa-code">Code</span>' +
                                '<span class="da-inline-fiddle-nav-fiddle x-fa fa-play-circle">Fiddle</span>' +
                            '</div>' +
                            '<div id="{0}">{1}</div>' +
                            '</div>';

                    out = out.replace(/(<pre><code>(?:@example)?)((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, function (match, p1, p2) {
                        var ret = p2.trim(),
                            id = Ext.id(null, 'da-ace-editor-'),
                            wrapId;

                        me.editors.push(id);
                        if (p1.indexOf('@example') > -1) {
                            wrapId = Ext.id(null, 'da-fiddle-wrap-');
                            ret = Ext.String.format(fiddleWrap, id, ret, wrapId);
                            me.editorResizeIds.push(wrapId);
                            me.editorMap[id] = wrapId;
                        } else {
                            ret = Ext.String.format(codeWrap, id, ret);
                            me.editorResizeIds.push(id);
                            me.editorMap[id] = id;
                        }

                        //return '<div id=' + id + '>' + p1.trim() + '</div>';
                        return ret;
                    });

                    //out = out.replace(new RegExp('(<pre><code>@example)(\s*.*)*(<\/code><\/pre>)', 'mig'), 'zzzz');
                    //out = out.replace(/^<pre><code>@example((\s*.*)*)<\/code><\/pre>$/mig, 'zzzz');

                    return out;
                },
                splitItems: function (values, node) {
                    var arr = values[node].split(','),
                        len = arr.length,
                        i = 0;

                    for (;i < len; i++) {
                        arr[i] = this.makeLinks(arr[i]);
                    }

                    return arr.join('<br>');
                },
                makeLinks: function (link) {
                    link      = link.replace(/\|/g, '/');
                    var links = link.split('/'),
                        len   = links.length,
                        out   = [],
                        i     = 0,
                        root, rec;

                    //this.classStore = this.classStore || me.up('mainapp-container').down('mainapp-nav-docs-container').lookupReference('packageDocTree').getStore();
                    this.classStore = this.classStore || Ext.ComponentQuery.query('mainapp-container')[0].down('mainapp-nav-docs-container').lookupReference('packageDocTree').getStore();
                    root            = this.classStore.getRoot();

                    for (; i < len; i++) {
                        rec = root.findChild('className', links[i].replace(/\[\]/g, ''), true);
                        if (rec) {
                            out.push(('<a href="#!/api/' + links[i] + '">' + links[i] + '</a>').replace('[]', ''));
                        } else {
                            out.push(links[i]);
                        }
                    }

                    return out.join('/');
                }
            }
        );

        me.callParent();
    },
    listeners: {
        afterrender: 'onDescPanelRender',
        editorResize: 'onEditorResize'
    }
    /*dockedItems: [{
     xtype: 'toolbar',
     scrollable: true,
     dock: 'right',
     //width: 400,
     cls: 'da-class-meta-ct',
     resizable: {
     handles: 'w'
     },
     //bind : '{classFile}',
     //tpl  :
     items: [{
     xtype: 'component',
     bind : '{classFile}',
     tpl: new Ext.XTemplate(
     '<tpl if="alternateClassNames">',
     '<div class="ad-class-meta-header ad-class-meta-header-top">Alternate Class Names</div><div class="da-class-meta-list-body">{[this.splitItems(values, "alternateClassNames")]}</div>',
     '</tpl>',
     '<tpl if="mixins">',
     '<div class="ad-class-meta-header">Mixins</div><div class="da-class-meta-list-body">{[this.splitItems(values, "mixins")]}</div>',
     '</tpl>',
     '<tpl if="requires">',
     '<div class="ad-class-meta-header">Requires</div><div class="da-class-meta-list-body">{[this.splitItems(values, "requires")]}</div>',
     '</tpl>',
     {
     splitItems: function (values, node) {
     var arr = values[node].split(','),
     len = arr.length,
     i = 0;

     for (;i < len; i++) {
     arr[i] = this.makeLinks(arr[i]);
     }

     return arr.join('<br>');
     },
     makeLinks: function (link) {
     link      = link.replace(/\|/g, '/');
     var links = link.split('/'),
     len   = links.length,
     out   = [],
     i     = 0,
     root, rec;

     //this.classStore = this.classStore || me.up('mainapp-container').down('mainapp-nav-docs-container').lookupReference('packageDocTree').getStore();
     this.classStore = this.classStore || Ext.ComponentQuery.query('mainapp-container')[0].down('mainapp-nav-docs-container').lookupReference('packageDocTree').getStore();
     root            = this.classStore.getRoot();

     for (; i < len; i++) {
     rec = root.findChild('className', links[i].replace(/\[\]/g, ''), true);
     if (rec) {
     out.push(('<a href="#!/api/' + links[i] + '">' + links[i] + '</a>').replace('[]', ''));
     } else {
     out.push(links[i]);
     }
     }

     return out.join('/');
     }
     }
     )
     }]
     }]*/
});