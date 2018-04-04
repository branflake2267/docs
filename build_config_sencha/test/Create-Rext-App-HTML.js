const assertly = require('assertly'),
      expect   = assertly.expect,
      file     = require('phylo'),
      root     = String(file.cwd().up('../')),
      Create   = require("../modules/create-rext-app-html/"),
      product  = "extjs", version  = "6.5.0", toolkit  = "modern";

describe("Create Rext App HTML", function() {
    const module  = new Create({
        _myRoot: root,
        product: product,
        version: version,
        toolkit: toolkit
    });

    it("should exist", function() {
        expect(module).to.not.be.empty;
    });
});
