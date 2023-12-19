import type { Readable } from 'stream';
import type {
	IDataObject,
	IExecuteFunctions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';

export class RespondToWebhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to Webhook',
		icon: 'file:webhook.svg',
		name: 'respondToWebhook',
		group: ['transform'],
		version: 1,
		description: 'Returns data for Webhook',
		defaults: {
			name: 'Respond to Webhook',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Respond With',
				name: 'respondWith',
				type: 'options',
				options: [
					{
						name: 'Binary',
						value: 'binary',
					},
					{
						name: 'First Incoming Item',
						value: 'firstIncomingItem',
					},
					{
						name: 'JSON',
						value: 'json',
					},
					{
						name: 'No Data',
						value: 'noData',
					},
					{
						name: 'Redirect',
						value: 'redirect',
					},
					{
						name: 'Text',
						value: 'text',
					},
				],
				default: 'firstIncomingItem',
				description: 'The data that should be returned',
			},
			{
				displayName:
					'When using expressions, note that this node will only run for the first item in the input data.',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						respondWith: ['json', 'text'],
					},
				},
				default: '',
			},
			{
				displayName: 'Redirect URL',
				name: 'redirectURL',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						respondWith: ['redirect'],
					},
				},
				default: '',
				placeholder: 'e.g. http://www.n8n.io',
				description: 'The URL to redirect to',
				validateType: 'url',
			},
			{
				displayName: 'Response Body',
				name: 'responseBody',
				type: 'json',
				displayOptions: {
					show: {
						respondWith: ['json'],
					},
				},
				default: '{ "key": "value" }',
				typeOptions: {
					editor: 'json',
					editorLanguage: 'json',
					rows: 2,
				},
				description: 'The HTTP Response JSON data',
			},
			{
				displayName: 'Response Body',
				name: 'responseBody',
				type: 'string',
				displayOptions: {
					show: {
						respondWith: ['text'],
					},
				},
				default: '',
				placeholder: 'e.g. Workflow started',
				description: 'The HTTP Response text data',
			},
			{
				displayName: 'Response Data Source',
				name: 'responseDataSource',
				type: 'options',
				displayOptions: {
					show: {
						respondWith: ['binary'],
					},
				},
				options: [
					{
						name: 'Choose Automatically From Input',
						value: 'automatically',
						description: 'Use if input data will contain a single piece of binary data',
					},
					{
						name: 'Specify Myself',
						value: 'set',
						description: 'Enter the name of the input field the binary data will be in',
					},
				],
				default: 'automatically',
			},
			{
				displayName: 'Input Field Name',
				name: 'inputFieldName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						respondWith: ['binary'],
						responseDataSource: ['set'],
					},
				},
				description: 'The name of the node input field with the binary data',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Response Code',
						name: 'responseCode',
						type: 'number',
						typeOptions: {
							minValue: 100,
							maxValue: 599,
						},
						default: 200,
						description: 'The HTTP Response code to return. Defaults to 200.',
					},
					{
						displayName: 'Response Headers',
						name: 'responseHeaders',
						placeholder: 'Add Response Header',
						description: 'Add headers to the webhook response',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'entries',
								displayName: 'Entries',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the header',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the header',
									},
								],
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const respondWith = this.getNodeParameter('respondWith', 0) as string;
		const options = this.getNodeParameter('options', 0, {});

		const headers = {} as IDataObject;
		if (options.responseHeaders) {
			for (const header of (options.responseHeaders as IDataObject).entries as IDataObject[]) {
				if (typeof header.name !== 'string') {
					header.name = header.name?.toString();
				}
				headers[header.name?.toLowerCase() as string] = header.value?.toString();
			}
		}

		let statusCode = (options.responseCode as number) || 200;
		let responseBody: IN8nHttpResponse | Readable;
		if (respondWith === 'json') {
			const responseBodyParameter = this.getNodeParameter('responseBody', 0) as string;
			if (responseBodyParameter) {
				if (typeof responseBodyParameter === 'object') {
					responseBody = responseBodyParameter;
				} else {
					responseBody = jsonParse(responseBodyParameter, {
						errorMessage: "Invalid JSON in 'Response Body' field",
					});
				}
			}
		} else if (respondWith === 'firstIncomingItem') {
			responseBody = items[0].json;
		} else if (respondWith === 'text') {
			responseBody = this.getNodeParameter('responseBody', 0) as string;
		} else if (respondWith === 'binary') {
			const item = items[0];

			if (item.binary === undefined) {
				throw new NodeOperationError(this.getNode(), 'No binary data exists on the first item!');
			}

			let responseBinaryPropertyName: string;

			const responseDataSource = this.getNodeParameter('responseDataSource', 0) as string;

			if (responseDataSource === 'set') {
				responseBinaryPropertyName = this.getNodeParameter('inputFieldName', 0) as string;
			} else {
				const binaryKeys = Object.keys(item.binary);
				if (binaryKeys.length === 0) {
					throw new NodeOperationError(this.getNode(), 'No binary data exists on the first item!');
				}
				responseBinaryPropertyName = binaryKeys[0];
			}

			const binaryData = this.helpers.assertBinaryData(0, responseBinaryPropertyName);
			if (binaryData.id) {
				responseBody = { binaryData };
			} else {
				responseBody = Buffer.from(binaryData.data, BINARY_ENCODING);
				headers['content-length'] = (responseBody as Buffer).length;
			}

			if (!headers['content-type']) {
				headers['content-type'] = binaryData.mimeType;
			}
		} else if (respondWith == 'redirect') {
			headers.location = this.getNodeParameter('redirectURL', 0) as string;
			statusCode = (options.responseCode as number) ?? 307;
		} else if (respondWith !== 'noData') {
			throw new NodeOperationError(
				this.getNode(),
				`The Response Data option "${respondWith}" is not supported!`,
			);
		}

		const response: IN8nHttpFullResponse = {
			body: responseBody,
			headers,
			statusCode,
		};

		this.sendResponse(response);

		return [items];
	}
}
