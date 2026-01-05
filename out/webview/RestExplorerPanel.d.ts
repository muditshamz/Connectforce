import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';
export declare class RestExplorerPanel {
    static currentPanel: RestExplorerPanel | undefined;
    private readonly _panel;
    private _disposables;
    private logger;
    private currentOrg;
    private requestCount;
    private lastRequestTime;
    static createOrShow(extensionUri: vscode.Uri, logger: Logger): void;
    private constructor();
    private _getOrgInfo;
    private _handleMessage;
    private _getObjectFields;
    private _executeRequest;
    private _update;
    private _getHtml;
    dispose(): void;
}
//# sourceMappingURL=RestExplorerPanel.d.ts.map