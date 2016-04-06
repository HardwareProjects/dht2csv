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
// - If an Error object is logged, then its stack should be logged.
// This logger will log to the console because this provides the most flexibility
// without duplicating functionality. If the app is started directly on the console, 
// then the output can be redirected to a file. If the app is started in the background
// as a service using e.g. systemd then the output can be displayed with 
// "systemctl status <service_name.service>".
// extensible design
// featuress: tags so messages can be marked with eg their source (eg. module/layer/processing_step (eg. validation)), 
// and their audience (eg. developer/support/user/domain-expert), 
// json output for rich output, extensibility and easy parsing, performance 
// because facilitates isInfo && ..., extensibility because can replace logFunction,
// -- simple to say that all messages are logged to logfile and errors are additionally logged to stdout.
const util = require("util");
const fs = require("fs");
const stream = require("stream");
const os_1 = require("os");
/* tslint:disable:variable-name */
exports.LogLevel = {
    OFF: "OFF",
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
};
/* tslint:enable:variable-name */
const logLevelNames = Object.keys(exports.LogLevel);
const defaultOptions = {
    level: exports.LogLevel.DEBUG,
    tags: [],
    destinations: [process.stdout, process.stderr],
    logFunction: allDest0WarnDest1.name,
};
let logFunctions = new Map();
logFunctions.set(allDest0WarnDest1.name, allDest0WarnDest1);
// log function. The returned promise is resolved when the message is written.
// Always write WARN or ERROR messages to destinations[1] if it exists and it is not equal to destinations[0].
// Always write to destinations[0] except
// - if the message was already written to the console by destinations[1] and destinations[0]
//   is also a console (so that WARN and ERROR messages are only printed once to the console).
function allDest0WarnDest1(message, destinations) {
    const writeToDest1 = !isInfoOrVerboser(message.level) && destinations[1] !== undefined && destinations[0] !== destinations[1];
    const isBothTty = isTty(destinations[0]) && isTty(destinations[1]);
    const writeToDest0 = !(writeToDest1 && isBothTty);
    const streamA = writeToDest1 ? destinations[1] : destinations[0];
    const streamB = writeToDest1 && writeToDest0 ? destinations[0] : null;
    return new Promise((resolve, reject) => {
        const messageStr = JSON.stringify(message) + os_1.EOL;
        streamA.write(messageStr, () => {
            // Write WARN and ERROR messages also to second destination.
            if (streamB) {
                streamB.write(messageStr, () => resolve());
            }
            else {
                resolve();
            }
        });
    });
}
function isTty(writableStream) {
    return writableStream &&
        writableStream.isTTY;
}
class Logger {
    constructor({ levelFilter = defaultOptions.level, tags = defaultOptions.tags, destinations = defaultOptions.destinations, logFunction = defaultOptions.logFunction, } /*= defaultOptions*/) {
        checkLoglevel(levelFilter);
        this.level = levelFilter;
        this.tags = tags;
        this.setDestinations(destinations);
        this.setLogFunction(logFunction);
    }
    setLogFunction(logFunction) {
        if (typeof logFunction === "string") {
            if (logFunctions.has(logFunction)) {
                this.logFunction = logFunctions.get(logFunction);
            }
            else {
                throw new Error(`The logFunction with name '${logFunction}' is not known.`);
            }
        }
        else if (typeof logFunction === "function") {
            this.logFunction = logFunction;
        }
        else {
            throw new TypeError(`The argument 'logFunction' has unexpected type '${typeof logFunction}'.`);
        }
    }
    setDestinations(destinations) {
        this.destinations = [];
        for (const dest of destinations) {
            if (typeof dest === "string") {
                if (dest === "stdout") {
                    this.destinations.push(process.stdout);
                }
                else if (dest === "stderr") {
                    this.destinations.push(process.stderr);
                }
                else {
                    const s = fs.createWriteStream(dest, { flags: "a" });
                    this.destinations.push(s);
                }
            }
            else if (dest instanceof stream.Writable) {
                this.destinations.push(dest);
            }
            else {
                throw new TypeError(`One of the elements of argument 'destinations' has unexpected type '${typeof dest}'.`);
            }
        }
    }
    // Returns a copy of the options that were used in the constructor.
    getOptions() {
        return {
            level: this.level,
            tags: this.tags.slice(),
            destinations: this.destinations,
            logFunction: this.logFunction,
        };
    }
    error(arg1, arg2, arg3) {
        return this.doLog(exports.LogLevel.ERROR, arg1, arg2, arg3);
    }
    warn(arg1, arg2, arg3) {
        return this.doLog(exports.LogLevel.WARN, arg1, arg2, arg3);
    }
    info(arg1, arg2, arg3) {
        return this.doLog(exports.LogLevel.INFO, arg1, arg2, arg3);
    }
    log(arg1, arg2, arg3, arg4) {
        if (typeof arg1 === "string" && logLevelNames.indexOf(arg1) !== -1) {
            return this.doLog(arg1, arg2, arg3, arg4);
        }
        else {
            return this.doLog(exports.LogLevel.INFO, arg1, arg2, arg3);
        }
    }
    doLog(level, arg1, arg2, arg3) {
        if (isFirstLoglevelGreaterEqualSecond(this.level, level)) {
            const hasTagsArg = arg1 instanceof Array ? true : false;
            const tags = hasTagsArg ? arg1 : [];
            const format = hasTagsArg ? arg2 : arg1;
            const params = hasTagsArg ? arg3 : arg2;
            let message = {};
            message.isoDate = new Date().toISOString();
            message.level = level;
            message.tags = this.tags.concat(tags);
            message.text = (!params || params === [] ? util.format(format) : util.format(format, params));
            if (format instanceof Error) {
                message.stack = format.stack;
            }
            return this.logFunction(message, this.destinations);
        }
        else {
            return Promise.resolve();
        }
    }
}
exports.Logger = Logger;
function isErrorOrVerboser(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.LogLevel.ERROR);
}
exports.isErrorOrVerboser = isErrorOrVerboser;
function isWarnOrVerboser(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.LogLevel.WARN);
}
exports.isWarnOrVerboser = isWarnOrVerboser;
function isInfoOrVerboser(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.LogLevel.INFO);
}
exports.isInfoOrVerboser = isInfoOrVerboser;
function isDebugOrVerboser(loglevel) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, exports.LogLevel.DEBUG);
}
exports.isDebugOrVerboser = isDebugOrVerboser;
function isFirstLoglevelGreaterEqualSecond(firstLoglevel, secondLoglevel) {
    firstLoglevel = firstLoglevel.toUpperCase();
    checkLoglevel(firstLoglevel);
    return logLevelNames.indexOf(firstLoglevel) >= logLevelNames.indexOf(secondLoglevel);
}
function checkLoglevel(loglevel) {
    if (logLevelNames.indexOf(loglevel) === -1) {
        throw new Error(util.format("Value '%s' for argument loglevel not supported, must be one of: %j.", loglevel, logLevelNames));
    }
}
//# sourceMappingURL=log-helper.js.map