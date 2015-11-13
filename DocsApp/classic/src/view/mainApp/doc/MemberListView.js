/**
 * Created by seth on 11/2/15.
 */
Ext.define('DocsApp.view.mainApp.doc.MemberListView', {
    extend: 'Ext.view.View',
    xtype: 'memberlistview',

    scrollable: true,
    itemSelector: 'div.da-member-list-item',
    //itemWidth: 0,
    //itemHeight: 0,
    cls: 'da-member-list-ct',
    //scrollWidth: Ext.getScrollbarSize().width,
    tpl: new Ext.XTemplate(''),
    trackOver: true,
    overItemCls: 'da-member-list-item-hover',
    tplInner:
        '<div class="da-member-list-item">{name}' +

            '<tpl if="readonly"><span class="da-readonly">ro</span></tpl>' +
            '<tpl if="deprecatedVersion">' +
                '<span class="da-deprecated">dep</span>' +
            '</tpl>' +
            '<tpl if="removedVersion">' +
                '<span class="da-removed">rem</span>' +
            '</tpl>' +
            '<tpl if="access">' +
                '<tpl if="access == \'private\'">' +
                    '<span class="da-private">pri</span>' +
                '<tpl elseif="access == \'protected\'">' +
                    '<span class="da-protected">pro</span>' +
                '</tpl>' +
            '</tpl>' +
            '<tpl if="template">' +
                '<span class="da-template">tmp</span>' +
            '</tpl>' +
            '<tpl if="static">' +
                '<span class="da-static">sta</span>' +
            '</tpl>' +
            '<tpl if="preventable">' +
                '<span class="da-preventable">prev</span>' +
            '</tpl>' +

        '</div>'
    ,

    onBindStore: function (store, oldStore) {
        this.callParent([store, oldStore]);

        if (store.type === 'chained') {
            this.layoutMemberItems();
        }
    },

    onResize: function (width, height) {
        this.layoutMemberItems();
    },

    layoutMemberItems: function () {
        var me = this,
            el = me.getEl(),
            store = me.getStore(),
            tempTpl = new Ext.XTemplate(me.tplInner),
            tmp = Ext.getBody().appendChild({}),
            tm = Ext.util.TextMetrics,
            i = 0,
            width = el.getWidth(true) - Ext.getScrollbarSize().width,
            height = el.getHeight(true),
            itemWidth = 0,
            itemHeight = 0,
            recs = store.getRange(),
            len = recs.length,
            cols, colWidth, rows, max, total, overflow;

        for (; i < len; i++) {
            var size = tm.measure(tmp, tempTpl.apply(recs[i].getData())),
                w = size.width,
                h = size.height;

            itemWidth = w > itemWidth ? w : itemWidth;
            itemHeight = h > itemHeight ? h : itemHeight;
        }

        Ext.destroy(tmp);

        cols = Math.floor(width / itemWidth) || 1;
        colWidth = Math.floor(width / cols);
        rows = Math.floor(height / itemHeight);
        max = rows * cols;
        total = store.getCount();
        overflow = total > max;

        me.tpl = new Ext.XTemplate(
            '{% values.col = 0; %}',
            '<div class="da-member-list-column" style="width: ' + colWidth + 'px">',
                '<tpl for=".">',
                    me.tplInner,
                    '{[this.wrapCol(xindex, parent)]}',
                '</tpl>',
            '</div>',
            {
                wrapCol: function (i, parent) {

                    var out = '';
                    if (overflow) {
                        if (i % Math.ceil(total / cols) === 0) {
                            parent.col++;
                            return '</div><div class="da-member-list-column" style="width: ' + colWidth + 'px;left: ' + colWidth * parent.col + 'px;">';
                        }
                    } else {
                        if (i % rows === 0) {
                            parent.col++;
                            return '</div><div class="da-member-list-column" style="width: ' + colWidth + 'px;left: ' + colWidth * parent.col + 'px;">';
                        }
                    }

                    return '';
                }
            }
        );

        me.refresh();
    },

    listeners: {
        itemclick: 'onMemberListItemClick'
    }
});