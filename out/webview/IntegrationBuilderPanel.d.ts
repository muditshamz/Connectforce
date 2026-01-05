import * as vscode from 'vscode';
import { ConnectionService } from '../services/ConnectionService';
import { SalesforceService } from '../services/SalesforceService';
import { Logger } from '../utils/Logger';
import { ERPTemplate } from '../types';
export declare class IntegrationBuilderPanel {
    static currentPanel: IntegrationBuilderPanel | undefined;
    private readonly _panel;
    private readonly _extensionUri;
    private _disposables;
    private connectionService;
    private salesforceService;
    private logger;
    private currentConnection?;
    private template?;
    static createOrShow(extensionUri: vscode.Uri, connectionService: ConnectionService, salesforceService: SalesforceService, logger: Logger, template?: ERPTemplate): void;
    private constructor();
    loadTemplate(template: ERPTemplate): void;
    private _handleMessage;
    private _saveConnection;
    private _testConnection;
    private _addEndpoint;
    private _update;
    private _getHtml;
    dispose(): void;
}
//# sourceMappingURL=IntegrationBuilderPanel.d.ts.map