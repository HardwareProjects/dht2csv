/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/strip-json-comments/strip-json-comments.d.ts" />
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const path = require("path");
const _ = require("lodash");
// es6 (default) import syntax not working with strip-json-comments.
const stripcomment = require("strip-json-comments");
const fsp = require("./fs-promises");
require("./global-extensions");
const logger_1 = require("./logger");
const temperatureValuesFilename = "temperature_celsius.csv";
const temperatureLatestFilename = "temperature_celsius_latest.csv";
const humidityValuesFilename = "humidity_percent.csv";
const humidityLatestFilename = "humidity_percent_latest.csv";
function processConfig(baseDir, configFileName, logFn) {
    return __awaiter(this, void 0, void 0, function* () {
        const configPath = path.resolve(baseDir, configFileName);
        const config = yield parseConfig(configPath);
        checkConfig(config, configPath, logFn);
        config.baseDir = baseDir;
        config.logfilePath = path.resolve(baseDir, config.logfilePath);
        for (const sensor of config.sensors) {
            sensor.temperatureValuesPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.name, temperatureValuesFilename));
            sensor.temperatureLatestPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.name, temperatureLatestFilename));
            sensor.humidityValuesPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.name, humidityValuesFilename));
            sensor.humidityLatestPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.name, humidityLatestFilename));
        }
        return config;
    });
}
exports.processConfig = processConfig;
function parseConfig(configPath) {
    return fsp.readFile(configPath).then(data => {
        const jsCode = data.toString();
        try {
            const stripped = stripcomment(jsCode);
            const parsed = JSON.parse(stripped);
            return parsed;
        }
        catch (ex) {
            const newEx = new Error(`Error while parsing config file '${configPath}'.\n'${ex.message}'`);
            newEx.__proto__ = ex.__proto__;
            throw newEx;
        }
    });
}
function checkConfig(config, configPath, logFn) {
    const errors = [];
    if (config.sensors == null || config.sensors.length === 0) {
        errors.push("No sensors defnined.");
    }
    if (config.loglevel == null || _.keys(logger_1.loglevels).contains(config.loglevel) === false) {
        errors.push("loglevel not supported, must be 'error', 'warn', 'info', 'verbose', 'debug' or 'silly'.");
    }
    for (const sensor of config.sensors) {
        if (sensor.name == null || typeof sensor.name !== "string" || sensor.name === "") {
            errors.push("Sensor name property cannot be empty.");
        }
        if (sensor.type == null || typeof sensor.type !== "number" || [11, 22].contains(sensor.type) === false) {
            errors.push("Sensor type property must be 11 or 22.");
        }
        if (sensor.pin == null || typeof sensor.pin !== "number" || sensor.pin < 1 || sensor.pin > 40) {
            errors.push("Sensor pin property must be a number between 1 and 40.");
        }
    }
    if (errors.length > 0) {
        logFn("error", "Some values in the config file are not correct.");
        logFn("error", "Check the file '" + configPath + "' for the following errors:");
        for (const err of errors) {
            logFn("error", err);
        }
        process.exit(1);
    }
}
//# sourceMappingURL=config-helper.js.map