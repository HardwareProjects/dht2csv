/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

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

import * as util from "util";

import * as fs from "fs";
import * as stream from "stream";
import { EOL } from "os";
import * as tty from "tty";

/* tslint:disable:variable-name */
export const LogLevel = {
    OFF:   "OFF",
    ERROR: "ERROR",
    WARN:  "WARN",
    INFO:  "INFO",
    DEBUG: "DEBUG",
};
/* tslint:enable:variable-name */

const logLevelNames = Object.keys(LogLevel);

export interface ApplicationOptions {
    // Specifies the minimum importance that messages must have to be logged.
    // Eg. WARN will only log messages with level WARN and ERROR.
    level?: string;
    // A list of destinations, that will be used by an internal or a provided logFunction.
    // Supported destination values are WritableStream, file path or the strings "stdout" or "stderr".
    destinations?: Array<string|NodeJS.WritableStream>;
    // The function that may modify the log message and write it to a destination.
    // Supported are the name of a predefined logFunction or a callback function.
    logFunction?: string|((message: Message, destinations: NodeJS.WritableStream[]) => Promise<void>);
}

export interface ModulOptions {
    // Tags that the logger will include in its log messages. Additional tags can be added by the logging function.
    tags?: string[];
}

export interface LoggerOptions extends ApplicationOptions {
}

export interface Message {
    isoDate: string;
    level: string;
    tags: string[];
    text: string;
    stack?: string;
}

const defaultOptions: LoggerOptions = {
    level: LogLevel.DEBUG,
    destinations: [process.stdout, process.stderr],
    logFunction: allDest0WarnDest1.name,
};

let logFunctions = new Map<string, Function>();
logFunctions.set(allDest0WarnDest1.name, allDest0WarnDest1);

// log function. The returned promise is resolved when the message is written.
// Always write WARN or ERROR messages to destinations[1] if it exists and it is not equal to destinations[0].
// Always write to destinations[0] except
// - if the message was already written to the console by destinations[1] and destinations[0]
//   is also a console (so that WARN and ERROR messages are only printed once to the console).
function allDest0WarnDest1(message: Message, destinations: NodeJS.WritableStream[]): Promise<void> {
    const writeToDest1 = !isInfoOrVerboser(message.level) && destinations[1] !== undefined && destinations[0] !== destinations[1];
    const isBothTty = isTty(destinations[0]) && isTty(destinations[1]);
    const writeToDest0 = !(writeToDest1 && isBothTty);
    const streamA = writeToDest1 ? destinations[1] : destinations[0];
    const streamB = writeToDest1 && writeToDest0 ? destinations[0] : null;
    return new Promise<void>((resolve, reject) => {
        const messageStr = JSON.stringify(message) + EOL;
        streamA.write(messageStr, () => {
            if (streamB) {
                streamB.write(messageStr, () => resolve());
            } else {
                resolve();
            }
        });
     });
}

function isTty(writableStream: NodeJS.WritableStream) {
    return writableStream as tty.WriteStream &&
        // writableStream.isTTY is undefined for some streams.
        ((writableStream as tty.WriteStream).isTTY || false);
}

export class Logger implements LoggerOptions, ModulOptions {
    level: string;
    tags: string[];
    destinations: NodeJS.WritableStream[];
    logFunction: (message: Message, destinations: NodeJS.WritableStream[]) => Promise<void>;
    
    constructor({ levelFilter = defaultOptions.level,
                  destinations = defaultOptions.destinations,
                  logFunction = defaultOptions.logFunction,
                }, tags?: string[]) {
        checkLoglevel(levelFilter);
        this.level = levelFilter;
        this.tags = tags || [];
        this.setDestinations(destinations);
        this.setLogFunction(logFunction);
    }
    
    private setLogFunction(logFunction: string|((message: Message, destinations: NodeJS.WritableStream[]) => Promise<void>)) {
        if (typeof logFunction === "string") {
            if (logFunctions.has(logFunction)) {
                this.logFunction = logFunctions.get(logFunction) as any;
            } else {
                throw new Error(`The logFunction with name '${logFunction}' is not known.`);
            }
        } else if (typeof logFunction === "function") {
            this.logFunction = logFunction;
        } else {
            throw new TypeError(`The argument 'logFunction' has unexpected type '${typeof logFunction}'.`);
        }
    }
    
