"use strict";
// IsoDate Helper class. Operates on dates in any timezone. isoDateStr format is "2015-01-01T01:16:01+01:00"
// Returs IsoDateString with minutes and seconds set to 00:00.
function setMinutesZero(isoDateStr) {
    return isoDateStr.substring(0, 14) + "00:00" + isoDateStr.substring(19);
}
exports.setMinutesZero = setMinutesZero;
// Returs IsoDateString with hours, minutes and seconds set to 00:00:00.
function setHoursZero(isoDateStr) {
    return isoDateStr.substring(0, 11) + "00:00:00" + isoDateStr.substring(19);
}
exports.setHoursZero = setHoursZero;
// Returs IsoDateString with day set to the first day of the week and hours, minutes and seconds set to 00:00:00.
function setWeekdayZero(isoDateStr) {
    // The localDate has the time zone stripped, so calling getUTC... methods on it 
    // will return values for the time zone the date was in.
    const localDate = new Date(setHoursZero(isoDateStr).substr(0, 19));
    const localWeekday = (localDate.getUTCDay() + 6) % 7; // monday = 0, ..., sunday = 6
    localDate.setUTCDate(localDate.getUTCDate() - localWeekday);
    // uses (3/100).toFixed(2).substring(2) to format 3 as 03
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
    // Normally toISOString returns the UTC date. But when the minutes from getTimezoneOffset 
    // are subtracted, then toISOString will return the local date in ISO format.
    const localDate = new Date(date.valueOf() + (date.getTimezoneOffset() * -1 * 60 * 1000));
    // Replace the milliseconds and the UTC time indicator 'Z' with the timezone offset.
    const a = localDate.toISOString().substr(0, 19) + getTimezoneString(date);
    // The result is a string in the format '2016-02-24T15:42:54+01:00'.
    return a;
}
exports.getIsoDate = getIsoDate;
// Gets the Timezone Offset String in the format +00:00. 
function getTimezoneString(date) {
    const totalMinutes = date.getTimezoneOffset();
    const absTotalMinues = Math.abs(totalMinutes);
    const hours = Math.floor(absTotalMinues / 60);
    const minutes = absTotalMinues % 60;
    // timezoneOffset is the inverse of UTC offset, so use + if totalMinutes is negative.
    const a = (totalMinutes <= 0 ? "+" : "-")
        + (hours / 100).toFixed(2).substring(2) + ":"
        + (minutes / 100).toFixed(2).substring(2);
    return a;
}
//# sourceMappingURL=isodate-helper.js.map