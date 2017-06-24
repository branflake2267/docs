const assertly = require('assertly'),
      expect   = assertly.expect,
      root     = __dirname.split('libk')[0] + 'libk',
      SrcAPI   = require("../../../modules/source-api/"),
      product  = "extjs", version  = "6.5.0", toolkit  = "modern";

describe("Source API", function() {
    const module  = new SrcAPI({
        _myRoot: root,
        product: product,
        version: version,
        toolkit: toolkit
    });

    it("should exist", function() {
        expect(module).to.not.be.empty;
    });
});