    private setDestinations(destinations: Array<string|NodeJS.WritableStream>) {
        this.destinations = [];
        for (const dest of destinations) {
            if (typeof dest === "string") {
                if (dest === "stdout") {
                    this.destinations.push(process.stdout);
                } else if (dest === "stderr") {
                    this.destinations.push(process.stderr);
                } else {
                    const s = fs.createWriteStream(dest, { flags: "a" });
                    this.destinations.push(s);
                }
            } else if (dest instanceof stream.Writable || dest instanceof stream.Transform) {
                this.destinations.push(dest);
            } else {
                throw new TypeError(`One of the elements of argument 'destinations' has unexpected type '${typeof dest}'.`);
            }
        }
    }
    
    // Returns a copy of the options that were used in the constructor.
    getOptions(): LoggerOptions & ModulOptions {
        return {
            level: this.level,
            destinations: this.destinations,
            logFunction: this.logFunction,
            tags: this.tags.slice(),
        };
    }
    
    error(message: any, ...optionalParams: any[]): Promise<void>;
    error(tags: string[], message: any, ...optionalParams: any[]): Promise<void>;
    error(arg1: any, arg2: any, arg3:any): Promise<void> {
        return this.doLog(LogLevel.ERROR, arg1, arg2, arg3);
    }
    
    warn(message: any, ...optionalParams: any[]): Promise<void>;
    warn(tags: string[], message: any, ...optionalParams: any[]): Promise<void>;
    warn(arg1: any, arg2: any, arg3:any): Promise<void> {
        return this.doLog(LogLevel.WARN, arg1, arg2, arg3);
    }

    info(message: any, ...optionalParams: any[]): Promise<void>;
    info(tags: string[], message: any, ...optionalParams: any[]): Promise<void>;
    info(arg1: any, arg2: any, arg3:any): Promise<void> {
        return this.doLog(LogLevel.INFO, arg1, arg2, arg3);
    }
    
    debug(message: any, ...optionalParams: any[]): Promise<void>;
    debug(tags: string[], message: any, ...optionalParams: any[]): Promise<void>;
    debug(arg1: any, arg2: any, arg3:any): Promise<void> {
        return this.doLog(LogLevel.DEBUG, arg1, arg2, arg3);
    }

    // An alias method for info() with additional overload that accepts LogLevel.
    // Can be used to replace console.log().
    log(level: "OFF"|"ERROR"|"WARN"|"INFO"|"DEBUG", tags: string[], message: any, ...optionalParams: any[]): Promise<void>;
    log(message: any, ...optionalParams: any[]): Promise<void>;
    log(tags: string[], message: any, ...optionalParams: any[]): Promise<void>;
    log(arg1: any, arg2: any, arg3: any, arg4:any): Promise<void> {
        if (typeof arg1 === "string" && logLevelNames.indexOf(arg1) !== -1) {
            return this.doLog(arg1, arg2, arg3, arg4);
        } else {
            return this.doLog(LogLevel.INFO, arg1, arg2, arg3);
        }
    }
    
    private doLog(level: string, arg1: any, arg2: any, arg3: any): Promise<void> {
        if (isFirstLoglevelGreaterEqualSecond(this.level, level)) {
            const hasTagsArg = arg1 instanceof Array ? true : false;
            const tags = hasTagsArg ? arg1 : [];
            const format = hasTagsArg ? arg2 : arg1;
            const params = hasTagsArg ? arg3 : arg2;
            
            let message = {} as Message;
            message.isoDate = new Date().toISOString();
            message.level = level;
            message.tags = this.tags.concat(tags);
            message.text = (!params || params === [] ? util.format(format) : util.format(format, params));
            if (format instanceof Error) {
                message.stack = format.stack;
            }
            return this.logFunction(message, this.destinations);
        } else {
            return Promise.resolve();
        }
    }
}

export function isErrorOrVerboser(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, LogLevel.ERROR);
}

export function isWarnOrVerboser(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, LogLevel.WARN);
}

export function isInfoOrVerboser(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, LogLevel.INFO);
}

export function isDebugOrVerboser(loglevel: string) {
    return isFirstLoglevelGreaterEqualSecond(loglevel, LogLevel.DEBUG);
}

function isFirstLoglevelGreaterEqualSecond(firstLoglevel: string, secondLoglevel: string) {
    firstLoglevel = firstLoglevel.toUpperCase();
    checkLoglevel(firstLoglevel);
    return logLevelNames.indexOf(firstLoglevel) >= logLevelNames.indexOf(secondLoglevel);
}

function checkLoglevel(loglevel: string) {
    if (logLevelNames.indexOf(loglevel) === -1) {
        throw new Error(
            util.format("Value '%s' for argument loglevel not supported, must be one of: %j.",
                loglevel, logLevelNames));
    }
}