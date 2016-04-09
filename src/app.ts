/// <reference path="../typings/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/node-dht-sensor/node-dht-sensor.d.ts" />

"use strict";

import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import * as _ from "lodash";

// The used version of the node-dht-sensor module reads gpio pins using the wiringPi library.
// The line will load the native node_dht_sensor.node module, which only succeeds if wiringPi is installed.
import * as sensorLib from "node-dht-sensor";

import "./global-extensions";
import * as fsp from "./fs-promises";
import * as processp from "./process-promises";
import { Sensor, Config, parseConfig, processConfig } from "./config-helper";
import { getIsoDate } from "./isodate-helper";
import { Logger, LogLevel, isInfoOrVerboser, LoggerOptions } from "./log-helper";

// This file is located in the lib subdirectory when executed, so baseDir is one level up. Export for unit test. 
export let baseDir = path.resolve(__dirname, "..");
const configFileName = "config.json";
let config: Config = null;
// Will be set to true if the logging level is info or higher.
let isInfo: boolean = null;
let log: Logger = null;

// Lookup with the sensorName as key and the file descriptors for the 2 minutes historical values as value.
let sensorToValuesFd: { [sensorPin: number]: { fdTemperature: number, fdHumidity: number } } = {};
// Lookup with the sensorName as key and the file descriptors for the 2 seconds historical values as value.
let sensorToLatestFd: { [sensorPin: number]: { fdTemperature: number, fdHumidity: number } } = {};
// Lookup with the sensorPin as key and the latest sensor value as value.
let sensorToVal: { [sensorPin: number]: { temperatureC: number, humidityRel: number } } = {};

// Function is called recursively after the 2 second timeout.
function readSensors(sensor: Sensor, count: number) {
    isInfo && log.info(`In readSensors. sensor.pin '${sensor.pin}', count '${count}'.`);
    const readout = sensorLib.readSpec(sensor.type, sensor.pin);
    const hrstart = process.hrtime();
    if (readout.isValid === false) {
        log.warn(`Error reading sensor on pin '${sensor.pin}', type '${sensor.type}'. Error count '${readout.errors}'.`);
    } else {
        // Skip first 2 readouts because they are 0.
        if (++count > 2) {
            // Do not wait until data is written.
            onNewSensorReadout(sensor.pin, readout.temperature, readout.humidity);
        }
    }
    const hrend = process.hrtime(hrstart);
    // hrend[0] contains passed seconds, hrend[1] contains passed nanoseconds
    const msDuration = hrend[0] * 1000.0 + hrend[1] / 1000000.0;
    // Collecting period (or sampling period) is 2000 ms for DHT22 and 1000 ms for DHT11. Here set to 2000 because node-dht-sensor lib returns previous measurement if called earlier.
    const durationBetweenSamples = 2000;
    // Substract time since last read from durationBetweenSamples.
    // Could subtract further 520 ms based on the two bcm2835_delay(xx) statements in readDHT function in node-dht-sensor.cpp
    setTimeout(readSensors, Math.max(0, durationBetweenSamples - msDuration), sensor, count);
}

// Function is called when a new sensor value was read. This is about every 2 seconds.
async function onNewSensorReadout(sensorPin: number, temperatureC: number, humidityRel: number) {
    isInfo && log.info(`In onNewSensorReadout. sensorPin '${sensorPin}', temperatureC '${temperatureC}', humidityRel '${humidityRel}'.`);
    sensorToVal[sensorPin] = { temperatureC: temperatureC, humidityRel: humidityRel };
    const now = new Date();
    writeSensorVal(sensorToLatestFd[sensorPin].fdTemperature, temperatureC, now, false, true);
    writeSensorVal(sensorToLatestFd[sensorPin].fdHumidity, humidityRel, now, false, true);
}

function onTwoMinuteIntervall() {
    isInfo && log.info("In onTwoMinuteIntervall.");
    for (const sensor of config.sensors) {
        const now = new Date();
        // Do not wait for writeSensorVal to return.
        writeSensorVal(sensorToValuesFd[sensor.pin].fdTemperature, sensorToVal[sensor.pin].temperatureC, now, true, false);
        writeSensorVal(sensorToValuesFd[sensor.pin].fdHumidity, sensorToVal[sensor.pin].humidityRel, now, true, false);
    }
}

