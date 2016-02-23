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
function setMinutesZero(isoDateStr) {
    return isoDateStr.substring(0, 14) + "00:00" + isoDateStr.substring(19);
}
exports.setMinutesZero = setMinutesZero;
function setHoursZero(isoDateStr) {
    return isoDateStr.substring(0, 11) + "00:00:00" + isoDateStr.substring(19);
}
exports.setHoursZero = setHoursZero;
function setWeekdayZero(isoDateStr) {
    const localDate = new Date(setHoursZero(isoDateStr).substr(0, 19));
    const localWeekday = (localDate.getUTCDay() + 6) % 7;
    localDate.setUTCDate(localDate.getUTCDate() - localWeekday);
    let a = [localDate.getUTCFullYear().toString(), "-",
        ((localDate.getUTCMonth() + 1) / 100).toFixed(2).substring(2), "-",
        (localDate.getUTCDate() / 100).toFixed(2).substring(2), "T",
        (localDate.getUTCHours() / 100).toFixed(2).substring(2), ":",
        (localDate.getUTCMinutes() / 100).toFixed(2).substring(2), ":",
        (localDate.getUTCSeconds() / 100).toFixed(2).substring(2),
        isoDateStr.substring(19)].join("");
    return a;
}
exports.setWeekdayZero = setWeekdayZero;
function getIsoDate(date) {
    const a = date.toISOString().substr(0, 19) + getTimezoneString(date);
    return a;
}
exports.getIsoDate = getIsoDate;
function getTimezoneString(date) {
    const totalMinutes = date.getTimezoneOffset();
    const absTotalMinues = Math.abs(totalMinutes);
    const hours = Math.floor(absTotalMinues / 60);
    const minutes = absTotalMinues % 60;
    const a = totalMinutes >= 0 ? "+" : "-"
        + (hours / 100).toFixed(2).substring(2) + ":"
        + (minutes / 100).toFixed(2).substring(2);
    return a;
}
//# sourceMappingURL=isodate-helper.js.map