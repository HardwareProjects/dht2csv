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
import { LoggerOptions } from "./log-helper";

const temperatureValuesFilename = "temperature_celsius.csv";
const temperatureLatestFilename = "temperature_celsius_latest.csv";
const humidityValuesFilename    = "humidity_percent.csv";
const humidityLatestFilename    = "humidity_percent_latest.csv";

export interface Config {
    // Values from config.json:
    sensors:            Sensor[];
    sensordataBasepath: string;
    logger:             LoggerOptions;
    // Calculated values:
    baseDir:            string;
    configPath:         string;
}

export interface Sensor {
    // Values from config.json:
    pin:                   number;
    type:                  number;
    dataSubdirectory:      string;
    temperatureDataName:   string;
    humidityDataName:      string;
    // Calculated values:
    temperatureValuesPath: string;
    temperatureLatestPath: string;
    humidityValuesPath:    string;
    humidityLatestPath:    string;
}

export async function processConfig(config: Config, logFn: { (format: string, ...params: any[]): void }) {
    checkConfig(config);
    for (const sensor of config.sensors) {
        sensor.temperatureValuesPath = path.resolve(config.baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.temperatureDataName + ".csv"));
        sensor.temperatureLatestPath = path.resolve(config.baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.temperatureDataName + "_latest.csv"));
        sensor.humidityValuesPath = path.resolve(config.baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.humidityDataName + ".csv"));
        sensor.humidityLatestPath = path.resolve(config.baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.humidityDataName + "_latest.csv"));
    }
    return config;
}

export function parseConfig(baseDir: string, configFileName: string) {
    const configPath = path.resolve(baseDir, configFileName);
    return fsp.readFile(configPath).then(data => {
        const jsCode = data.toString();
        try {
            const stripped = stripcomment(jsCode);
            const parsed = JSON.parse(stripped) as Config;
            parsed.baseDir = baseDir;
            parsed.configPath = configPath;
            return parsed;
        }
        catch (ex) {
            const newEx = new Error(`Error while parsing config file '${configPath}'.\n'${ex.message}'`);
            (newEx as any).__proto__ = ex.__proto__;
            throw newEx;
        }
    });
}

function checkConfig(config: Config) {
    const errors = [] as string[];
    if (! config.sensors || config.sensors.length === 0) {
        errors.push("No sensors defnined.");
    }
    for (const sensor of config.sensors) {
        if (! sensor.temperatureDataName || typeof sensor.temperatureDataName !== "string" || sensor.temperatureDataName === "") {
            errors.push("temperatureDataName property cannot be empty.");
        }
        if (! sensor.humidityDataName || typeof sensor.humidityDataName !== "string" || sensor.humidityDataName === "") {
            errors.push("humidityDataName property cannot be empty.");
        }
        if (! sensor.pin || typeof sensor.pin !== "number" || sensor.pin < 1 || sensor.pin > 40)  {
            errors.push("Sensor pin property must be a number between 1 and 40.");
        }
        if (!sensor.type || typeof sensor.type !== "number" || [11, 22].includes(sensor.type) === false)  {
            errors.push("Sensor type property must be 11 or 22.");
        }
    }
    if (errors.length > 0) {
        let warnings = [] as string[];
        warnings.push("Some values in the config file are not correct.");
        warnings.push(`Check the file '${config.configPath}' for the following errors:`);
        for (const err of errors) {
            warnings.push(err);
        }
        throw new Error(`Error while parsing config file '${config.configPath}'.\n${warnings.join("\n")}`);
    }
}
