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
        head         = document.getElementsByClassName('classText'),
        classmembers = document.getElementsByClassName('classmembers'),
        member       = document.getElementsByClassName('members')[0],
        i            = 0,
        length       = classmembers.length;

    if (value.trim()) {
        head[0].style.display  = 'none';
        member.style.borderTop = 'none';
    } else {
        head[0].style.display  = 'block';
        member.style.borderTop = '3px solid #DCDCDC';
    }

    for (; i < length; i++) {
        classmembers[i].style.display = matcher.test(classmembers[i].getAttribute('data-member-name')) ? 'block' : 'none';
    }
};

if (ExtL.treeData) {
    new TreeView(ExtL.treeData, 'tree');
}

window.onscroll = function(e) {
    var vertical_position = 0,
        centerContent     = document.getElementById('centerContent');

    if (pageYOffset) {
        vertical_position = pageYOffset;
    } else if (document.documentElement.clientHeight) { //ie
        vertical_position = document.documentElement.scrollTop;
    } else if (document.body) { //ie quirks
        vertical_position = document.body.scrollTop;
    }

    if (vertical_position > 65) {
        ExtL.addClass(centerContent, 'sticky');
    } else {
        ExtL.removeClass(centerContent, 'sticky');
    }
};
