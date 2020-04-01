import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	affinityApiRequest,
	affinityApiRequestAllItems,
} from './GenericFunctions';
import {
	organizationFields,
	organizationOperations,
} from './OrganizationDescription';
import {
	personFields,
	personOperations,
} from './PersonDescription';
import {
	IOrganization,
} from './OrganizationInterface';
import {
	IPerson,
} from './PersonInterface';

import { snakeCase } from 'change-case';

export class Affinity implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Affinity',
		name: 'affinity',
		icon: 'file:affinity.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Affinity API',
		defaults: {
			name: 'Affinity',
			color: '#3343df',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'affinityApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Person',
						value: 'person',
					},
				],
				default: 'organization',
				description: 'Resource to consume.',
			},
			...organizationOperations,
			...organizationFields,
			...personOperations,
			...personFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available organizations to display them to user so that he can
			// select them easily
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const organizations = await affinityApiRequestAllItems.call(this, 'organizations', 'GET', '/organizations', {});
				for (const organization of organizations) {
					const organizationName = organization.name;
					const organizationId = organization.id;
					returnData.push({
						name: organizationName,
						value: organizationId,
					});
				}
				return returnData;
			},
			// Get all the available persons to display them to user so that he can
			// select them easily
			async getPersons(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const persons = await affinityApiRequestAllItems.call(this, 'persons', 'GET', '/persons', {});
				for (const person of persons) {
					let personName = `${person.first_name} ${person.last_name}`;
					if (person.primary_email !== null) {
						personName+= ` (${person.primary_email})`;
					}
					const personId = person.id;
					returnData.push({
						name: personName,
						value: personId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'person') {
				//https://api-docs.affinity.co/#create-a-new-person
				if (operation === 'create') {
					const firstName = this.getNodeParameter('firstName', i) as string;
					const lastName = this.getNodeParameter('lastName', i) as string;
					const emails = this.getNodeParameter('emails', i) as string[];
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IPerson = {
						first_name: firstName,
						last_name: lastName,
						emails,
					};
					if (additionalFields.organizations) {
						body.organization_ids = additionalFields.organizations as number[];
					}
					responseData = await affinityApiRequest.call(this, 'POST', '/persons', body);
				}
				//https://api-docs.affinity.co/#update-a-person
				if (operation === 'update') {
					const personId = this.getNodeParameter('personId', i) as number;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const emails = this.getNodeParameter('emails', i) as string[];
					const body: IPerson = {
						emails,
					};
					if (updateFields.firstName) {
						body.first_name = updateFields.firstName as string;
					}
					if (updateFields.lastName) {
						body.last_name = updateFields.lastName as string;
					}
					if (updateFields.organizations) {
						body.organization_ids = updateFields.organizations as number[];
					}
					responseData = await affinityApiRequest.call(this, 'PUT', `/persons/${personId}`, body);
				}
				//https://api-docs.affinity.co/#get-a-specific-person
				if (operation === 'get') {
					const personId = this.getNodeParameter('personId', i) as number;
					const options = this.getNodeParameter('options', i) as IDataObject;
					if (options.withInteractionDates) {
						qs.with_interaction_dates = options.withInteractionDates as boolean;
					}
					responseData = await affinityApiRequest.call(this,'GET', `/persons/${personId}`, {}, qs);
				}
				//https://api-docs.affinity.co/#search-for-persons
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					if (options.term) {
						qs.term = options.term as string;
					}
					if (options.withInteractionDates) {
						qs.with_interaction_dates = options.withInteractionDates as boolean;
					}
					if (returnAll === true) {
						responseData = await affinityApiRequestAllItems.call(this, 'persons', 'GET', '/persons', {}, qs);
					} else {
						qs.page_size = this.getNodeParameter('limit', i) as number;
						responseData = await affinityApiRequest.call(this, 'GET', '/persons', {}, qs);
						responseData = responseData.persons;
					}
				}
				//https://api-docs.affinity.co/#delete-a-person
				if (operation === 'delete') {
					const personId = this.getNodeParameter('personId', i) as number;
					responseData = await affinityApiRequest.call(this, 'DELETE', `/persons/${personId}`, {}, qs);
				}
			}
			if (resource === 'organization') {
				//https://api-docs.affinity.co/#create-a-new-organization
				if (operation === 'create') {
					const name = this.getNodeParameter('name', i) as string;
					const domain = this.getNodeParameter('domain', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IOrganization = {
						name,
						domain,
					};
					if (additionalFields.persons) {
						body.person_ids = additionalFields.persons as number[];
					}
					responseData = await affinityApiRequest.call(this, 'POST', '/organizations', body);
				}
				//https://api-docs.affinity.co/#update-an-organization
				if (operation === 'update') {
					const organizationId = this.getNodeParameter('organizationId', i) as number;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IOrganization = {};
					if (updateFields.name) {
						body.name = updateFields.name as string;
					}
					if (updateFields.domain) {
						body.domain = updateFields.domain as string;
					}
					if (updateFields.persons) {
						body.person_ids = updateFields.persons as number[];
					}
					responseData = await affinityApiRequest.call(this, 'PUT', `/organizations/${organizationId}`, body);
				}
				//https://api-docs.affinity.co/#get-a-specific-organization
				if (operation === 'get') {
					const organizationId = this.getNodeParameter('organizationId', i) as number;
					const options = this.getNodeParameter('options', i) as IDataObject;
					if (options.withInteractionDates) {
						qs.with_interaction_dates = options.withInteractionDates as boolean;
					}
					responseData = await affinityApiRequest.call(this,'GET', `/organizations/${organizationId}`, {}, qs);
				}
				//https://api-docs.affinity.co/#search-for-organizations
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					if (options.term) {
						qs.term = options.term as string;
					}
					if (options.withInteractionDates) {
						qs.with_interaction_dates = options.withInteractionDates as boolean;
					}
					if (returnAll === true) {
						responseData = await affinityApiRequestAllItems.call(this, 'organizations', 'GET', '/organizations', {}, qs);
					} else {
						qs.page_size = this.getNodeParameter('limit', i) as number;
						responseData = await affinityApiRequest.call(this, 'GET', '/organizations', {}, qs);
						responseData = responseData.organizations;
					}
				}
				//https://api-docs.affinity.co/#delete-an-organization
				if (operation === 'delete') {
					const organizationId = this.getNodeParameter('organizationId', i) as number;
					responseData = await affinityApiRequest.call(this, 'DELETE', `/organizations/${organizationId}`, {}, qs);
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
