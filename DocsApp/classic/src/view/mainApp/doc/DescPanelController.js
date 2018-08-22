/**
 * Created by seth on 11/25/15.
 */
Ext.define('DocsApp.view.mainApp.doc.DescPanelController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.descpanel',

    onDescPanelRender: function (panel) {
        var me = this;

        panel.body.on({
            click: function (e) {
                var target = e.getTarget(null, null, true),
                    wrapId = target.up('.da-inline-code-wrap').getId();

                target.radioCls('da-inline-fiddle-nav-active');

                if (target.hasCls('da-inline-fiddle-nav-code')) {
                    me.showCode(wrapId);
                } else {
                    me.showFiddle(wrapId);
                }
            },
            delegate: '.da-inline-fiddle-nav-fiddle,.da-inline-fiddle-nav-code',
            scope: me
        });
    },

    showCode: function (id) {
        var wrap = Ext.fly(id);

        this.getCode(id).show();
        this.getFiddle(id).hide();
        Ext.get(id).down('.da-inline-fiddle-nav-fiddle').addCls('fa-play-circle').removeCls('fa-refresh');
    },

    getCode: function (id) {
        return Ext.get(id).child('.ace_editor');
    },

    showFiddle: function (id) {
        var fiddle = this.getFiddle(id);

        Ext.get(fiddle).show();
        Ext.get(id).down('.da-inline-fiddle-nav-fiddle').removeCls('fa-play-circle').addCls('fa-refresh');
        this.getCode(id).hide();
        this.runFiddle(id);

    },

    getFiddle: function (id) {
        var wrap = Ext.fly(id),
            fiddle = wrap.child('iframe');

        if (!fiddle) {
            fiddle = document.createElement('iframe');
            fiddle.id = fiddle.name = Ext.id(null, 'da-fiddle-example-'); //needs to be unique on whole page
            wrap.appendChild(fiddle);
        }

        return fiddle;
    },

    getEditor: function (id) {
        return ace.edit(this.getCode(id).getId());
    },

    runFiddle: function(id) {
        var editor   = this.getEditor(id),
            fiddle   = this.getFiddle(id),
            wrap     = Ext.get(id),
            codes    = [
                {
                    type : 'js',
                    name : 'app.js',
                    code : editor.getValue()
                }
            ],
            data   = {
                framework : 123, //the framework id from fiddle
                codes     : {
                    codes : codes
                }
            },
            form   = Ext.getDom(this.buildForm(fiddle.id, data));

        wrap.mask('Running fiddle...');
        wrap.child('.da-inline-fiddle-nav').mask();
        Ext.get(fiddle).on('load', Ext.Function.bind(this.onFrameLoad, this, [form, id]), null, { single : !Ext.isOpera });

        form.submit();
    },

    buildForm: function(target, params) {
        // Default fiddle URL points to production
        var fiddleURL = 'https://fiddle.sencha.com/run?dc=' + new Date().getTime();

        // Point docs-devel.sencha.com to the test fiddles. 
        if (window.location.hostname.indexOf('docs-devel') == 0) {
            // Used for the staged fiddle testing
            fiddleURL = 'https://test-fiddle.sencha.com/run?dc=' + new Date().getTime();
        } else if (window.location.origin.indexOf('file://') == 0) {
            // Used for local debugging - Like when debugging docs v2 builds
            fiddleURL = 'https://fiddle-dev.sencha.com/run?dc=' + new Date().getTime();
        }
    
        // Change the framework for ExtReact only - Used for embedded fiddles
        var myMeta = DocsApp.meta;
        var actualProd = myMeta.product;
        if (actualProd === 'extreact') {
            params.framework.framework = 'ExtReact';
        }

        var fieldsSpec = [],
            formSpec   = {
                tag    : 'form',
                role   : 'presentation',
                action : fiddleURL,
                method : 'POST',
                target : target,
                style  : 'display:none',
                cn     : fieldsSpec
            },
            key, value;

        if (params) {
            for (key in params) {
                if (params.hasOwnProperty(key)) {
                    value = params[key];

                    if (Ext.isArray(value) || Ext.isObject(value)) {
                        value = Ext.encode(value);
                    }

                    fieldsSpec.push(this.getFieldConfig(key, value));
                }
            }
        }

        // Create the form
        return Ext.DomHelper.append(Ext.getBody(), formSpec);
    },

    getFieldConfig: function(name, value) {
        return {
            tag   : 'input',
            type  : 'hidden',
            name  : name,
            value : Ext.String.htmlEncode(value)
        };
    },

    onFrameLoad: function(form, id) {
        var wrap = Ext.get(id);

        Ext.removeNode(form);
        wrap.unmask();
        wrap.child('.da-inline-fiddle-nav').unmask();
    },

    onEditorResize: function () {
        this.getView().updateLayout();
    }
});