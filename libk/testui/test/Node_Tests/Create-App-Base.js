const assertly = require('assertly'),
      expect   = assertly.expect,
      root     = __dirname.split('libk')[0] + 'libk',
      Create   = require("../../../modules/create-app-base/"),
      product  = "extjs", version  = "6.5.0", toolkit  = "modern";

describe("Create App Base", function() {
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
