import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	IRequestOptions,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Library Name or ID',
		name: 'repo',
		type: 'options',
		placeholder: 'Select a Library',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getRepos',
		},
		default: '',
		description:
			'The name of SeaTable library to access. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Folder Path',
		name: 'folder_path',
		type: 'options',
		placeholder: '/invoices/2024/',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getFoldersInRepo',
			loadOptionsDependsOn: ['repo'],
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Provide the target path. Choose from the list, or specify the complete path using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		hint: 'The folder, along with all files and subfolders within it, will be moved to the trash',
	},
];

const displayOptions = {
	show: {
		resource: ['folders'],
		operation: ['remove'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	// get parameters
	const repo = this.getNodeParameter('repo', index) as string;
	const folder_path = this.getNodeParameter('folder_path', index) as string;

	if (folder_path == '/') {
		return this.helpers.returnJsonArray([{ error: '/ is not allowed' }] as IDataObject[]);
	} else if (!folder_path.startsWith('/')) {
		return this.helpers.returnJsonArray([{ error: 'Path has to start with /' }] as IDataObject[]);
	} else {
		const options: IRequestOptions = {
			method: 'DELETE',
			body: {},
			uri: `${baseURL}/api2/repos/${repo}/dir/?p=${folder_path}` as string,
			json: true,
		};

		const responseData = await this.helpers.requestWithAuthentication.call(
			this,
			'seafileApi',
			options,
		);

		if (responseData == 'success') {
			return this.helpers.returnJsonArray([{ status: 'success' }] as IDataObject[]);
		}
		return this.helpers.returnJsonArray([{ status: 'unknown' }] as IDataObject[]);
	}
}