<html>
<head>
    <title>{{{name}}}</title>
    <meta charset="UTF-8">
        <link rel="stylesheet" type="text/css" href="../styles.css">

            <script type="text/javascript">
                var ExtL = ExtL || {};

                ExtL.hasClass = function (ele,cls) {
                return ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
            }
                ExtL.addClass = function (ele,cls) {
                if (!this.hasClass(ele,cls)) ele.className += " "+cls;
            }
                ExtL.removeClass = function (ele,cls) {
                if (ExtL.hasClass(ele,cls)) {
                var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
                ele.className=ele.className.replace(reg,' ');
            }
            }

                ExtL.onExpandToggleClick = function (dom) {
                /*var parent  = dom.parentElement,
                 content = parent.lastElementChild,
                 height  = content.scrollHeight,
                 heightStyle = content.style.height;
                 //toggle
                 content.style.height = !heightStyle || heightStyle === '0px' ? height + 'px' : '0px';*/
                var parent = dom.parentElement,
                metaBody = parent.nextElementSibling,
                isExpanded = dom.innerHTML === 'collapse';

                dom.innerHTML = isExpanded ? 'expand' : 'collapse';
                ExtL[isExpanded ? 'addClass' : 'removeClass'](metaBody, 'collapsed');

            };
            </script>
        </head>
        <body>

        <h1 class='{{classType}}'>{{{name}}}
            {{#classAlias}}
            <span class='alias'>alias: {{{.}}}</span>
            {{/classAlias}}
        </h1>

        <div class="classHead">
            <div class="classMetaHeader">
                Related Classes <a class="button" href="javascript:void(0);" onClick="ExtL.onExpandToggleClick(this);">collapse</a>
            </div>
            <div class="classMeta">
                {{#if altNames}}
                <h3>Alternate Names</h3>
                <p class="list">{{{altNames}}}</p>
                {{/if}}
                {{#if mixins}}
                <h3>Mixins</h3>
                <p class="list">{{{mixins}}}</p>
                {{/if}}
                {{#if requires}}
                <h3>Requires</h3>
                <p class="list">{{{requires}}}</p>
                {{/if}}
            </div>
            <div class="classText">{{{classText}}}</div>
        </div>
        <div class='members'>
            {{#members}}

            <h2 class="type">{{{$type}}}</h2>

            {{#items}}

            <a name="{{{name}}}"></a>
            <h2>{{{name}}}
                {{#type}}
                <span class='memberType'>{{{.}}}</span>
                {{/type}}

                {{#access}}
                <span class='{{{.}}}'>{{{.}}}</span>
                {{/access}}
            </h2>

            {{#text}}
            <p>{{{.}}}</p>
            {{/text}}

            {{#value}}
            <p>Defaults to: {{{.}}}</p>
            {{/value}}

            {{#deprecatedMessage}}
            <p>Deprecated: {{{.}}}</p>
            {{/deprecatedMessage}}

            {{/items}}

            {{/members}}
        </div>
        </body>
    </html>