async function writeSensorVal(fd: number, sensorVal: number, date: Date, addNewLine: boolean, writeAtBeginning: boolean) {
    isInfo && log.info(`In writeSensorVal. fd '${fd}', sensorVal '${sensorVal}', date '${date.toLocaleString()}', addNewLine '${addNewLine}'.`);
    // Length of a data line in the output file excluding \n character.
    const totalRowLen = 32;
    const dateWithPadding = getIsoDate(date) + ",      ";
    const sensorValStr = sensorVal.toFixed(1);
    const row = dateWithPadding.substr(0, totalRowLen - sensorValStr.length) + sensorValStr + (addNewLine ? "\n" : "");
    // If the existing content size is equal to the written content size, then setting position to 0 replaces all existing content.
    const position = writeAtBeginning ? 0 : undefined;
    await fsp.write(fd, row, position);
}

// Ensures the baseDir directory exists, opens the temperatureValues files and writes a header if the file is empty.
async function openFilesEnsureHeader() {
    isInfo && log.info("In openFilesEnsureHeader");
    async function openFilesEnsureHeaderHelper(filePath: string, header: string) {
        isInfo && log.info(`Opening or creating file '${filePath}' and writing header if it contains zero bytes.`);
        const fd = await fsp.open(filePath, "a");
        const fstat = await fsp.fstat(fd);
        if (fstat.stats.size === 0) {
            await fsp.write(fd, header);
        }
        return fd;
    }

    for (const sensor of config.sensors) {
        const dir = path.resolve(baseDir, config.sensordataBasepath, sensor.dataSubdirectory);
        isInfo && log.info(`Creating directory '${dir}' for sensor data files if not existing.`);
        await fsp.mkdirp(dir);

        const fdTemperature = await openFilesEnsureHeaderHelper(sensor.temperatureValuesPath, "Iso Date,Temperature in Celsius\n");
        const fdHumidity = await openFilesEnsureHeaderHelper(sensor.humidityValuesPath, "Iso Date,Humidity in %\n");
        sensorToValuesFd[sensor.pin] = { fdTemperature: fdTemperature, fdHumidity: fdHumidity };

        const fdTemperatureLatest = await fsp.open(sensor.temperatureLatestPath, "w");
        const fdHumidityLatest = await fsp.open(sensor.humidityLatestPath, "w");
        sensorToLatestFd[sensor.pin] = { fdTemperature: fdTemperatureLatest, fdHumidity: fdHumidityLatest };
    }
}

export async function main() {
    // Do not log method name, because logfile is not open yet.
    config = await parseConfig(baseDir, configFileName);
    // Add filename as tag for the logger instance.
    const tags = [path.basename(__filename)];
    log = new Logger(config.logger, tags);
    isInfo = isInfoOrVerboser(config.logger.level);
    
    config = await processConfig(config, log.warn);
    log.info2("always", `Script started. See the '${configFileName}' for the output directory of the sensor values and other options.`);
    await openFilesEnsureHeader();

    // Tell wiringPi to use /dev/gpiomem instead of /dev/gpio so that no admin privileges are needed on Raspbian.
    process.env["WIRINGPI_GPIOMEM"] = 1;
    // Call node-dht-sensor Lib, which will initialize the native wiringPi library.
    // A failure here has nothing to do with the sensor but likely with the installation of the wiringPi library.
    const isInitialized = sensorLib.initialize(config.sensors[0].type, config.sensors[0].pin);
    if (! isInitialized) {
        throw new Error("Failed to call 'initialize' on the 'node-dht-sensor' library. "
            + "'initialize' in turn initializes the native 'wiringPi' library.");
    }
    for (const sensor of config.sensors) {
        readSensors(sensor, 0);
    }
    setInterval(onTwoMinuteIntervall, 1000 * 120);
}

if (require.main === module) {
    main().catch(err => {
        if(log) {
            log.error(err);
        } else {
            console.error(err);
        }
    });
}
