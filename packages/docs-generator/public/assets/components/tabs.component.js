

const htmlTemplate = "<!-- Font & Icons --> <!-- <link href='https://fonts.googleapis.com/css?family=Material+Icons|Roboto&display=swap' rel='stylesheet'> --> <style> .tabs { } .tab { font-family: 'Roboto', sans-serif; padding: 10px; width: 100px; text-align: center; cursor: pointer; white-space: nowrap; } .tabSelected { border-bottom: 2px solid green; } .tabsBar { display: flex; } .tabsBody { /* border: 1px solid orange; */ padding-top: 10px; } .tabBodySelected { display: block; } .tabBodyHidden { display: none; } </style> <div class='tabs'> <div class='tabsBar'></div> <div class='tabsBody'></div> </div>";

/**
 <text>
 <sencha-tabs-simple tabsize='100px'>
  <tab title='tab1'></tab>
  <tab title='tab2'></tab>
  <tab title='tab3'></tab>
 </sencha-tabs-simple> 
 </text>
*/
class ComponentTabs extends HTMLElement {

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = htmlTemplate;
    
    let me = this;
    setTimeout(function () {
      me._render();
    }, 0);
  }

  _render() {
    this.tabs = this.querySelectorAll('tab');

    var tabSize = this.getAttribute('tabsize');
    if (!tabSize) {
      tabSize = '100px';
    }
    
    for (var i = 0; i < this.tabs.length; i++) {
      this._renderTabBarAndTabContent(i, tabSize);
    }
  }

  _renderTabBarAndTabContent(index, tabSize) {
    this._renderTabBar(index, tabSize);
    this._renderTabBody(index);
  }

  _renderTabBar(index, tabSize) {
    var tab = this.tabs[index];
    var tabBarDiv = this._getTab(index, tab.title, tabSize);
    var tabsBar = this.shadowRoot.querySelector('.tabsBar');
    tabsBar.appendChild(tabBarDiv);
  }

  _renderTabBody(index) {
    var tabBodyDivEl = this._getTabBody(index);
    
    var tabsBodyEl = this.shadowRoot.querySelector('.tabsBody');
    tabsBodyEl.appendChild(tabBodyDivEl);
  }

  _getTab(index, title, tabSize) {
    var tabSelected = '';
    if (index == 0) {
      tabSelected = 'tabSelected';
    }

    var style = "width: " + tabSize + ";";
    var div = document.createElement("div");
    div.setAttribute("tabid", index + "");
    div.className = 'tab ' + tabSelected;
    div.innerHTML = title;
    div.style = style;

    div.addEventListener('click', (event) => {
      this._toggvarab(this, index, event);
    });

    return div;
  }

  _toggvarab(me, index, event) {
    var tabsBar = me.shadowRoot.querySelectorAll('.tabsBar div');
    var tabsBody = me.shadowRoot.querySelectorAll('.tabsBody div');

    for (var i = 0; i < tabsBody.length; i++) {
      var tabBar = tabsBar[i];
      var tabBody = tabsBody[i];
      if (i == index) {
        tabBar.classList.add('tabSelected');
        tabBody.classList.add('tabBodySelected');
        tabBody.classList.remove('tabBodyHidden');

        let tab = tabBody.querySelector('tab');
        this._displayFiddles(tab);
      } else {
        tabBar.classList.remove('tabSelected');
        tabBody.classList.add('tabBodyHidden');
        tabBody.classList.remove('tabBodySelected');
      }
    }
  }

  _getTabBody(index) {
    var tabSelected = '';
    if (index == 0) {
      tabSelected = 'tabBodySelected';
    } else {
      tabSelected = 'tabBodyHidden';
    }

    var divEl = document.createElement("div");
    divEl.setAttribute("tabid", index + "");
    divEl.className = 'tabBody ' + tabSelected;

    var tab = this.tabs[index];
    tab = this.removeChild(tab);
    divEl.appendChild(tab);

    if (index == 0) { 
      this._displayFiddles(tab);
    }

    return divEl;
  }

  _displayFiddles(tab) {
    let fiddles = tab.querySelectorAll('sencha-fiddle');
    if (!fiddles) {
      return;
    }
    for (let i=0; i < fiddles.length; i++) {
      let fiddle = fiddles[i];
      fiddle.show();
    }
  }

}
window.customElements.define('sencha-tabs-simple', ComponentTabs);