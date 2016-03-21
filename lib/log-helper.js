/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
"use strict";
// This module provides logging services for node.js applications.
// It is based on the following goals.
// - The user should be able to set the Loglevel in the config file.
// - Only messages that are logged should cause overhead.
// - When logging errors or warnings, it must be ensured that the message is not lost,
//   even if the process exits immediately afterwards. 
// - Messages should be automatically preceeded with a formatted timestamp by default.
// - Messages should be automatically preceeded with a developer supplied prefix as
//   the module or feature name.
// This logger will log to the console because this provides the most flexibility
// without duplicating functionality. If the app is started directly on the console, 
// then the output can be redirected to a file. If the app is started in the background
// as a service using e.g. systemd then the output can be displayed with 
// "systemctl status <service_name.service>".
const util = require("util");
/* tslint:disable:variable-name */
exports.Loglevel = {
    OFF: "OFF",
    FATAL: "FATAL",
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
    ALL: "ALL"
};
/* tslint:enable:variable-name */
exports.loglevelNames = Object.keys(exports.Loglevel);
class Config {
}
// If the timestamp should be included in the log message.
Config.isLogWithTimestamp = true;
// If the filename or source should be included in the log message.
Config.isLogWithPrefix = true;
exports.Config = Config;
// Returns a logging function for the given loglevel.
// The returned function takes a format string and a variable number of arguments.
// The returned function will always log. Thus the user must check if the configured
// loglevel is verboser than the loglevel of the function.
// If config.isLogWithTimestamp is true then the log message is prefixed with a timestamp.
// If config.isLogWithPrefix is true then the log message is prefixed with a the value
// of the logMessagePrefix argument.
function getLogger(loglevel, logMessagePrefix) {
    loglevel = loglevel.toUpperCase();
    checkLoglevel(loglevel);
    logMessagePrefix = logMessagePrefix || "";
    const logFn = isWarnOrVerboser(loglevel) ? console.log : console.error;
    return (format, ...params) => logFn((Config.isLogWithTimestamp ? (new Date()).toISOString() + " " : "")
        + (Config.isLogWithPrefix ? "[" + loglevel + "] '" + logMessagePrefix + "' - " : "")
        + util.format(format, params)
        + (format instanceof Error ? "\n" + format.stack : ""));
}
exports.getLogger = getLogger;
function isFatalOrVerboser(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.Loglevel.FATAL);
}
exports.isFatalOrVerboser = isFatalOrVerboser;
function isErrorOrVerboser(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.Loglevel.ERROR);
}
exports.isErrorOrVerboser = isErrorOrVerboser;
function isWarnOrVerboser(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.Loglevel.WARN);
}
exports.isWarnOrVerboser = isWarnOrVerboser;
function isInfoOrVerboser(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.Loglevel.INFO);
}
exports.isInfoOrVerboser = isInfoOrVerboser;
function isDebugOrVerboser(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.Loglevel.DEBUG);
}
exports.isDebugOrVerboser = isDebugOrVerboser;
function isAll(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.Loglevel.ALL);
}
exports.isAll = isAll;
function isFirstLoglevelGreaterEqualSecond(firstLoglevel, secondLoglevel) {
    firstLoglevel = firstLoglevel.toUpperCase();
    checkLoglevel(firstLoglevel);
    return exports.loglevelNames.indexOf(firstLoglevel) >= exports.loglevelNames.indexOf(secondLoglevel);
}
function checkLoglevel(loglevel) {
    if (exports.loglevelNames.indexOf(loglevel) === -1) {
        throw new Error(util.format("Value '%s' for argument loglevel not supported, must be one of: %j.", loglevel, exports.loglevelNames));
    }
}
//# sourceMappingURL=log-helper.js.map