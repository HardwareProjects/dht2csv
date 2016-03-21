/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

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

import * as util from "util";

/* tslint:disable:variable-name */
export const Loglevel = {
    OFF:   "OFF",
    FATAL: "FATAL",
    ERROR: "ERROR",
    WARN:  "WARN",
    INFO:  "INFO",
    DEBUG: "DEBUG",
    ALL:   "ALL"
};
/* tslint:enable:variable-name */
export const loglevelNames = Object.keys(Loglevel);

export class Config {
    // If the timestamp should be included in the log message.
    static isLogWithTimestamp = true;
    // If the filename or source should be included in the log message.
    static isLogWithPrefix = true;
}

// Returns a logging function for the given loglevel.
// The returned function takes a format string and a variable number of arguments.
// The returned function will always log. Thus the user must check if the configured
// loglevel is verboser than the loglevel of the function.
// If config.isLogWithTimestamp is true then the log message is prefixed with a timestamp.
// If config.isLogWithPrefix is true then the log message is prefixed with a the value
// of the logMessagePrefix argument.
export function getLogger(loglevel: string, logMessagePrefix?: string) {
    loglevel = loglevel.toUpperCase();
    checkLoglevel(loglevel);
    logMessagePrefix = logMessagePrefix || "";
    const logFn = isWarnOrVerboser(loglevel) ? console.log : console.error;
    return (format: any, ...params: any[]) =>
        logFn( (Config.isLogWithTimestamp ? (new Date()).toISOString() + " " : "")
               + (Config.isLogWithPrefix ? "[" + loglevel + "] '" + logMessagePrefix + "' - " : "")
               + (! params || params === []) ? util.format(format) : util.format(format, params)
               + (format instanceof Error ? "\n" + format.stack : ""));
}

export function isFatalOrVerboser(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, Loglevel.FATAL);
}

export function isErrorOrVerboser(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, Loglevel.ERROR);
}

export function isWarnOrVerboser(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, Loglevel.WARN);
}

export function isInfoOrVerboser(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, Loglevel.INFO);
}

export function isDebugOrVerboser(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, Loglevel.DEBUG);
}

export function isAll(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, Loglevel.ALL);
}

function isFirstLoglevelGreaterEqualSecond(firstLoglevel: string, secondLoglevel: string) {
    firstLoglevel = firstLoglevel.toUpperCase();
    checkLoglevel(firstLoglevel);
    return loglevelNames.indexOf(firstLoglevel) >= loglevelNames.indexOf(secondLoglevel);
}

function checkLoglevel(loglevel: string) {
    if (loglevelNames.indexOf(loglevel) === -1) {
        throw new Error(
            util.format("Value '%s' for argument loglevel not supported, must be one of: %j.",
                loglevel, loglevelNames));
    }
}