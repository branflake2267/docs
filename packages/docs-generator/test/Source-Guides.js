const assertly = require('assertly'),
      expect   = assertly.expect,
      file     = require('phylo'),
      root     = String(file.cwd().up('../')),
      SrcGuide = require("../modules/source-guides/"),
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
