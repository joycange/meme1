import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';
import { searchSchema, searchTables } from './Postgres.node.functions';

export class PostgresTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postgres Trigger',
		name: 'postgresTrigger',
		icon: 'file:postgres.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens to Postgres messages',
		defaults: {
			name: 'Postgres Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'postgres',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Trigger Mode',
				name: 'triggerMode',
				type: 'options',
				options: [
					{
						name: 'Listen and Create Trigger Rule',
						value: 'createTrigger',
						description: 'Create a trigger rule and listen to it',
					},
					{
						name: 'Listen to Channel',
						value: 'listenTrigger',
						description: 'Receive real-time notifications from a channel',
					},
				],
				default: 'createTrigger',
			},
			{
				displayName: 'Schema Name',
				name: 'schemaName',
				type: 'resourceLocator',
				default: { mode: 'list', value: 'public' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a schema',
						typeOptions: {
							searchListMethod: 'searchSchema',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. public',
					},
				],
			},
			{
				displayName: 'Channel Name',
				name: 'channelName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. n8n_channel',
				description: 'Name of the channel to listen to',
				displayOptions: {
					show: {
						triggerMode: ['listenTrigger'],
					},
				},
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the table to listen to',
				displayOptions: {
					show: {
						triggerMode: ['createTrigger'],
					},
				},
			},
			{
				displayName: 'Events to Listen To',
				name: 'firesOn',
				type: 'options',
				displayOptions: {
					show: {
						triggerMode: ['createTrigger'],
					},
				},
				options: [
					{
						name: 'Insert',
						value: 'INSERT',
					},
					{
						name: 'Update',
						value: 'UPDATE',
					},
					{
						name: 'Delete',
						value: 'DELETE',
					},
				],
				default: 'INSERT',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						triggerMode: ['createTrigger'],
					},
				},
				options: [
					{
						displayName: 'Channel Name',
						name: 'channelName',
						type: 'string',
						placeholder: 'e.g. n8n_channel',
						description: 'Name of the channel to listen to',
						default: '',
					},

					{
						displayName: 'Function Name',
						name: 'functionName',
						type: 'string',
						description: 'Name of the function to create',
						placeholder: 'e.g. n8n_trigger_function()',
						default: '',
					},
					{
						displayName: 'Replace if Exists',
						name: 'replaceIfExists',
						type: 'boolean',
						description: 'Whether to replace an existing function and trigger with the same name',
						default: false,
					},
					{
						displayName: 'Trigger Name',
						name: 'triggerName',
						type: 'string',
						description: 'Name of the trigger to create',
						placeholder: 'e.g. n8n_trigger',
						default: '',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			searchSchema,
			searchTables,
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('postgres');
		const triggerMode = this.getNodeParameter('triggerMode', 0) as string;
		const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
		const pgp = pgPromise();

		const config: IDataObject = {
			host: credentials.host as string,
			port: credentials.port as number,
			database: credentials.database as string,
			user: credentials.user as string,
			password: credentials.password as string,
		};

		if (credentials.allowUnauthorizedCerts === true) {
			config.ssl = {
				rejectUnauthorized: false,
			};
		} else {
			config.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
			config.sslmode = (credentials.ssl as string) || 'disable';
		}

		const db = pgp(config);
		if (triggerMode === 'createTrigger') {
			//	await pgTriggerFunction.call(this, db);
		}
		const channelName =
			triggerMode === 'createTrigger'
				? additionalFields.channelName || 'n8n_channel'
				: (this.getNodeParameter('channelName', 0) as string);
		db.connect({ direct: true })
			.then(async (connection) => {
				connection.client.on('notification', async (data) => {
					this.emit([this.helpers.returnJsonArray([data])]);
				});
				return connection.none(`LISTEN ${channelName}`);
			})
			.catch(function (error) {
				console.error('Error:', error);
			});

		const startConsumer = async () => {};

		await startConsumer();

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		const closeFunction = async () => {};

		return {
			closeFunction,
		};
	}
}
