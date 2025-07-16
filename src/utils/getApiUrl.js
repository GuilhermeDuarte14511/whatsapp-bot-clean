"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalApiUrl = getLocalApiUrl;
exports.getApiUrl = getApiUrl;
const os_1 = __importDefault(require("os"));
function getLocalApiUrl(port = 3001) {
    var _a;
    const interfaces = os_1.default.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of (_a = interfaces[name]) !== null && _a !== void 0 ? _a : []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return `http://${iface.address}:${port}`;
            }
        }
    }
    return `http://localhost:${port}`;
}
function getApiUrl() {
    const portStr = process.env.PORT || '3001';
    const port = Number(portStr);
    return getLocalApiUrl(port);
}
