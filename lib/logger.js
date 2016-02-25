/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const util = require("util");
const fsp = require("./fs-promises");
let logfilePath = null;
let loglevel = null;
let logfileFd = -1;
let isInitialized = false;
exports.loglevels = { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 };
function init(logfilePath, loglevel) {
    return __awaiter(this, void 0, void 0, function* () {
        logfilePath = logfilePath;
        loglevel = loglevel;
        // Do not log method name, because logfile is not open yet.
        if (logfilePath === "stdout") {
            logfileFd = 1;
        }
        else {
            logfileFd = yield fsp.open(logfilePath, "w");
        }
        isInitialized = true;
    });
}
exports.init = init;
// returns true if the logging level is info or higher.
function isInfo() {
    if (!isInitialized) {
        throw new Error("Must call init first.");
    }
    return exports.loglevels[loglevel] >= exports.loglevels["info"];
}
exports.isInfo = isInfo;
function info(format, params) {
    return __awaiter(this, void 0, Promise, function* () {
        log("info", format, params);
    });
}
exports.info = info;
function warn(format, params) {
    return __awaiter(this, void 0, Promise, function* () {
        log("warn", format, params);
    });
}
exports.warn = warn;
function log(level, format, params) {
    return __awaiter(this, void 0, Promise, function* () {
        // Always log when the config is not yet initialized because it might be important.
        const shouldLog = !isInitialized ? true : exports.loglevels[loglevel] >= exports.loglevels[level];
        if (shouldLog) {
            const message = (new Date()).toISOString() + " - " + level + ": " + util.format(format, params) + "\n";
            if (logfileFd !== -1) {
                yield fsp.write(logfileFd, message);
            }
            else {
                console.log(message);
            }
        }
    });
}
exports.log = log;
//# sourceMappingURL=logger.js.map