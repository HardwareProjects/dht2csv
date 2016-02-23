"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};
var fs = require("fs");
var winston = require("winston");
var fsp = require("./fs-promises");
function createLogger(config) {
    return __awaiter(this, void 0, Promise, function* () {
        const fd = yield fsp.open(config.logfilePath, "w");
        yield fsp.fchown(fd, config.uidAfterInit, config.gidAfterInit);
        let logfileStream = fs.createWriteStream(null, { fd: fd });
        return new (winston.Logger)({
            transports: [
                new winston.transports.File({ level: config.loglevel, stream: logfileStream, json: false, handleExceptions: true, prettyPrint: true })
            ]
        });
    });
}
exports.createLogger = createLogger;
function logErrorAndExit(logger, err) {
    const msg = typeof err === "object" && "stack" in err ? err.stack : err;
    if (logger != null) {
        logger.error(`Sorry but an error occured.\n${msg}`, null, () => {
            const logfileStream = logger.transports.file._stream;
            logfileStream.end(null, null, () => {
                process.exit(1);
            });
        });
    }
    else {
        console.error(`Sorry but an error occured.\n${msg}`);
        process.exit(1);
    }
}
exports.logErrorAndExit = logErrorAndExit;
//# sourceMappingURL=log-helper.js.map