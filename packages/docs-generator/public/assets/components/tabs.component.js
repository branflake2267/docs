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

  disconnectedCallback() {
  }

  _renderAttributes() {
    let tabSize = this.getAttribute('tabsize');
    if (!tabSize) {
      tabSize = '100px';
    }

    let tabs = this.querySelectorAll('tab');
    for (let i=0; i < tabs.length; i++) {
      this._renderTab(i, tabs[i], tabSize);
    }
  }

  _renderTab(index, tab, tabSize) {
    let tabBarDiv = this._getTab(index, tab.title, tabSize);
    let tabBodyDiv = this._getTabBody(index, tab.innerHTML);

    let tabsBar = this.shadowRoot.querySelector('.tabsBar');
    tabsBar.appendChild(tabBarDiv);

    let tabsBody = this.shadowRoot.querySelector('.tabsBody');
    tabsBody.appendChild(tabBodyDiv);
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
  }

  _getTabBody(index, content) {
    let tabSelected = '';
    if (index == 0) {
      tabSelected = 'tabBodySelected';
    } else {
      tabSelected = 'tabBodyHidden';
    }

    let div = document.createElement("div");  
    div.setAttribute("tabid", `${index}`);
    div.className = 'tabBody ' + tabSelected;
    div.innerHTML = content;
    console.log('test', content);
    return div;
  }

}
window.customElements.define('sencha-component-tabs', ComponentTabs);