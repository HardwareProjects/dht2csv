"use strict";
function setuidgid(uid, gid) {
    return new Promise((resolve, reject) => {
        process.setuid(uid);
        process.setgid(gid);
    });
}
exports.setuidgid = setuidgid;
function seteuidgid(uid, gid) {
    return new Promise((resolve, reject) => {
        process.seteuid(uid);
        process.setegid(gid);
    });
}
exports.seteuidgid = seteuidgid;
function setuid(id) {
    return new Promise((resolve, reject) => {
        process.setuid(id);
    });
}
exports.setuid = setuid;
function setgid(id) {
    return new Promise((resolve, reject) => {
        process.setgid(id);
    });
}
exports.setgid = setgid;
function seteuid(id) {
    return new Promise((resolve, reject) => {
        process.seteuid(id);
    });
}
exports.seteuid = seteuid;
function setegid(id) {
    return new Promise((resolve, reject) => {
        process.setegid(id);
    });
}
exports.setegid = setegid;
//# sourceMappingURL=process-promises.js.map