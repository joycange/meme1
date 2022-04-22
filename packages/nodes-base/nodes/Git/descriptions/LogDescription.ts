import {
	INodeProperties,
} from 'n8n-workflow';

export const logFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'log',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'log',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'How many results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'log',
				],
			},
		},
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'File',
				name: 'file',
				type: 'string',
				default: 'README.md',
				description: 'The path (absolute or relative to Repository Path) of file or folder to get the history of',
			},
		],
	},
];
