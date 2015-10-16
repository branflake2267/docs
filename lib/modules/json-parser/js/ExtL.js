(function() {
    ExtL = ExtL || {};

    ExtL.hasClass = function(ele, cls) {
        return ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
    };
    ExtL.addClass = function(ele, cls) {
        if (!this.hasClass(ele, cls)) {
            ele.className += ' ' + cls;
        }
    };
    ExtL.removeClass = function(ele, cls) {
        if (ExtL.hasClass(ele, cls)) {
            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');

            ele.className = ele.className.replace(reg, ' ');
        }
    };
    ExtL.onExpandToggleClick = function(dom) {
        var isExpanded = /collapse/i.test(dom.innerHTML);

        dom.innerHTML = isExpanded ? 'expand' : 'collapse';

        ExtL[isExpanded ? 'addClass' : 'removeClass'](document.body, 'related-collapsed');
    };
})();
