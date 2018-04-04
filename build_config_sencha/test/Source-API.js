const assertly = require('assertly'),
      expect   = assertly.expect,
      file     = require('phylo'),
      root     = String(file.cwd().up('../')),
      SrcAPI   = require("../modules/source-api/"),
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
