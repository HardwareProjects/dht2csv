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
// es6 (default) import syntax not working with strip-json-comments.
const stripcomment = require("strip-json-comments");
const fsp = require("./fs-promises");
require("./global-extensions");
const temperatureValuesFilename = "temperature_celsius.csv";
const temperatureLatestFilename = "temperature_celsius_latest.csv";
const humidityValuesFilename = "humidity_percent.csv";
const humidityLatestFilename = "humidity_percent_latest.csv";
function processConfig(baseDir, configFileName, logFn) {
    return __awaiter(this, void 0, void 0, function* () {
        const configPath = path.resolve(baseDir, configFileName);
        const config = yield parseConfig(configPath);
        checkConfig(config, configPath);
        config.baseDir = baseDir;
        for (const sensor of config.sensors) {
            sensor.temperatureValuesPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.temperatureDataName + ".csv"));
            sensor.temperatureLatestPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.temperatureDataName + "_latest.csv"));
            sensor.humidityValuesPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.humidityDataName + ".csv"));
            sensor.humidityLatestPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.humidityDataName + "_latest.csv"));
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
function checkConfig(config, configPath) {
    const errors = [];
    if (!config.sensors || config.sensors.length === 0) {
        errors.push("No sensors defnined.");
    }
    for (const sensor of config.sensors) {
        if (!sensor.temperatureDataName || typeof sensor.temperatureDataName !== "string" || sensor.temperatureDataName === "") {
            errors.push("temperatureDataName property cannot be empty.");
        }
        if (!sensor.humidityDataName || typeof sensor.humidityDataName !== "string" || sensor.humidityDataName === "") {
            errors.push("humidityDataName property cannot be empty.");
        }
        if (!sensor.pin || typeof sensor.pin !== "number" || sensor.pin < 1 || sensor.pin > 40) {
            errors.push("Sensor pin property must be a number between 1 and 40.");
        }
        if (!sensor.type || typeof sensor.type !== "number" || [11, 22].contains(sensor.type) === false) {
            errors.push("Sensor type property must be 11 or 22.");
        }
    }
    if (errors.length > 0) {
        let warnings = [];
        warnings.push("Some values in the config file are not correct.");
        warnings.push(`Check the file '${configPath}' for the following errors:`);
        for (const err of errors) {
            warnings.push(err);
        }
        throw new Error(`Error while parsing config file '${configPath}'.\n${warnings.join("\n")}`);
    }
}
//# sourceMappingURL=config-helper.js.map