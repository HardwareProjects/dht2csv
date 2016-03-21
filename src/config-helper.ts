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

const temperatureValuesFilename = "temperature_celsius.csv";
const temperatureLatestFilename = "temperature_celsius_latest.csv";
const humidityValuesFilename    = "humidity_percent.csv";
const humidityLatestFilename    = "humidity_percent_latest.csv";

export interface Config {
    // Values from config.json:
    sensors:            Sensor[];
    sensordataBasepath: string;
    loglevel:           string;
    // Calculated values:
    baseDir:            string;
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

export async function processConfig(baseDir: string, configFileName: string, logFn: { (format: string, ...params: any[]): void }) {
    const configPath = path.resolve(baseDir, configFileName);
    const config = await parseConfig(configPath);
    checkConfig(config, configPath);
    config.baseDir = baseDir;

    for (const sensor of config.sensors) {
        sensor.temperatureValuesPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.temperatureDataName + ".csv"));
        sensor.temperatureLatestPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.temperatureDataName + "_latest.csv"));
        sensor.humidityValuesPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.humidityDataName + ".csv"));
        sensor.humidityLatestPath = path.resolve(baseDir, path.join(config.sensordataBasepath, sensor.dataSubdirectory, sensor.humidityDataName + "_latest.csv"));
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

function checkConfig(config: Config, configPath: string) {
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
        if (!sensor.type || typeof sensor.type !== "number" || [11, 22].contains(sensor.type) === false)  {
            errors.push("Sensor type property must be 11 or 22.");
        }
    }
    if (errors.length > 0) {
        let warnings = [] as string[];
        warnings.push("Some values in the config file are not correct.");
        warnings.push(`Check the file '${configPath}' for the following errors:`);
        for (const err of errors) {
            warnings.push(err);
        }
        throw new Error(`Error while parsing config file '${configPath}'.\n${warnings.join("\n")}`);
    }
}
