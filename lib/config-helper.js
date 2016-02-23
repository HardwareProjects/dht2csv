"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
    return new Promise(function (resolve, reject) {
        generator = generator.call(thisArg, _arguments);
        function cast(value) { return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) { resolve(value); }); }
        function onfulfill(value) { try { step("next", value); } catch (e) { reject(e); } }
        function onreject(value) { try { step("throw", value); } catch (e) { reject(e); } }
        function step(verb, value) {
            var result = generator[verb](value);
            result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
        }
        step("next", void 0);
    });
};
var path = require("path");
const stripcomment = require("strip-json-comments");
var fsp = require("./fs-promises");
require("./global-extensions");
const configFilename = "sensorconfig.json";
const temperatureValuesFilename = "temperature_celsius.csv";
const temperatureLatestFilename = "temperature_celsius_latest.csv";
const humidityValuesFilename = "humidity_percent.csv";
const humidityLatestFilename = "humidity_percent_latest.csv";
function processConfig(baseDir, configName) {
    return __awaiter(this, void 0, Promise, function* () {
        const configPath = path.resolve(baseDir, configFilename);
        const config = yield parseConfig(configPath);
        checkConfig(config, configPath);
        config.uidAfterInit = yield UsernameToUid(config.userAfterInit);
        config.gidAfterInit = yield GroupnameToGid(config.groupAfterInit);
        config.baseDir = baseDir;
        config.logfilePath = path.resolve(baseDir, config.logfilePath);
        for (const sensor of config.sensors) {
            sensor.temperatureValuesPath = path.resolve(baseDir, path.join(sensor.outputBasepath, sensor.name, temperatureValuesFilename));
            sensor.temperatureLatestPath = path.resolve(baseDir, path.join(sensor.outputBasepath, sensor.name, temperatureLatestFilename));
            sensor.humidityValuesPath = path.resolve(baseDir, path.join(sensor.outputBasepath, sensor.name, humidityValuesFilename));
            sensor.humidityLatestPath = path.resolve(baseDir, path.join(sensor.outputBasepath, sensor.name, humidityLatestFilename));
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
    if (config.sensors == null || config.sensors.length === 0) {
        errors.push("No sensors defnined.");
    }
    const loglevels = ["error", "warn", "info", "verbose", "debug", "silly"];
    if (config.loglevel == null || loglevels.contains(config.loglevel) === false) {
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
        console.error("Some values in the config file are not correct.");
        console.error("Check the file '" + configPath + "' for the following errors:");
        for (const err of errors) {
            console.error(err);
        }
        process.exit(1);
    }
}
function UsernameToUid(username) {
    return new Promise((resolve, reject) => {
        if (process.geteuid && process.seteuid) {
            const savedUid = process.geteuid();
            process.seteuid(username);
            const uid = process.geteuid();
            process.seteuid(savedUid);
            resolve(uid);
        }
        else {
            resolve(0);
        }
    });
}
function GroupnameToGid(groupname) {
    return new Promise((resolve, reject) => {
        if (process.getegid && process.setegid) {
            const savedGid = process.getegid();
            process.setegid(groupname);
            const gid = process.getegid();
            process.setegid(savedGid);
            resolve(gid);
        }
        else {
            resolve(0);
        }
    });
}
//# sourceMappingURL=config-helper.js.map