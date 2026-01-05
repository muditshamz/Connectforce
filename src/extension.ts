import * as vscode from 'vscode';
import { ConnectionsProvider } from './providers/ConnectionsProvider';
import { FieldMappingsProvider } from './providers/FieldMappingsProvider';
import { TemplatesProvider } from './providers/TemplatesProvider';
import { SyncStatusProvider } from './providers/SyncStatusProvider';
import { IntegrationBuilderPanel } from './webview/IntegrationBuilderPanel';
import { FieldMapperPanel } from './webview/FieldMapperPanel';
import { RestExplorerPanel } from './webview/RestExplorerPanel';
import { ConnectionService } from './services/ConnectionService';
import { CodeGeneratorService } from './services/CodeGeneratorService';
import { OpenAPIImportService } from './services/OpenAPIImportService';
import { SalesforceService } from './services/SalesforceService';
import { StorageService } from './services/StorageService';
import { Logger } from './utils/Logger';
import { ExternalConnection, FieldMapping } from './types';

let outputChannel: vscode.OutputChannel;
let logger: Logger;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Connectforce is now active!');

    // Initialize output channel and logger
    outputChannel = vscode.window.createOutputChannel('Connectforce');
    logger = new Logger(outputChannel);
    logger.info('Extension activated');

    // Initialize services
    const storageService = new StorageService(context);
    const connectionService = new ConnectionService(storageService, logger);
    const salesforceService = new SalesforceService(logger);
    const openAPIService = new OpenAPIImportService(logger);
    const codeGeneratorService = new CodeGeneratorService(logger);

    // Initialize tree view providers
    const connectionsProvider = new ConnectionsProvider(connectionService);
    const fieldMappingsProvider = new FieldMappingsProvider(storageService);
    const templatesProvider = new TemplatesProvider();
    const syncStatusProvider = new SyncStatusProvider(storageService);

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
            IntegrationBuilderPanel.createOrShow(context.extensionUri, connectionService, salesforceService, logger);
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
                    IntegrationBuilderPanel.createOrShow(context.extensionUri, connectionService, salesforceService, logger);
                } else {
                    // Use ERP template
                    const template = templatesProvider.getTemplateByType(selected);
                    if (template) {
                        IntegrationBuilderPanel.createOrShow(context.extensionUri, connectionService, salesforceService, logger, template);
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
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to import OpenAPI spec: ${error.message}`);
                    logger.error(`Failed to import OpenAPI spec: ${error.message}`);
                }
            }
        }),

        // Generate Apex
        vscode.commands.registerCommand('connectforce.generateApex', async (item?: any) => {
            let connection: ExternalConnection | undefined;

            if (item && item.connectionId) {
                connection = await connectionService.getConnection(item.connectionId);
            } else {
                const connections = await connectionService.getAllConnections();
                if (connections.length === 0) {
                    vscode.window.showWarningMessage('No connections found. Create a connection first.');
                    return;
                }

                const selected = await vscode.window.showQuickPick(
                    connections.map(c => ({ label: c.name, description: c.baseUrl, connection: c })),
                    { placeHolder: 'Select a connection' }
                );

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

                    vscode.window.showInformationMessage(
                        `Generated ${generatedFiles.length} files for ${connection.name}`
                    );
                    logger.info(`Generated Apex classes for: ${connection.name}`);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to generate Apex: ${error.message}`);
                    logger.error(`Failed to generate Apex: ${error.message}`);
                }
            }
        }),

        // Create Named Credential
        vscode.commands.registerCommand('connectforce.createNamedCredential', async (item?: any) => {
            let connection: ExternalConnection | undefined;

            if (item && item.connectionId) {
                connection = await connectionService.getConnection(item.connectionId);
            } else {
                const connections = await connectionService.getAllConnections();
                const selected = await vscode.window.showQuickPick(
                    connections.map(c => ({ label: c.name, description: c.baseUrl, connection: c })),
                    { placeHolder: 'Select a connection' }
                );
                if (selected) {
                    connection = selected.connection;
                }
            }

            if (connection) {
                try {
                    const file = await codeGeneratorService.generateNamedCredential(connection);
                    await codeGeneratorService.writeGeneratedFile(file);
                    vscode.window.showInformationMessage(`Created Named Credential: ${connection.name}`);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to create Named Credential: ${error.message}`);
                }
            }
        }),

        // Create External Service
        vscode.commands.registerCommand('connectforce.createExternalService', async (item?: any) => {
            let connection: ExternalConnection | undefined;

            if (item && item.connectionId) {
                connection = await connectionService.getConnection(item.connectionId);
            } else {
                const connections = await connectionService.getAllConnections();
                const selected = await vscode.window.showQuickPick(
                    connections.map(c => ({ label: c.name, description: c.baseUrl, connection: c })),
                    { placeHolder: 'Select a connection' }
                );
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
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to create External Service: ${error.message}`);
                }
            }
        }),

        // Test Connection
        vscode.commands.registerCommand('connectforce.testConnection', async (item?: any) => {
            let connection: ExternalConnection | undefined;

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
                        const result = await connectionService.testConnection(connection!);
                        if (result.success) {
                            vscode.window.showInformationMessage(
                                `✅ Connection successful! Response time: ${result.responseTime}ms`
                            );
                        } else {
                            vscode.window.showErrorMessage(
                                `❌ Connection failed: ${result.error}`
                            );
                        }
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Connection test failed: ${error.message}`);
                    }
                });
            }
        }),

        // Open Field Mapper
        vscode.commands.registerCommand('connectforce.openFieldMapper', async (item?: any) => {
            let connection: ExternalConnection | undefined;

            if (item && item.connectionId) {
                connection = await connectionService.getConnection(item.connectionId);
            } else {
                const connections = await connectionService.getAllConnections();
                const selected = await vscode.window.showQuickPick(
                    connections.map(c => ({ label: c.name, description: c.baseUrl, connection: c })),
                    { placeHolder: 'Select a connection for field mapping' }
                );
                if (selected) {
                    connection = selected.connection;
                }
            }

            if (connection) {
                FieldMapperPanel.createOrShow(
                    context.extensionUri, 
                    connection, 
                    storageService, 
                    salesforceService, 
                    logger
                );
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
            const selected = await vscode.window.showQuickPick(
                templates.map(t => ({ 
                    label: t.name, 
                    description: t.description,
                    detail: `Auth: ${t.authType}`,
                    template: t 
                })),
                { 
                    placeHolder: 'Select an ERP template',
                    title: 'Create from ERP Template'
                }
            );

            if (selected) {
                IntegrationBuilderPanel.createOrShow(
                    context.extensionUri, 
                    connectionService, 
                    salesforceService, 
                    logger,
                    selected.template
                );
            }
        }),

        // Open REST Explorer
        vscode.commands.registerCommand('connectforce.openRestExplorer', () => {
            RestExplorerPanel.createOrShow(context.extensionUri, logger);
        })
    ];

    // Register all commands
    context.subscriptions.push(...commands);

    // Register tree views
    context.subscriptions.push(
        connectionsTreeView,
        fieldMappingsTreeView,
        templatesTreeView,
        syncStatusTreeView
    );

    // Register output channel
    context.subscriptions.push(outputChannel);

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome');
    if (!hasShownWelcome) {
        const action = await vscode.window.showInformationMessage(
            'Welcome to Connectforce! Get started by creating your first connection.',
            'Create Connection',
            'View Tutorial'
        );

        if (action === 'Create Connection') {
            vscode.commands.executeCommand('connectforce.newConnection');
        } else if (action === 'View Tutorial') {
            vscode.commands.executeCommand('workbench.action.openWalkthrough', 'connectforce.gettingStarted');
        }

        context.globalState.update('hasShownWelcome', true);
    }

    logger.info('Extension activation complete');
}

export function deactivate() {
    console.log('Connectforce is now deactivated');
}
