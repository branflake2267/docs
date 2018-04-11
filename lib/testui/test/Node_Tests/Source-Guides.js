const assertly = require('assertly'),
      expect   = assertly.expect,
      root     = __dirname.split('libk')[0] + 'libk',
      SrcGuide = require("../../../modules/source-guides/"),
      product  = "extjs", version  = "6.5.0", toolkit  = "modern";

describe("Source Guides", function() {
    const module  = new SrcGuide({
        _myRoot: root,
        product: product,
        version: version,
        toolkit: toolkit
    });

    it("should exist", function() {
        expect(module).to.not.be.empty;
    });
});
