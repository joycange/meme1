import {
	INodeProperties,
} from 'n8n-workflow';

export const clientOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a client',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a client',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a client',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all clients',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a client',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const clientFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 client:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of client being created.',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		description: 'Address of client being created.',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'create',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 client:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'workspaceId',
			],
			loadOptionsMethod: 'loadClientsForWorkspace',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 client:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'workspaceId',
			],
			loadOptionsMethod: 'loadClientsForWorkspace',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'get',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 client:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'client',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'client',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sort Order',
				name: 'sort-order',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'ASCENDING',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
					},
				],
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 client:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'workspaceId',
			],
			loadOptionsMethod: 'loadClientsForWorkspace',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		description: 'Address of client being created.',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Archived',
		name: 'archived',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'update',
				],
			},
		},
	},

];
