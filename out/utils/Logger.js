"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const vscode = __importStar(require("vscode"));
class Logger {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.logLevel = vscode.workspace.getConfiguration('connectforce').get('logLevel', 'info');
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }
    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }
    debug(message, data) {
        if (this.shouldLog('debug')) {
            const formattedMessage = this.formatMessage('debug', message);
            this.outputChannel.appendLine(formattedMessage);
            if (data) {
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
            }
        }
    }
    info(message, data) {
        if (this.shouldLog('info')) {
            const formattedMessage = this.formatMessage('info', message);
            this.outputChannel.appendLine(formattedMessage);
            if (data) {
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
            }
        }
    }
    warn(message, data) {
        if (this.shouldLog('warn')) {
            const formattedMessage = this.formatMessage('warn', message);
            this.outputChannel.appendLine(formattedMessage);
            if (data) {
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
            }
        }
    }
    error(message, error) {
        if (this.shouldLog('error')) {
            const formattedMessage = this.formatMessage('error', message);
            this.outputChannel.appendLine(formattedMessage);
            if (error) {
                if (error instanceof Error) {
                    this.outputChannel.appendLine(`Stack: ${error.stack}`);
                }
                else {
                    this.outputChannel.appendLine(JSON.stringify(error, null, 2));
                }
            }
        }
    }
    show() {
        this.outputChannel.show();
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map