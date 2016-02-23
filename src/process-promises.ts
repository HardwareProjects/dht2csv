"use strict";

export function setuidgid(uid: string|number, gid: string|number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        process.setuid(uid);
        process.setgid(gid);
    });
}

export function seteuidgid(uid: string|number, gid: string|number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        process.seteuid(uid);
        process.setegid(gid);
    });
}

export function setuid(id: string|number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        process.setuid(id);
    });
}

export function setgid(id: string|number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        process.setgid(id);
    });
}

export function seteuid(id: string|number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        process.seteuid(id);
    });
}

export function setegid(id: string|number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        process.setegid(id);
    });
}
