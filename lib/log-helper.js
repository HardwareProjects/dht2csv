/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
"use strict";
// This module provides logging services for node.js applications.
// It is based on the following goals.
// - The user should be able to set the Loglevel in the config file.
// - Only messages that are logged should cause overhead.
// - When logging errors or warnings, it must be ensured that the message is not lost,
//   even if the process exits immediately afterwards. 
// - Messages should contain an ISO-Date string by default.
// - Messages should be searchable by keyword or tag.
//   Tag examples: The module name, a feature name or the message audience (eg. developer/support/user/domain-expert).
// - The message should be easily parsable (json).
// - If an Error object is logged, then its stack should be logged.
// - Logging to the console and/or to a file should be simple.
// - Logging to a file and errors additionally to stdout should be simple.
// - The logger should be extensible so that eg. logging to a database is possible.
// - Supports same method names and arguments as the console.log, console.info, console.warn and console.error methods. 
const util = require("util");
const assert = require("assert");
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
    destinations: [process.stdout, process.stderr],
    logFunction: allDest0WarnDest1.name,
};
exports.logFunctions = new Map();
exports.logFunctions.set(allDest0WarnDest1.name, allDest0WarnDest1);
// log function. The returned promise is resolved when the message is written.
// Always write WARN or ERROR messages to destinations[1] if it exists and it is not equal to destinations[0].
// Always write to destinations[0] except
// - if the message was already written to the console by destinations[1] and destinations[0]
//   is also a console (so that WARN and ERROR messages are only printed once to the console).
function allDest0WarnDest1(message, destinations) {
    return new Promise((resolve, reject) => {
        const writeToDest1 = !isInfoOrVerboser(message.level) && destinations[1] !== undefined && destinations[0] !== destinations[1];
        const isBothTty = isTty(destinations[0]) && isTty(destinations[1]);
        const writeToDest0 = !(writeToDest1 && isBothTty);
        const streamA = writeToDest1 ? destinations[1] : destinations[0];
        const streamB = writeToDest1 && writeToDest0 ? destinations[0] : null;
        const messageStr = JSON.stringify(message) + os_1.EOL;
        streamA.write(messageStr, () => {
            if (streamB) {
                streamB.write(messageStr, () => resolve());
            }
            else {
                resolve();
            }
        });
    });
}
exports.allDest0WarnDest1 = allDest0WarnDest1;
function isTty(writableStream) {
    return writableStream &&
        // writableStream.isTTY is undefined for some streams.
        (writableStream.isTTY || false);
}
class Logger {
    constructor({ level = defaultOptions.level, destinations = defaultOptions.destinations, logFunction = defaultOptions.logFunction, }, tags) {
        checkLoglevel(level);
        this.level = level;
        this.tags = tags || [];
        this.setDestinations(destinations);
        this.setLogFunction(logFunction);
    }
    setLogFunction(logFunction) {
        if (typeof logFunction === "string") {
            if (exports.logFunctions.has(logFunction)) {
                this.logFunction = exports.logFunctions.get(logFunction);
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
            else if (dest instanceof stream.Writable || dest instanceof stream.Transform) {
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
            destinations: this.destinations,
            logFunction: this.logFunction,
            tags: this.tags.slice(),
        };
    }
    error(arg1, arg2, ...arg3) {
        return this.doLog(exports.LogLevel.ERROR, arg1, arg2, arg3);
    }
    warn(arg1, arg2, ...arg3) {
        return this.doLog(exports.LogLevel.WARN, arg1, arg2, arg3);
    }
    info(arg1, arg2, ...arg3) {
        return this.doLog(exports.LogLevel.INFO, arg1, arg2, arg3);
    }
    debug(arg1, arg2, ...arg3) {
        return this.doLog(exports.LogLevel.DEBUG, arg1, arg2, arg3);
    }
    log(arg1, arg2, arg3, ...arg4) {
        if (typeof arg1 === "string" && logLevelNames.indexOf(arg1) !== -1) {
            return this.doLog(arg1, arg2, arg3, arg4);
        }
        else {
            // arg2 contains the format string and arg3 and arg4 the format arguments.
            let formatArgs = arg4;
            if (arg3 !== undefined) {
                formatArgs = [arg3].concat(arg4);
            }
            return this.doLog(exports.LogLevel.INFO, arg1, arg2, formatArgs);
        }
    }
    doLog(level, arg1, arg2, arg3) {
        if (isFirstLoglevelGreaterEqualSecond(this.level, level)) {
            assert(arg1 !== undefined, `Insufficient arguments to log function. (0): ${level}, (1): ${arg1}, (2): ${arg2}, (3): ${arg3}`);
            assert(Array.isArray(arg3), "arg3 is expected to be an array because it is the ...optionalParams argument of the calling functions.");
            let messageText;
            let tags = this.tags;
            let stack = "";
            // arg1 is the message with format placeholders if it contains %s or %d or %j.
            let arg1IsFormatMessage = typeof arg1 === "string" && /%s|%d|%j/.test(arg1);
            if (arg1IsFormatMessage) {
                assert(arg2 !== undefined, `The argument following the format string '${arg1}' must not be empty.`);
                messageText = util.format(arg1, [arg2].concat(arg3));
            }
            else if (arg2 === undefined) {
                assert(arg3.length === 0, "If arg2 is undefined then there must not be more arguments.");
                messageText = util.format(arg1);
                if (arg1 instanceof Error) {
                    stack = arg1.stack;
                }
            }
            else {
                // arg2 is the message with format placeholders if it contains %s or %d or %j.
                let arg2IsFormatMessage = typeof arg2 === "string" && /%s|%d|%j/.test(arg2);
                if (arg2IsFormatMessage) {
                    assert(arg3.length > 0, `The argument following the format string '${arg2}' must not be empty.`);
                    messageText = util.format(arg2, arg3);
                    // arg1 must contain tags.
                    tags = tags.concat(arg1);
                }
                else if (arg3.length === 0) {
                    messageText = util.format(arg2);
                    if (arg2 instanceof Error) {
                        stack = arg2.stack;
                    }
                    // arg1 must contain tags.
                    tags = tags.concat(arg1);
                }
                else {
                    throw new Error(`Invalid arguments to log function. (0): ${level}, (1): ${arg1}, (2): ${arg2}, (3): ${arg3}`);
                }
            }
            let message = {};
            message.isoDate = new Date().toISOString();
            message.level = level;
            message.tags = tags;
            message.text = messageText;
            message.stack = stack;
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