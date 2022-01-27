const consola = require('consola');
exports.logger = {
    error(text) {
        consola.error(text);
    },
    warn(text) {
        consola.warn(text);
    },
    success(text) {
        consola.success(text);
    },
    info(text) {
        consola.info(text);
    }
};
exports.sleep = time => new Promise(resolve => {
    setTimeout(() => {
        resolve();
    }, time);
});