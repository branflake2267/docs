const htmlTemplate = `
<!-- Font & Icons -->
<!-- <link href="https://fonts.googleapis.com/css?family=Material+Icons|Roboto&display=swap" rel="stylesheet"> -->

<style>
  .tabs {
  }

  .tab {
    font-family: 'Roboto', sans-serif;
    padding: 10px;
    width: 100px;
    text-align: center;
    cursor: pointer;
    white-space: nowrap;
  }

  .tabSelected {
    border-bottom: 2px solid green;
  }

  .tabsBar {
    display: flex;
  }

  .tabsBody {
    /* border: 1px solid orange; */
    padding-top: 10px; 
  }

  .tabBodySelected {
    display: block;
  }

  .tabBodyHidden {
    display: none;
  }
  
</style>

<div class='tabs'>
  <div class='tabsBar'></div>
  <div class='tabsBody'></div>
</div>
`;

/**
 <text>
 <sencha-component-tabs tabsize='100px'>
  <tab title='tab1'></tab>
  <tab title='tab2'></tab>
  <tab title='tab3'></tab>
 </sencha-component-tabs> 
 </text>
*/
class ComponentTabs extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    let me = this;
    let shadowRoot = me.attachShadow({ mode: 'open' });

      shadowRoot.innerHTML = htmlTemplate;

      setTimeout(function() {
        me._renderAttributes();
      }, 0);
  }

  _renderAttributes() {
    let tabSize = this.getAttribute('tabsize');
    if (!tabSize) {
      tabSize = '100px';
    }

    this.tabs = this.querySelectorAll('tab');
    for (let i = 0; i < this.tabs.length; i++) {
      let renderBodyContent = i == 0;
      console.log("render i=" + i);
      this._renderTabBarAndTabContent(i, tabSize, renderBodyContent);
    }
  }

  _renderTabBarAndTabContent(index, tabSize, renderBodyContent) {
    let tab = this.tabs[index];
    let tabBarDiv = this._getTab(index, tab.title, tabSize);
    let tabsBar = this.shadowRoot.querySelector('.tabsBar');
    tabsBar.appendChild(tabBarDiv);
    this._renderTabBody(index, renderBodyContent);
  }

  _renderTabBody(index, renderBodyContent) {
    let tabBodyDiv = this._getTabBody(index);
    let tabsBody = this.shadowRoot.querySelector('.tabsBody');
    tabsBody.appendChild(tabBodyDiv);

    if (renderBodyContent) {
      this._renderTabBodyContent(index);
    }
  }

  _renderTabBodyContent(index) {
    let tab = this.tabs[index];
    if (tab.rendered) {
      return;
    }
    tab.rendered = true;

    let tabBodyEl = this.shadowRoot.querySelector(`.tabsBody div[tabid='${index}']`);
    tabBodyEl.innerHTML = tab.innerHTML;
  }

  _getTab(index, title, tabSize) {
    let tabSelected = '';
    if (index == 0) {
      tabSelected = 'tabSelected';
    }

    let style = `width: ${tabSize}`;
    let div = document.createElement("div");
    div.setAttribute("tabid", `${index}`);
    div.className = 'tab ' + tabSelected;  
    div.innerHTML = title;
    div.style = style;

    div.addEventListener('click', (event) => {
      this._toggleTab(this, index, event);
    });

    return div;
  }

  _toggleTab(me, index, event) {
    let tabsBar = me.shadowRoot.querySelectorAll('.tabsBar div');
    let tabsBody = me.shadowRoot.querySelectorAll('.tabsBody div');
    
    for (let i=0; i < tabsBody.length; i++) {
      let tabBar = tabsBar[i];
      let tabBody = tabsBody[i];
      if (i == index) {
        tabBar.classList.add('tabSelected');
        tabBody.classList.add('tabBodySelected');
        tabBody.classList.remove('tabBodyHidden');
      } else {
        tabBar.classList.remove('tabSelected');
        tabBody.classList.add('tabBodyHidden');
        tabBody.classList.remove('tabBodySelected');
      }
    }

    this._renderTabBodyContent(index);
  }

  _getTabBody(index) {
    let tabSelected = '';
    if (index == 0) {
      tabSelected = 'tabBodySelected';
    } else {
      tabSelected = 'tabBodyHidden';
    }

    let div = document.createElement("div");  
    div.setAttribute("tabid", `${index}`);
    div.className = 'tabBody ' + tabSelected;

    return div;
  }

}
window.customElements.define('sencha-component-tabs', ComponentTabs);