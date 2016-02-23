/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/node-dht-sensor/node-dht-sensor.d.ts" />

"use strict";

import * as fs from "fs";
import * as path from "path";
import { format, inspect } from "util";
import * as _ from "lodash";

// The node-dht-sensor module reads gpio pins of the BCM2835 chip of the Raspberry Pi.
// The line will load the native node_dht_sensor.node module, which only succees on the Raspberry Pi.
import * as sensorLib from "node-dht-sensor";

import "./global-extensions";
import * as fsp from "./fs-promises";
import * as processp from "./process-promises";
import { Sensor, Config, processConfig } from "./config-helper";
import { LoggerInstance, createLogger, logErrorAndExit } from "./log-helper";
import { getIsoDate } from "./isodate-helper";

// This file is located in the lib subdirectory when executed, so baseDir is one level up.
const baseDir = path.resolve(__dirname, "..");
console.log("basedir: " + baseDir);
const configName = "sensorconfig.json";
let config: Config = null;
let logger: LoggerInstance = null;

// Lookup with the sensorName as key and the file descriptors for the 2 minutes historical values as value.
let sensorToValuesFd: { [sensorName: string]: { fdTemperature: number, fdHumidity: number } } = {};
// Lookup with the sensorName as key and the file descriptors for the 2 seconds historical values as value.
let sensorToLatestFd: { [sensorName: string]: { fdTemperature: number, fdHumidity: number } } = {};
// Lookup with the sensorName as key and the latest sensor value as value.
let sensorToVal: { [sensorName: string]: { temperatureC: number, humidityRel: number } } = {};

// function is called recursively after the 2 second timeout.
function readSensors(sensor: Sensor) {
    const readout = sensorLib.read();
    const hrstart = process.hrtime();
    if (readout.isValid === false) {
        logger.warn(`Error reading sensor with name '${sensor.name}', type '${sensor.type}' on pin '${sensor.pin}'. Error count '${readout.errors}'.`);
    } else {
        // do not wait until data is written.
        onNewSensorReadout(sensor.name, readout.temperature, readout.humidity);
    }
    const hrend = process.hrtime(hrstart);
    // hrend[0] contains passed seconds, hrend[1] contains passed nanoseconds
    const msDuration = hrend[0] * 1000.0 + hrend[1] / 1000000.0;
    // collecting period (or sampling period) is 2000 ms for DHT22 and 1000 ms for DHT11. Here set to 2000 because node-dht-sensor lib returns previous measurement if called earlier.
    const durationBetweenSamples = 2000;
    // substract time since last read from durationBetweenSamples.
    // could subtract further 520 ms based on the two bcm2835_delay(xx) statements in readDHT function in node-dht-sensor.cpp
    setTimeout(readSensors, Math.max(0, durationBetweenSamples - msDuration), sensor);
}

// function is called when a new sensor value was read. This is about every 2 seconds.
async function onNewSensorReadout(sensorName: string, temperatureC: number, humidityRel: number) {
    console.info("onNewSensorReadout " + temperatureC + " " + humidityRel);
    sensorToVal[sensorName] = { temperatureC: temperatureC, humidityRel: humidityRel };
    const now = new Date();
    await fsp.ftruncate(sensorToLatestFd[sensorName].fdTemperature);
    await fsp.ftruncate(sensorToLatestFd[sensorName].fdHumidity);
    writeSensorVal(sensorToLatestFd[sensorName].fdTemperature, temperatureC, now, false);
    writeSensorVal(sensorToLatestFd[sensorName].fdHumidity, humidityRel, now, false);
}

function onTwoMinuteIntervall() {
    console.info("onTwoMinuteIntervall");
    for (const sensor of config.sensors) {
        const now = new Date();
        writeSensorVal(sensorToValuesFd[sensor.name].fdTemperature, sensorToVal[sensor.name].temperatureC, now, true);
        writeSensorVal(sensorToValuesFd[sensor.name].fdHumidity, sensorToVal[sensor.name].humidityRel, now, true);
    }
}

async function writeSensorVal(fd: number, sensorVal: number, date: Date, addNewLine: boolean) {
    // Length of a data line in the output file excluding \n character.
    const totalRowLen = 32;
    const dateWithPadding = getIsoDate(date) + ",      ";
    const sensorValStr = sensorVal.toFixed(1);
    const row = dateWithPadding.substr(0, totalRowLen - sensorValStr.length) + sensorValStr + (addNewLine ? "\n" : "");
    await fsp.write(fd, row);
}

// Ensures the baseDir directory exists, opens the temperatureValues files and writes a header if the file is empty.
async function openFilesEnsureHeader() {
    async function openFilesEnsureHeaderHelper(filePath: string, header: string) {
        console.info(`Opening or creating file '${filePath}' and writing header if it contains zero bytes.`);
        const fd = await fsp.open(filePath, "a");
        const fstat = await fsp.fstat(fd);
        if (fstat.stats.size === 0) {
            await fsp.write(fd, header);
        }
        return fd;
    }

    for (const sensor of config.sensors) {
        const dir = path.resolve(baseDir, sensor.outputBasepath, sensor.name);
        console.info(`Creating directory for sensor data files if not existing '${dir}'.`);
        await fsp.mkdirp(dir);

        const fdTemperature = await openFilesEnsureHeaderHelper(sensor.temperatureValuesPath, "Iso Date,Temperature in Celsius\n");
        const fdHumidity = await openFilesEnsureHeaderHelper(sensor.humidityValuesPath, "Iso Date,Humidity in %\n");
        sensorToValuesFd[sensor.name] = { fdTemperature: fdTemperature, fdHumidity: fdHumidity };

        const fdTemperatureLatest = await fsp.open(sensor.temperatureLatestPath, "w");
        const fdHumidityLatest = await fsp.open(sensor.humidityLatestPath, "w");
        sensorToLatestFd[sensor.name] = { fdTemperature: fdTemperatureLatest, fdHumidity: fdHumidityLatest };
    }
}

async function main() {
    config = await processConfig(baseDir, configName);
    logger = await createLogger(config);
    console.info("Script started. Writing all log messages to the logfilePath specified in 'sensorconfig.json'.");
    logger.info("Config parsed, logger initialized.");
    await openFilesEnsureHeader();

    // Call node-dht-sensor Lib, which will initialize the native BCM2835 library.
    // A failure here has nothing to do with the sensor but likely with the installation of the BCM2835 library.
    const isInitialized = sensorLib.initialize(config.sensors[0].type, config.sensors[0].pin);
    if (! isInitialized) {
        logErrorAndExit(logger, "Failed to call 'initialize' on the 'node-dht-sensor' library. "
            + "'initialize' in turn initializes the native 'BCM2835' library. Check the github page of 'node-dht-sensor' for help.");
    }
    for (const sensor of config.sensors) {
        readSensors(sensor);
    }
    setInterval(onTwoMinuteIntervall, 1000 * 120);
}

main().catch(err => logErrorAndExit(logger, err));
