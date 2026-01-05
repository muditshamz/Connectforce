import * as vscode from 'vscode';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare class Logger {
    private outputChannel;
    private logLevel;
    constructor(outputChannel: vscode.OutputChannel);
    private shouldLog;
    private formatMessage;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error | any): void;
    show(): void;
}
//# sourceMappingURL=Logger.d.ts.map