import * as vscode from 'vscode';
import { ExternalConnection, FieldMapping } from '../types';
import { StorageService } from '../services/StorageService';
import { SalesforceService } from '../services/SalesforceService';
import { Logger } from '../utils/Logger';
import { v4 as uuidv4 } from 'uuid';

export class FieldMapperPanel {
    public static currentPanel: FieldMapperPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private connection: ExternalConnection;
    private storageService: StorageService;
    private salesforceService: SalesforceService;
    private logger: Logger;

    public static createOrShow(
        extensionUri: vscode.Uri,
        connection: ExternalConnection,
        storageService: StorageService,
        salesforceService: SalesforceService,
        logger: Logger
    ) {
        const panel = vscode.window.createWebviewPanel(
            'fieldMapper', `Field Mapper - ${connection.name}`,
            vscode.ViewColumn.One, { enableScripts: true }
        );
        FieldMapperPanel.currentPanel = new FieldMapperPanel(panel, connection, storageService, salesforceService, logger);
    }

    private constructor(panel: vscode.WebviewPanel, connection: ExternalConnection, storageService: StorageService, salesforceService: SalesforceService, logger: Logger) {
        this._panel = panel;
        this.connection = connection;
        this.storageService = storageService;
        this.salesforceService = salesforceService;
        this.logger = logger;
        this._panel.webview.html = '<html><body><h1>Field Mapper</h1><p>Coming soon - Visual field mapping interface</p></body></html>';
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        FieldMapperPanel.currentPanel = undefined;
        this._panel.dispose();
    }
}
