/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/winston/winston.d.ts" />

"use strict";

import * as fs from "fs";
import * as path from "path";
import stripcomment = require("strip-json-comments");
// logger library
import * as winston from "winston";

import * as fsp from "./fs-promises";
import { Config} from "./config-helper";

export { LoggerInstance } from "winston";

export async function createLogger(config: Config) {
    // Open logfile. Create if it does not exist or truncate if it exists.
    const fd = await fsp.open(config.logfilePath, "w");
    // Change file owner so it is not root.
    await fsp.fchown(fd, config.uidAfterInit, config.gidAfterInit);
    let logfileStream = fs.createWriteStream(null, { fd: fd });
    return new (winston.Logger)({
        transports: [
            new winston.transports.File({ level: config.loglevel, stream: logfileStream, json: false, handleExceptions: true, prettyPrint: true })
        ]
    });
}

// Print the error message and exit with error exit code.
export function logErrorAndExit(logger: winston.LoggerInstance, err: any) {
    // Since logging (ie writing to a file) is async and buffered, 
    // care must be taken so that the process does not exit before the error is logged.
    const msg = typeof err === "object" && "stack" in err ? err.stack : err;
    if (logger != null) {
        logger.error(`Sorry but an error occured.\n${msg}`, null, () => {
            const logfileStream = (logger as any).transports.file._stream as NodeJS.WritableStream;
            // Close the underlying stream, so the buffer is flushed. Further writes are not allowed.
            logfileStream.end(null, null, () => {
               process.exit(1);
            });
        });
   } else {
        console.error(`Sorry but an error occured.\n${msg}`);
        process.exit(1);
   }
}