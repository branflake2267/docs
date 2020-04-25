class FiddleComponent extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.id = this.getAttribute('id');
    this.style = this.getAttribute('style');
  }

  show() {
    if (this.rendered) {
      return;
    }
    this.rendered = true;

    let height = '300px';
    let width = '600px';
    
    if (!this.style.height && this.style.height.length > 0) {
      height = this.style.height;  
    }

    if (!this.style.width && this.style.width.length > 0) {
      width = this.style.width;
    }

    let style = `width:${width};height:${height};`;

    //console.log('style=' + style);

    var iframe = document.createElement("iframe");
    iframe.src = `https://fiddle.sencha.com/fiddle/${this.id}`;
    iframe.style = style;
    iframe.frameBorder = 0;

    this.shadowRoot.appendChild(iframe);

  }

}
window.customElements.define('sencha-fiddle', FiddleComponent);
