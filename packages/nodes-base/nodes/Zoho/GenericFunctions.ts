import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	flow,
	sortBy,
} from 'lodash';

import {
	AllFields,
	DateType,
	IdType,
	LoadedFields,
	LocationType,
	NameType,
	ProductDetails,
	ResourceItems,
	ZohoOAuth2ApiCredentials,
} from './types';

export async function zohoApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
) {
	const { oauthTokenData } = this.getCredentials('zohoOAuth2Api') as ZohoOAuth2ApiCredentials;

	const options: OptionsWithUri = {
		body: {
			data: [
				body,
			],
		},
		method,
		qs,
		uri: uri ?? `${oauthTokenData.api_domain}/crm/v2${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		const responseData = await this.helpers.requestOAuth2?.call(this, 'zohoOAuth2Api', options);

		if (responseData === undefined) return [];

		throwOnErrorStatus.call(this, responseData);

		return responseData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an authenticated API request to Zoho CRM API and return all items.
 */
export async function zohoApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	qs.per_page = 200;
	qs.page = 0;

	do {
		responseData = await zohoApiRequest.call(this, method, endpoint, body, qs, uri);
		if (Array.isArray(responseData) && !responseData.length) return returnData;
		returnData.push(...responseData.data);
		uri = responseData.info.more_records;
		qs.page++;
	} while (
		responseData.info.more_records !== undefined &&
		responseData.info.more_records === true
	);

	return returnData;
}

/**
 * Handle a Zoho CRM API listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

	if (returnAll) {
		return await zohoApiRequestAllItems.call(this, method, endpoint, body, qs);
	}

	const responseData = await zohoApiRequestAllItems.call(this, method, endpoint, body, qs);
	const limit = this.getNodeParameter('limit', 0) as number;

	return responseData.slice(0, limit);
}

export function throwOnEmptyUpdate(this: IExecuteFunctions, resource: string) {
	throw new NodeOperationError(
		this.getNode(),
		`Please enter at least one field to update for the ${resource}.`,
	);
}

export function throwOnErrorStatus(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	responseData: { data?: Array<{ status: string, message: string }> },
) {
	if (responseData?.data?.[0].status === 'error') {
		throw new NodeOperationError(this.getNode(), responseData as Error);
	}
}

// ----------------------------------------
//        required field adjusters
// ----------------------------------------

/**
 * Place a product ID at a nested position in a product details field.
 */
export const adjustProductDetails = (productDetails: ProductDetails) => {
	return productDetails.map(p => {
		return {
			...omit('product', p),
			product: { id: p.id },
			quantity: p.quantity || 1,
		};
	});
};

// ----------------------------------------
//        additional field adjusters
// ----------------------------------------

/**
 * Place a location field's contents at the top level of the payload.
 */
const adjustLocationFields = (locationType: LocationType) => (allFields: AllFields) => {
	const locationField = allFields[locationType];

	if (!locationField) return allFields;

	return {
		...omit(locationType, allFields),
		...locationField.address_fields,
	};
};

const adjustAddressFields = adjustLocationFields('Address');
const adjustBillingAddressFields = adjustLocationFields('Billing_Address');
const adjustMailingAddressFields = adjustLocationFields('Mailing_Address');
const adjustShippingAddressFields = adjustLocationFields('Shipping_Address');
const adjustOtherAddressFields = adjustLocationFields('Other_Address');

/**
 * Remove from a date field the timestamp set by the datepicker.
 */
 const adjustDateField = (dateType: DateType) => (allFields: AllFields) => {
	const dateField = allFields[dateType];

	if (!dateField) return allFields;

	allFields[dateType] = dateField.split('T')[0];

	return allFields;
};

const adjustDateOfBirthField = adjustDateField('Date_of_Birth');
const adjustClosingDateField = adjustDateField('Closing_Date');
const adjustInvoiceDateField = adjustDateField('Invoice_Date');
const adjustDueDateField = adjustDateField('Due_Date');
const adjustPurchaseOrderDateField = adjustDateField('PO_Date');
const adjustValidTillField = adjustDateField('Valid_Till');

/**
 * Place an ID field's value nested inside the payload.
 */
const adjustIdField = (idType: IdType, nameProperty: NameType) => (allFields: AllFields) => {
	const idValue = allFields[idType];

	if (!idValue) return allFields;

	return {
		...omit(idType, allFields),
		[nameProperty]: { id: idValue },
	};
};

const adjustAccountIdField = adjustIdField('accountId', 'Account_Name');
const adjustContactIdField = adjustIdField('contactId', 'Full_Name');
const adjustDealIdField = adjustIdField('dealId', 'Deal_Name');

// ----------------------------------------
//           payload adjusters
// ----------------------------------------

export const adjustAccountPayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
);

export const adjustContactPayload = flow(
	adjustMailingAddressFields,
	adjustOtherAddressFields,
	adjustDateOfBirthField,
);

export const adjustDealPayload = adjustClosingDateField;

export const adjustInvoicePayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
	adjustInvoiceDateField,
	adjustDueDateField,
	adjustAccountIdField,
);

export const adjustLeadPayload = adjustAddressFields;

export const adjustPurchaseOrderPayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
	adjustDueDateField,
	adjustPurchaseOrderDateField,
);

export const adjustQuotePayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
	adjustValidTillField,
);

export const adjustSalesOrderPayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
	adjustDueDateField,
	adjustAccountIdField,
	adjustContactIdField,
	adjustDealIdField,
);

export const adjustVendorPayload = adjustAddressFields;

// ----------------------------------------
//               helpers
// ----------------------------------------

/**
 * Create a copy of an object without a specific property.
 */
const omit = (propertyToOmit: string, { [propertyToOmit]: _, ...remainingObject }) => remainingObject;

/**
 * Convert items in a Zoho CRM API response into n8n load options.
 */
export const toLoadOptions = (items: ResourceItems, nameProperty: NameType) =>
	items.map((item) => ({ name: item[nameProperty], value: item.id }));

/**
 * Retrieve all fields for a resource, sorted alphabetically.
 */
export async function getFields(this: ILoadOptionsFunctions, resource: string) {
	const { fields } = await zohoApiRequest.call(
		this, 'GET', '/settings/fields', {}, { module: `${resource}s` },
	) as LoadedFields;
	const options = fields.map(({field_label, api_name}) => ({ name: field_label, value: api_name }));

	return sortBy(options, o => o.name);
}
