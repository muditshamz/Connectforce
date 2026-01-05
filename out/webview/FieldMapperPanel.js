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
exports.FieldMapperPanel = void 0;
const vscode = __importStar(require("vscode"));
class FieldMapperPanel {
    static createOrShow(extensionUri, connection, storageService, salesforceService, logger) {
        const panel = vscode.window.createWebviewPanel('fieldMapper', `Field Mapper - ${connection.name}`, vscode.ViewColumn.One, { enableScripts: true });
        FieldMapperPanel.currentPanel = new FieldMapperPanel(panel, connection, storageService, salesforceService, logger);
    }
    constructor(panel, connection, storageService, salesforceService, logger) {
        this._disposables = [];
        this._panel = panel;
        this.connection = connection;
        this.storageService = storageService;
        this.salesforceService = salesforceService;
        this.logger = logger;
        this._panel.webview.html = '<html><body><h1>Field Mapper</h1><p>Coming soon - Visual field mapping interface</p></body></html>';
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    dispose() {
        FieldMapperPanel.currentPanel = undefined;
        this._panel.dispose();
    }
}
exports.FieldMapperPanel = FieldMapperPanel;
//# sourceMappingURL=FieldMapperPanel.js.map