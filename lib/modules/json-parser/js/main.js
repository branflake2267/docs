var ExtL = ExtL || {};

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
    var parent     = dom.parentElement,
        metaBody   = parent.nextElementSibling,
        isExpanded = dom.innerHTML === 'collapse';

    dom.innerHTML = isExpanded ? 'expand' : 'collapse';

    ExtL[isExpanded ? 'addClass' : 'removeClass'](metaBody, 'collapsed');
};

if (!document.getElementsByClassName('classMeta')[0].innerHTML.trim()) {
    document.getElementsByClassName('classMeta')[0].style.display = 'none';
    document.getElementsByClassName('classMetaHeader')[0].style.display = 'none';
}

document.getElementById('box').onkeyup = function() {
    var value        = this.value,
        matcher      = new RegExp(value, 'gi'),
        classmembers = document.getElementsByClassName('classmembers'),
        i            = 0,
        length       = classmembers.length;

    if (value.trim()) {
        ExtL.addClass(document.body, 'filtered');
    } else {
        ExtL.removeClass(document.body, 'filtered');
    }

    for (; i < length; i++) {
        classmembers[i].style.display = matcher.test(classmembers[i].getAttribute('data-member-name')) ? 'block' : 'none';
    }
};

if (ExtL.treeData) {
    new TreeView(ExtL.treeData, 'tree');
}

window.onscroll = function(e) {
    var vertical_position = 0;

    if (pageYOffset) {
        vertical_position = pageYOffset;
    } else if (document.documentElement.clientHeight) { //ie
        vertical_position = document.documentElement.scrollTop;
    } else if (document.body) { //ie quirks
        vertical_position = document.body.scrollTop;
    }

    if (vertical_position > 65) {
        ExtL.addClass(document.body, 'sticky');
    } else {
        ExtL.removeClass(document.body, 'sticky');
    }
};
