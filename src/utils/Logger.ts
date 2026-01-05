import * as vscode from 'vscode';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.logLevel = vscode.workspace.getConfiguration('connectforce').get('logLevel', 'info');
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    public debug(message: string, data?: any): void {
        if (this.shouldLog('debug')) {
            const formattedMessage = this.formatMessage('debug', message);
            this.outputChannel.appendLine(formattedMessage);
            if (data) {
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
            }
        }
    }

    public info(message: string, data?: any): void {
        if (this.shouldLog('info')) {
            const formattedMessage = this.formatMessage('info', message);
            this.outputChannel.appendLine(formattedMessage);
            if (data) {
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
            }
        }
    }

    public warn(message: string, data?: any): void {
        if (this.shouldLog('warn')) {
            const formattedMessage = this.formatMessage('warn', message);
            this.outputChannel.appendLine(formattedMessage);
            if (data) {
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
            }
        }
    }

    public error(message: string, error?: Error | any): void {
        if (this.shouldLog('error')) {
            const formattedMessage = this.formatMessage('error', message);
            this.outputChannel.appendLine(formattedMessage);
            if (error) {
                if (error instanceof Error) {
                    this.outputChannel.appendLine(`Stack: ${error.stack}`);
                } else {
                    this.outputChannel.appendLine(JSON.stringify(error, null, 2));
                }
            }
        }
    }

    public show(): void {
        this.outputChannel.show();
    }
}
