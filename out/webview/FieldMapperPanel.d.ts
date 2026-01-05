import * as vscode from 'vscode';
import { ExternalConnection } from '../types';
import { StorageService } from '../services/StorageService';
import { SalesforceService } from '../services/SalesforceService';
import { Logger } from '../utils/Logger';
export declare class FieldMapperPanel {
    static currentPanel: FieldMapperPanel | undefined;
    private readonly _panel;
    private _disposables;
    private connection;
    private storageService;
    private salesforceService;
    private logger;
    static createOrShow(extensionUri: vscode.Uri, connection: ExternalConnection, storageService: StorageService, salesforceService: SalesforceService, logger: Logger): void;
    private constructor();
    dispose(): void;
}
//# sourceMappingURL=FieldMapperPanel.d.ts.map