/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/strip-json-comments/strip-json-comments.d.ts" />

"use strict";

import * as path from "path";
import * as _ from "lodash";
// es6 (default) import syntax not working with strip-json-comments.
const stripcomment = require("strip-json-comments");

import * as fsp from "./fs-promises";
import "./global-extensions";
import { loglevels } from "./logger";

const configFilename            = "sensorconfig.json";
const temperatureValuesFilename = "temperature_celsius.csv";
const temperatureLatestFilename = "temperature_celsius_latest.csv";
const humidityValuesFilename    = "humidity_percent.csv";
const humidityLatestFilename    = "humidity_percent_latest.csv";

export interface Sensor {
    name:                  string;
    outputBasepath:        string;
    type:                  number;
    pin:                   number;
    temperatureValuesPath: string;
    temperatureLatestPath: string;
    humidityValuesPath:    string;
    humidityLatestPath:    string;
}

export interface Config {
    sensors:        Sensor[];
    loglevel:       string;
    logfilePath:    string;
    baseDir:        string;
}

export async function processConfig(baseDir: string, configName: string, logFn: { (level: string, format: string, ...params: any[]): void }) {
    const configPath = path.resolve(baseDir, configFilename);
    const config = await parseConfig(configPath);
    checkConfig(config, configPath, logFn);
    config.baseDir = baseDir;
    config.logfilePath = path.resolve(baseDir, config.logfilePath);

    for (const sensor of config.sensors) {
        sensor.temperatureValuesPath = path.resolve(baseDir, path.join(sensor.outputBasepath, sensor.name, temperatureValuesFilename));
        sensor.temperatureLatestPath = path.resolve(baseDir, path.join(sensor.outputBasepath, sensor.name, temperatureLatestFilename));
        sensor.humidityValuesPath = path.resolve(baseDir, path.join(sensor.outputBasepath, sensor.name, humidityValuesFilename));
        sensor.humidityLatestPath = path.resolve(baseDir, path.join(sensor.outputBasepath, sensor.name, humidityLatestFilename));
    }
    return config;
}

function parseConfig(configPath: string) {
    return fsp.readFile(configPath).then(data => {
        const jsCode = data.toString();
        try {
            const stripped = stripcomment(jsCode);
            const parsed = JSON.parse(stripped) as Config;
            return parsed;
        }
        catch (ex) {
            const newEx = new Error(`Error while parsing config file '${configPath}'.\n'${ex.message}'`);
            (newEx as any).__proto__ = ex.__proto__;
            throw newEx;
        }
    });
}

function checkConfig(config: Config, configPath: string, logFn: { (level: string, format: string, ...params: any[]): void }) {
    const errors = [] as string[];
    if (config.sensors == null || config.sensors.length === 0) {
        errors.push("No sensors defnined.");
    }
    if (config.loglevel == null || _.keys(loglevels).contains(config.loglevel) === false) {
        errors.push("loglevel not supported, must be 'error', 'warn', 'info', 'verbose', 'debug' or 'silly'.");
    }
    for (const sensor of config.sensors) {
        if (sensor.name == null || typeof sensor.name !== "string" || sensor.name === "") {
            errors.push("Sensor name property cannot be empty.");
        }
        if (sensor.type == null || typeof sensor.type !== "number" || [11, 22].contains(sensor.type) === false)  {
            errors.push("Sensor type property must be 11 or 22.");
        }
        if (sensor.pin == null || typeof sensor.pin !== "number" || sensor.pin < 1 || sensor.pin > 40)  {
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
