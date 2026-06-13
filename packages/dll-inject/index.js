if (process.platform !== "win32") {
  module.exports = { getPIDByName: () => -1, injectPID: () => -1 };
} else {
  module.exports = require("bindings")({
    bindings: "injector.node",
    module_root: __dirname,
  });
}
