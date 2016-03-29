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


import * as util from "util";

import * as fs from "fs";
import * as stream from "stream";
import { EOL } from "os";

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
    levelFilter?: string;
    // Specified the tags that messages must have to be logged.
    // Eg. ["calculation", "*file*|database*"] will only log messages where one tag is equal to "calculation", 
    // and another tag contains either the word "file" or starts with the word "database".
    tagFilter?: string[];
    // A list of destinations, that will be used be an internal or a provided logFunction.
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

export interface LoggerOptions extends ApplicationOptions, ModulOptions {
}

export interface Message {
    isoDate: string;
    level: string;
    tags: string[];
    text: string;
    stack?: string;
}

const defaultOptions: LoggerOptions = {
    levelFilter: LogLevel.DEBUG,
    tagFilter: [],
    tags: [],
    destinations: [process.stdout, process.stderr],
    logFunction: allDest0WarnDest1.name,
};

let logFunctions = new Map<string, Function>();
logFunctions.set(allDest0WarnDest1.name, allDest0WarnDest1);

// log function. The returned promise is resolved when the message is written.
function allDest0WarnDest1(message: Message, destinations: NodeJS.WritableStream[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const messageStr = JSON.stringify(message) + EOL;
        destinations[0].write(messageStr, () => {
            // Write WARN and ERROR messages also to second destination.
            if (!isInfoOrVerboser(message.level) && destinations[1] !== undefined && destinations[0] !== destinations[1]) {
                destinations[1].write(messageStr, () => resolve());
            } else {
                resolve();
            }
        });
     });
}

export class Logger implements LoggerOptions {
    levelFilter: string;
    tagFilter: string[];
    tags: string[];
    destinations: NodeJS.WritableStream[];
    logFunction: (message: Message, destinations: NodeJS.WritableStream[]) => Promise<void>;
    
    constructor({ levelFilter = defaultOptions.levelFilter,
                  tagFilter = defaultOptions.tagFilter,
                  tags = defaultOptions.tags,
                  destinations = defaultOptions.destinations,
                  logFunction = defaultOptions.logFunction,
                } /*= defaultOptions*/) {
        checkLoglevel(levelFilter);
        this.levelFilter = levelFilter;
        this.tagFilter = tagFilter;
        this.tags = tags;
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
            } else if (dest instanceof stream.Writable) {
                this.destinations.push(dest);
            } else {
                throw new TypeError(`One of the elements of argument 'destinations' has unexpected type '${typeof dest}'.`);
            }
        }
    }
    
    // Returns a copy of the options that were used in the constructor.
    getOptions(): LoggerOptions {
        return {
            levelFilter: this.levelFilter,
            tagFilter: this.tagFilter.slice(),
            tags: this.tags.slice(),
            destinations: this.destinations,
            logFunction: this.logFunction,
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

    // An alias method for info() with additional overload that accepts LogLevel.
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
        if (isFirstLoglevelGreaterEqualSecond(this.levelFilter, level)) {
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