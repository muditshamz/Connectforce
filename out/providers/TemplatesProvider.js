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
exports.TemplateTreeItem = exports.TemplatesProvider = void 0;
const vscode = __importStar(require("vscode"));
class TemplatesProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.templates = this.initializeTemplates();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show template categories
            return [
                new TemplateTreeItem('ERP Systems', 'category', vscode.TreeItemCollapsibleState.Expanded, undefined, 'Enterprise Resource Planning'),
                new TemplateTreeItem('Marketing Platforms', 'category', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'Marketing Automation'),
                new TemplateTreeItem('E-Commerce', 'category', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'Online Store Platforms'),
                new TemplateTreeItem('Communication', 'category', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'Messaging & Email'),
                new TemplateTreeItem('Custom API', 'category', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'Build from scratch')
            ];
        }
        // Category level - show templates in category
        const categoryTemplates = this.getTemplatesByCategory(element.label);
        return categoryTemplates.map(template => new TemplateTreeItem(template.name, 'template', vscode.TreeItemCollapsibleState.None, template, template.description));
    }
    getAllTemplates() {
        return this.templates;
    }
    getTemplateByType(type) {
        return this.templates.find(t => t.name === type || t.erpType === type);
    }
    getTemplatesByCategory(category) {
        const categoryMap = {
            'ERP Systems': ['NetSuite', 'SAP', 'Dynamics365', 'Acumatica', 'QuickBooks', 'Xero'],
            'Marketing Platforms': [],
            'E-Commerce': [],
            'Communication': [],
            'Custom API': ['Custom']
        };
        const types = categoryMap[category] || [];
        return this.templates.filter(t => types.includes(t.erpType));
    }
    initializeTemplates() {
        return [
            // NetSuite Template
            {
                id: 'netsuite',
                name: 'NetSuite',
                erpType: 'NetSuite',
                description: 'Oracle NetSuite ERP integration with REST/SuiteTalk APIs',
                icon: 'database',
                authType: 'OAuth2',
                documentationUrl: 'https://docs.oracle.com/en/cloud/saas/netsuite/',
                defaultEndpoints: [
                    {
                        id: 'ns-customers',
                        name: 'Get Customers',
                        description: 'Retrieve customer records from NetSuite',
                        path: '/services/rest/record/v1/customer',
                        method: 'GET',
                        parameters: [
                            { name: 'limit', in: 'query', required: false, type: 'integer', description: 'Maximum records to return' },
                            { name: 'offset', in: 'query', required: false, type: 'integer', description: 'Starting record offset' },
                            { name: 'q', in: 'query', required: false, type: 'string', description: 'Search query' }
                        ],
                        responseSchema: {
                            type: 'object',
                            properties: {
                                items: { type: 'array', items: { type: 'object' } },
                                totalResults: { type: 'integer' },
                                count: { type: 'integer' }
                            }
                        }
                    },
                    {
                        id: 'ns-customer-by-id',
                        name: 'Get Customer by ID',
                        description: 'Retrieve a specific customer record',
                        path: '/services/rest/record/v1/customer/{id}',
                        method: 'GET',
                        parameters: [
                            { name: 'id', in: 'path', required: true, type: 'string', description: 'Customer internal ID' }
                        ]
                    },
                    {
                        id: 'ns-create-customer',
                        name: 'Create Customer',
                        description: 'Create a new customer in NetSuite',
                        path: '/services/rest/record/v1/customer',
                        method: 'POST',
                        requestBody: {
                            type: 'object',
                            properties: {
                                companyName: { type: 'string', required: true },
                                email: { type: 'string' },
                                phone: { type: 'string' },
                                subsidiary: { type: 'object' }
                            }
                        }
                    },
                    {
                        id: 'ns-sales-orders',
                        name: 'Get Sales Orders',
                        description: 'Retrieve sales orders from NetSuite',
                        path: '/services/rest/record/v1/salesOrder',
                        method: 'GET',
                        parameters: [
                            { name: 'limit', in: 'query', required: false, type: 'integer' },
                            { name: 'offset', in: 'query', required: false, type: 'integer' }
                        ]
                    },
                    {
                        id: 'ns-invoices',
                        name: 'Get Invoices',
                        description: 'Retrieve invoices from NetSuite',
                        path: '/services/rest/record/v1/invoice',
                        method: 'GET',
                        parameters: [
                            { name: 'limit', in: 'query', required: false, type: 'integer' }
                        ]
                    }
                ],
                defaultMappings: [
                    {
                        name: 'Account to Customer',
                        salesforceObject: 'Account',
                        externalEntity: 'customer',
                        syncDirection: 'bidirectional'
                    }
                ]
            },
            // SAP Template
            {
                id: 'sap',
                name: 'SAP',
                erpType: 'SAP',
                description: 'SAP S/4HANA and ECC integration via OData APIs',
                icon: 'server',
                authType: 'OAuth2',
                documentationUrl: 'https://api.sap.com/',
                defaultEndpoints: [
                    {
                        id: 'sap-business-partners',
                        name: 'Get Business Partners',
                        description: 'Retrieve business partner master data',
                        path: '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner',
                        method: 'GET',
                        parameters: [
                            { name: '$top', in: 'query', required: false, type: 'integer' },
                            { name: '$skip', in: 'query', required: false, type: 'integer' },
                            { name: '$filter', in: 'query', required: false, type: 'string' }
                        ]
                    },
                    {
                        id: 'sap-sales-orders',
                        name: 'Get Sales Orders',
                        description: 'Retrieve sales orders from SAP',
                        path: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder',
                        method: 'GET',
                        parameters: [
                            { name: '$top', in: 'query', required: false, type: 'integer' },
                            { name: '$filter', in: 'query', required: false, type: 'string' }
                        ]
                    },
                    {
                        id: 'sap-products',
                        name: 'Get Products',
                        description: 'Retrieve product master data',
                        path: '/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product',
                        method: 'GET',
                        parameters: [
                            { name: '$top', in: 'query', required: false, type: 'integer' }
                        ]
                    }
                ],
                defaultMappings: [
                    {
                        name: 'Account to Business Partner',
                        salesforceObject: 'Account',
                        externalEntity: 'A_BusinessPartner',
                        syncDirection: 'bidirectional'
                    }
                ]
            },
            // Microsoft Dynamics 365 Template
            {
                id: 'dynamics365',
                name: 'Dynamics 365',
                erpType: 'Dynamics365',
                description: 'Microsoft Dynamics 365 Finance & Operations integration',
                icon: 'organization',
                authType: 'OAuth2',
                documentationUrl: 'https://docs.microsoft.com/en-us/dynamics365/',
                defaultEndpoints: [
                    {
                        id: 'd365-accounts',
                        name: 'Get Accounts',
                        description: 'Retrieve accounts from Dynamics 365',
                        path: '/api/data/v9.2/accounts',
                        method: 'GET',
                        parameters: [
                            { name: '$top', in: 'query', required: false, type: 'integer' },
                            { name: '$filter', in: 'query', required: false, type: 'string' },
                            { name: '$select', in: 'query', required: false, type: 'string' }
                        ]
                    },
                    {
                        id: 'd365-contacts',
                        name: 'Get Contacts',
                        description: 'Retrieve contacts from Dynamics 365',
                        path: '/api/data/v9.2/contacts',
                        method: 'GET',
                        parameters: [
                            { name: '$top', in: 'query', required: false, type: 'integer' },
                            { name: '$filter', in: 'query', required: false, type: 'string' }
                        ]
                    },
                    {
                        id: 'd365-opportunities',
                        name: 'Get Opportunities',
                        description: 'Retrieve opportunities from Dynamics 365',
                        path: '/api/data/v9.2/opportunities',
                        method: 'GET',
                        parameters: [
                            { name: '$top', in: 'query', required: false, type: 'integer' }
                        ]
                    }
                ],
                defaultMappings: [
                    {
                        name: 'Account Sync',
                        salesforceObject: 'Account',
                        externalEntity: 'accounts',
                        syncDirection: 'bidirectional'
                    }
                ]
            },
            // Acumatica Template
            {
                id: 'acumatica',
                name: 'Acumatica',
                erpType: 'Acumatica',
                description: 'Acumatica Cloud ERP REST API integration',
                icon: 'cloud',
                authType: 'OAuth2',
                documentationUrl: 'https://help.acumatica.com/',
                defaultEndpoints: [
                    {
                        id: 'acum-customers',
                        name: 'Get Customers',
                        description: 'Retrieve customers from Acumatica',
                        path: '/entity/Default/20.200.001/Customer',
                        method: 'GET',
                        parameters: [
                            { name: '$top', in: 'query', required: false, type: 'integer' },
                            { name: '$filter', in: 'query', required: false, type: 'string' }
                        ]
                    },
                    {
                        id: 'acum-sales-orders',
                        name: 'Get Sales Orders',
                        description: 'Retrieve sales orders from Acumatica',
                        path: '/entity/Default/20.200.001/SalesOrder',
                        method: 'GET',
                        parameters: [
                            { name: '$top', in: 'query', required: false, type: 'integer' }
                        ]
                    }
                ],
                defaultMappings: []
            },
            // QuickBooks Template
            {
                id: 'quickbooks',
                name: 'QuickBooks',
                erpType: 'QuickBooks',
                description: 'Intuit QuickBooks Online API integration',
                icon: 'credit-card',
                authType: 'OAuth2',
                documentationUrl: 'https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/account',
                defaultEndpoints: [
                    {
                        id: 'qb-customers',
                        name: 'Get Customers',
                        description: 'Query customers from QuickBooks',
                        path: '/v3/company/{realmId}/query',
                        method: 'GET',
                        parameters: [
                            { name: 'realmId', in: 'path', required: true, type: 'string' },
                            { name: 'query', in: 'query', required: true, type: 'string', defaultValue: "SELECT * FROM Customer" }
                        ]
                    },
                    {
                        id: 'qb-invoices',
                        name: 'Get Invoices',
                        description: 'Query invoices from QuickBooks',
                        path: '/v3/company/{realmId}/query',
                        method: 'GET',
                        parameters: [
                            { name: 'realmId', in: 'path', required: true, type: 'string' },
                            { name: 'query', in: 'query', required: true, type: 'string', defaultValue: "SELECT * FROM Invoice" }
                        ]
                    },
                    {
                        id: 'qb-create-customer',
                        name: 'Create Customer',
                        description: 'Create a customer in QuickBooks',
                        path: '/v3/company/{realmId}/customer',
                        method: 'POST',
                        parameters: [
                            { name: 'realmId', in: 'path', required: true, type: 'string' }
                        ],
                        requestBody: {
                            type: 'object',
                            properties: {
                                DisplayName: { type: 'string', required: true },
                                PrimaryEmailAddr: { type: 'object', properties: { Address: { type: 'string' } } },
                                PrimaryPhone: { type: 'object', properties: { FreeFormNumber: { type: 'string' } } }
                            }
                        }
                    }
                ],
                defaultMappings: [
                    {
                        name: 'Account to Customer',
                        salesforceObject: 'Account',
                        externalEntity: 'Customer',
                        syncDirection: 'bidirectional'
                    }
                ]
            },
            // Xero Template
            {
                id: 'xero',
                name: 'Xero',
                erpType: 'Xero',
                description: 'Xero Accounting API integration',
                icon: 'graph',
                authType: 'OAuth2',
                documentationUrl: 'https://developer.xero.com/documentation/api/accounting/overview',
                defaultEndpoints: [
                    {
                        id: 'xero-contacts',
                        name: 'Get Contacts',
                        description: 'Retrieve contacts from Xero',
                        path: '/api.xro/2.0/Contacts',
                        method: 'GET',
                        parameters: [
                            { name: 'page', in: 'query', required: false, type: 'integer' },
                            { name: 'where', in: 'query', required: false, type: 'string' }
                        ]
                    },
                    {
                        id: 'xero-invoices',
                        name: 'Get Invoices',
                        description: 'Retrieve invoices from Xero',
                        path: '/api.xro/2.0/Invoices',
                        method: 'GET',
                        parameters: [
                            { name: 'page', in: 'query', required: false, type: 'integer' }
                        ]
                    },
                    {
                        id: 'xero-create-contact',
                        name: 'Create Contact',
                        description: 'Create a contact in Xero',
                        path: '/api.xro/2.0/Contacts',
                        method: 'POST',
                        requestBody: {
                            type: 'object',
                            properties: {
                                Name: { type: 'string', required: true },
                                EmailAddress: { type: 'string' },
                                FirstName: { type: 'string' },
                                LastName: { type: 'string' }
                            }
                        }
                    }
                ],
                defaultMappings: [
                    {
                        name: 'Account to Contact',
                        salesforceObject: 'Account',
                        externalEntity: 'Contacts',
                        syncDirection: 'bidirectional'
                    }
                ]
            },
            // Custom API Template
            {
                id: 'custom',
                name: 'Custom API',
                erpType: 'Custom',
                description: 'Build a custom API integration from scratch',
                icon: 'code',
                authType: 'None',
                documentationUrl: '',
                defaultEndpoints: [],
                defaultMappings: []
            }
        ];
    }
}
exports.TemplatesProvider = TemplatesProvider;
class TemplateTreeItem extends vscode.TreeItem {
    constructor(label, type, collapsibleState, template, description) {
        super(label, collapsibleState);
        this.label = label;
        this.type = type;
        this.collapsibleState = collapsibleState;
        this.template = template;
        this.description = description;
        this.tooltip = this.buildTooltip();
        this.description = description;
        this.contextValue = type;
        this.iconPath = this.getIcon();
        if (type === 'template' && template) {
            this.command = {
                command: 'connectforce.createERPTemplate',
                title: 'Use Template',
                arguments: [template]
            };
        }
    }
    buildTooltip() {
        if (this.template) {
            return `${this.template.name}\n${this.template.description}\nAuth: ${this.template.authType}\nEndpoints: ${this.template.defaultEndpoints.length}`;
        }
        return this.label;
    }
    getIcon() {
        if (this.type === 'category') {
            return new vscode.ThemeIcon('folder');
        }
        if (this.template) {
            const iconMap = {
                'NetSuite': 'database',
                'SAP': 'server',
                'Dynamics365': 'organization',
                'Acumatica': 'cloud',
                'QuickBooks': 'credit-card',
                'Xero': 'graph',
                'Custom': 'code'
            };
            return new vscode.ThemeIcon(iconMap[this.template.erpType] || 'package');
        }
        return new vscode.ThemeIcon('package');
    }
}
exports.TemplateTreeItem = TemplateTreeItem;
//# sourceMappingURL=TemplatesProvider.js.map