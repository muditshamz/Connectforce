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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ConnectionsProvider_1 = require("./providers/ConnectionsProvider");
const FieldMappingsProvider_1 = require("./providers/FieldMappingsProvider");
const TemplatesProvider_1 = require("./providers/TemplatesProvider");
const SyncStatusProvider_1 = require("./providers/SyncStatusProvider");
const IntegrationBuilderPanel_1 = require("./webview/IntegrationBuilderPanel");
const FieldMapperPanel_1 = require("./webview/FieldMapperPanel");
const RestExplorerPanel_1 = require("./webview/RestExplorerPanel");
const ConnectionService_1 = require("./services/ConnectionService");
const CodeGeneratorService_1 = require("./services/CodeGeneratorService");
const OpenAPIImportService_1 = require("./services/OpenAPIImportService");
const SalesforceService_1 = require("./services/SalesforceService");
const StorageService_1 = require("./services/StorageService");
const Logger_1 = require("./utils/Logger");
let outputChannel;
let logger;
async function activate(context) {
    console.log('Connectforce is now active!');
    // Initialize output channel and logger
    outputChannel = vscode.window.createOutputChannel('Connectforce');
    logger = new Logger_1.Logger(outputChannel);
    logger.info('Extension activated');
    // Initialize services
    const storageService = new StorageService_1.StorageService(context);
    const connectionService = new ConnectionService_1.ConnectionService(storageService, logger);
    const salesforceService = new SalesforceService_1.SalesforceService(logger);
    const openAPIService = new OpenAPIImportService_1.OpenAPIImportService(logger);
    const codeGeneratorService = new CodeGeneratorService_1.CodeGeneratorService(logger);
    // Initialize tree view providers
    const connectionsProvider = new ConnectionsProvider_1.ConnectionsProvider(connectionService);
    const fieldMappingsProvider = new FieldMappingsProvider_1.FieldMappingsProvider(storageService);
    const templatesProvider = new TemplatesProvider_1.TemplatesProvider();
    const syncStatusProvider = new SyncStatusProvider_1.SyncStatusProvider(storageService);
    // Register tree views
    const connectionsTreeView = vscode.window.createTreeView('connectforce.connections', {
        treeDataProvider: connectionsProvider,
        showCollapseAll: true
    });
    const fieldMappingsTreeView = vscode.window.createTreeView('connectforce.fieldMappings', {
        treeDataProvider: fieldMappingsProvider,
        showCollapseAll: true
    });
    const templatesTreeView = vscode.window.createTreeView('connectforce.templates', {
        treeDataProvider: templatesProvider,
        showCollapseAll: true
    });
    const syncStatusTreeView = vscode.window.createTreeView('connectforce.syncStatus', {
        treeDataProvider: syncStatusProvider,
        showCollapseAll: true
    });
    // Register commands
    const commands = [
        // Open Integration Builder
        vscode.commands.registerCommand('connectforce.openBuilder', () => {
            IntegrationBuilderPanel_1.IntegrationBuilderPanel.createOrShow(context.extensionUri, connectionService, salesforceService, logger);
        }),
        // New Connection
        vscode.commands.registerCommand('connectforce.newConnection', async () => {
            const connectionTypes = ['Custom API', 'NetSuite', 'SAP', 'Dynamics 365', 'Acumatica', 'QuickBooks', 'Xero'];
            const selected = await vscode.window.showQuickPick(connectionTypes, {
                placeHolder: 'Select connection type',
                title: 'New External Connection'
            });
            if (selected) {
                if (selected === 'Custom API') {
                    IntegrationBuilderPanel_1.IntegrationBuilderPanel.createOrShow(context.extensionUri, connectionService, salesforceService, logger);
                }
                else {
                    // Use ERP template
                    const template = templatesProvider.getTemplateByType(selected);
                    if (template) {
                        IntegrationBuilderPanel_1.IntegrationBuilderPanel.createOrShow(context.extensionUri, connectionService, salesforceService, logger, template);
                    }
                }
            }
        }),
        // Import OpenAPI Spec
        vscode.commands.registerCommand('connectforce.importOpenAPI', async () => {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: {
                    'OpenAPI Specs': ['json', 'yaml', 'yml']
                },
                title: 'Select OpenAPI/Swagger Specification'
            });
            if (fileUri && fileUri[0]) {
                try {
                    const document = await vscode.workspace.openTextDocument(fileUri[0]);
                    const content = document.getText();
                    const connection = await openAPIService.importFromSpec(content);
                    await connectionService.saveConnection(connection);
                    connectionsProvider.refresh();
                    vscode.window.showInformationMessage(`Successfully imported: ${connection.name}`);
                    logger.info(`Imported OpenAPI spec: ${connection.name}`);
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to import OpenAPI spec: ${error.message}`);
                    logger.error(`Failed to import OpenAPI spec: ${error.message}`);
                }
            }
        }),
        // Generate Apex
        vscode.commands.registerCommand('connectforce.generateApex', async (item) => {
            let connection;
            if (item && item.connectionId) {
                connection = await connectionService.getConnection(item.connectionId);
            }
            else {
                const connections = await connectionService.getAllConnections();
                if (connections.length === 0) {
                    vscode.window.showWarningMessage('No connections found. Create a connection first.');
                    return;
                }
                const selected = await vscode.window.showQuickPick(connections.map(c => ({ label: c.name, description: c.baseUrl, connection: c })), { placeHolder: 'Select a connection' });
                if (selected) {
                    connection = selected.connection;
                }
            }
            if (connection) {
                try {
                    const config = vscode.workspace.getConfiguration('connectforce');
                    const generatedFiles = await codeGeneratorService.generateApexClasses(connection, {
                        generateTestClass: config.get('generateTestClasses', true),
                        generateMockService: config.get('enableMockServices', true),
                        includeComments: true,
                        useBulkAPI: false,
                        asyncProcessing: true,
                        errorHandling: 'advanced',
                        namingConvention: 'PascalCase',
                        outputPath: config.get('apexOutputPath', 'force-app/main/default/classes')
                    });
                    // Write files
                    for (const file of generatedFiles) {
                        await codeGeneratorService.writeGeneratedFile(file);
                    }
                    vscode.window.showInformationMessage(`Generated ${generatedFiles.length} files for ${connection.name}`);
                    logger.info(`Generated Apex classes for: ${connection.name}`);
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to generate Apex: ${error.message}`);
                    logger.error(`Failed to generate Apex: ${error.message}`);
                }
            }
        }),
        // Create Named Credential
        vscode.commands.registerCommand('connectforce.createNamedCredential', async (item) => {
            let connection;
            if (item && item.connectionId) {
                connection = await connectionService.getConnection(item.connectionId);
            }
            else {
                const connections = await connectionService.getAllConnections();
                const selected = await vscode.window.showQuickPick(connections.map(c => ({ label: c.name, description: c.baseUrl, connection: c })), { placeHolder: 'Select a connection' });
                if (selected) {
                    connection = selected.connection;
                }
            }
            if (connection) {
                try {
                    const file = await codeGeneratorService.generateNamedCredential(connection);
                    await codeGeneratorService.writeGeneratedFile(file);
                    vscode.window.showInformationMessage(`Created Named Credential: ${connection.name}`);
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to create Named Credential: ${error.message}`);
                }
            }
        }),
        // Create External Service
        vscode.commands.registerCommand('connectforce.createExternalService', async (item) => {
            let connection;
            if (item && item.connectionId) {
                connection = await connectionService.getConnection(item.connectionId);
            }
            else {
                const connections = await connectionService.getAllConnections();
                const selected = await vscode.window.showQuickPick(connections.map(c => ({ label: c.name, description: c.baseUrl, connection: c })), { placeHolder: 'Select a connection' });
                if (selected) {
                    connection = selected.connection;
                }
            }
            if (connection) {
                try {
                    const files = await codeGeneratorService.generateExternalService(connection);
                    for (const file of files) {
                        await codeGeneratorService.writeGeneratedFile(file);
                    }
                    vscode.window.showInformationMessage(`Created External Service: ${connection.name}`);
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to create External Service: ${error.message}`);
                }
            }
        }),
        // Test Connection
        vscode.commands.registerCommand('connectforce.testConnection', async (item) => {
            let connection;
            if (item && item.connectionId) {
                connection = await connectionService.getConnection(item.connectionId);
            }
            if (connection) {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Testing connection: ${connection.name}`,
                    cancellable: false
                }, async () => {
                    try {
                        const result = await connectionService.testConnection(connection);
                        if (result.success) {
                            vscode.window.showInformationMessage(`✅ Connection successful! Response time: ${result.responseTime}ms`);
                        }
                        else {
                            vscode.window.showErrorMessage(`❌ Connection failed: ${result.error}`);
                        }
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`Connection test failed: ${error.message}`);
                    }
                });
            }
        }),
        // Open Field Mapper
        vscode.commands.registerCommand('connectforce.openFieldMapper', async (item) => {
            let connection;
            if (item && item.connectionId) {
                connection = await connectionService.getConnection(item.connectionId);
            }
            else {
                const connections = await connectionService.getAllConnections();
                const selected = await vscode.window.showQuickPick(connections.map(c => ({ label: c.name, description: c.baseUrl, connection: c })), { placeHolder: 'Select a connection for field mapping' });
                if (selected) {
                    connection = selected.connection;
                }
            }
            if (connection) {
                FieldMapperPanel_1.FieldMapperPanel.createOrShow(context.extensionUri, connection, storageService, salesforceService, logger);
            }
        }),
        // Refresh Connections
        vscode.commands.registerCommand('connectforce.refreshConnections', () => {
            connectionsProvider.refresh();
            vscode.window.showInformationMessage('Connections refreshed');
        }),
        // Deploy to Org
        vscode.commands.registerCommand('connectforce.deployToOrg', async () => {
            const terminal = vscode.window.createTerminal('Salesforce Deploy');
            terminal.show();
            terminal.sendText('sf project deploy start --source-dir force-app');
        }),
        // View Integration Logs
        vscode.commands.registerCommand('connectforce.viewIntegrationLogs', () => {
            outputChannel.show();
        }),
        // Create from ERP Template
        vscode.commands.registerCommand('connectforce.createERPTemplate', async () => {
            const templates = templatesProvider.getAllTemplates();
            const selected = await vscode.window.showQuickPick(templates.map(t => ({
                label: t.name,
                description: t.description,
                detail: `Auth: ${t.authType}`,
                template: t
            })), {
                placeHolder: 'Select an ERP template',
                title: 'Create from ERP Template'
            });
            if (selected) {
                IntegrationBuilderPanel_1.IntegrationBuilderPanel.createOrShow(context.extensionUri, connectionService, salesforceService, logger, selected.template);
            }
        }),
        // Open REST Explorer
        vscode.commands.registerCommand('connectforce.openRestExplorer', () => {
            RestExplorerPanel_1.RestExplorerPanel.createOrShow(context.extensionUri, logger);
        })
    ];
    // Register all commands
    context.subscriptions.push(...commands);
    // Register tree views
    context.subscriptions.push(connectionsTreeView, fieldMappingsTreeView, templatesTreeView, syncStatusTreeView);
    // Register output channel
    context.subscriptions.push(outputChannel);
    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome');
    if (!hasShownWelcome) {
        const action = await vscode.window.showInformationMessage('Welcome to Connectforce! Get started by creating your first connection.', 'Create Connection', 'View Tutorial');
        if (action === 'Create Connection') {
            vscode.commands.executeCommand('connectforce.newConnection');
        }
        else if (action === 'View Tutorial') {
            vscode.commands.executeCommand('workbench.action.openWalkthrough', 'connectforce.gettingStarted');
        }
        context.globalState.update('hasShownWelcome', true);
    }
    logger.info('Extension activation complete');
}
function deactivate() {
    console.log('Connectforce is now deactivated');
}
//# sourceMappingURL=extension.js.map