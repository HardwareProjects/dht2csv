/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

"use strict";

import * as util from "util";
import * as fsp from "./fs-promises";

let logfilePath: string = null;
let loglevel: string = null;
let logfileFd: number = -1;
let isInitialized = false;

export const loglevels = { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 };

export async function init(logfilePath: string, loglevel: string) {
    logfilePath = logfilePath;
    loglevel = loglevel;
    // Do not log method name, because logfile is not open yet.
    if (logfilePath === "stdout") {
        logfileFd = 1;
    } else {
        logfileFd = await fsp.open(logfilePath, "w");
    }
    isInitialized = true;
}

export async function info(format: string, ...params: any[]): Promise<void>;
export async function info(format: string, params: any): Promise<void> {
    log("info", format, params);
}

export async function warn(format: string, ...params: any[]): Promise<void>;
export async function warn(format: string, params: any): Promise<void> {
    log("warn", format, params);
}

export async function log(level: string, format: string, ...params: any[]): Promise<void>;
export async function log(level: string, format: string, params: any): Promise<void> {
    // Always log when the config is not yet initialized because it might be important.
    const shouldLog = ! isInitialized ? true : (loglevels as any)[loglevel] >= (loglevels as any)[level];
    if (shouldLog) {
        const message = (new Date()).toISOString() + " - " + level + ": " + util.format(format, params) + "\n";
        if (logfileFd !== -1) {
            await fsp.write(logfileFd, message);
        }
        else {
            console.log(message);
        }
    }
}