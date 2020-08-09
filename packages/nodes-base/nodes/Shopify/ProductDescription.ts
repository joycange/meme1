import {
	INodeProperties,
} from 'n8n-workflow';

export const productOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a product',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all products',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const productFields = [

	/* -------------------------------------------------------------------------- */
	/*                                product:create/update                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		placeholder: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'product',
				],
			},
		},
		default: '',
		description: 'The name of the product.',
		required: true,
	},
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'product',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Body Html',
				name: 'body_html',
				type: 'string',
				default: '',
				description: 'A description of the product. Supports HTML formatting.'
			},
			{
				displayName: 'Handle',
				name: 'handle',
				type: 'string',
				default: '',
				description: 'A unique human-friendly string for the product.<br />Automatically generated from the product\'s title.<br />Used by the Liquid templating language to refer to objects.'
			},
			{
				displayName: 'Product Type',
				name: 'product_type',
				type: 'string',
				default: '',
				description: 'A categorization for the product used for filtering and searching products.'
			},
			{
				displayName: 'Published At',
				name: 'published_at',
				type: 'dateTime',
				default: '',
				description: 'The date and time (ISO 8601 format) when the product was published.<br />Can be set to null to unpublish the product from the Online Store channel.'
			},
			{
				displayName: 'Published Scope',
				name: 'published_scope',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Web',
						value: 'web',
						description: 'The product is published to the Online Store channel but not published to the Point of Sale channel.'
					},
					{
						name: 'Global',
						value: 'global',
						description: ''
					}
				],
				description: 'The product is published to both the Online Store channel and the Point of Sale channel.'
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'A string of comma-separated tags that are used for filtering and search.<br />A product can have up to 250 tags. Each tag can have up to 255 characters.'
			},
			{
				displayName: 'Template Suffix',
				name: 'template_suffix',
				type: 'string',
				default: '',
				description: 'The suffix of the Liquid template used for the product page.<br />If this property is specified, then the product page uses a template called \"product.suffix.liquid\',<br />where \"suffix\" is the value of this property. If this property is \"\" or null, then the product page uses the default template \"product.liquid\". (default: null)'
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						'/operation': [
							'update',
						],
					}
				},
				description: 'The name of the product.'
			},
			{
				displayName: 'Vendor',
				name: 'vendor',
				type: 'string',
				default: '',
				description: 'The name of the product\'s vendor.'
			},
		],
	},
	{
		displayName: 'Options',
		name: 'productOptions',
		type: 'fixedCollection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'product',
				],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		description: 'The custom product property names like Size, Color, and Material.<br />You can add up to 3 options of up to 255 characters each.',
		options: [
			{
				displayName: 'Option',
				name: 'option',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Option\'s name.',
					},
					{
						displayName: 'Values',
						name: 'values',
						type: 'string',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Value',
						description: 'Option\'s values.',
					},
				]
			},
		],
	},
	{
		displayName: 'Images',
		name: 'images',
		type: 'collection',
		placeholder: 'Add Image Field',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'product',
				],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		description: 'A list of product image objects, each one representing an image associated with the product.',
		options: [
			{
				displayName: 'Created At',
				name: 'created_at',
				type: 'dateTime',
				default: '',
				description: 'The date and time when the product image was created.'
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				default: '',
				description: 'Height dimension of the image which is determined on upload.'
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: '',
				description: 'A unique numeric identifier for the product image.'
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				default: '',
				description: 'The order of the product image in the list.<br />The first product image is at position 1 and is the \"main\" image for the product.'
			},
			{
				displayName: 'Product ID',
				name: 'product_id',
				type: 'number',
				default: '',
				description: 'The id of the product associated with the image.'
			},
			{
				displayName: 'Src',
				name: 'src',
				type: 'string',
				default: '',
				description: 'Specifies the location of the product image.<br />This parameter supports URL filters that you can use to retrieve modified copies of the image. For example, add _small, to the filename to retrieve a scaled copy of the image at 100 x 100 px (for example, ipod-nano_small.png), or add _2048x2048 to retrieve a copy of the image<br />constrained at 2048 x 2048 px resolution (for example, ipod-nano_2048x2048.png).'
			},
			{
				displayName: 'Updated At',
				name: 'updated_at',
				type: 'dateTime',
				default: '',
				description: 'The date and time when the product image was last modified.'
			},
			{
				displayName: 'Variant IDs',
				name: 'variant_ids',
				type: 'number',
				typeOptions: {
					multipleValues: true,
				},
				default: '',
				description: 'An array of variant ids associated with the image.'
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				default: '',
				description: 'Width dimension of the image which is determined on upload.'
			}
		],
	},
	{
		displayName: 'Variants',
		name: 'variants',
		type: 'collection',
		placeholder: 'Add Variant Field',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'product',
				],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		description: 'A list of product variants, each representing a different version of the product.',
		options: [
			{
				displayName: 'Barcode',
				name: 'barcode',
				type: 'string',
				default: '',
				description: 'The barcode, UPC, or ISBN number for the product.',
			},
			{
				displayName: 'Compare At Price',
				name: 'compare_at_price',
				type: 'string',
				default: '',
				description: 'The original price of the item before an adjustment or a sale.',
			},
			{
				displayName: 'Created At',
				name: 'created_at',
				type: 'dateTime',
				default: '',
				description: 'The date and time when the product image was created.',
			},
			{
				displayName: 'Fulfillment Service',
				name: 'fulfillment_service',
				type: 'string',
				default: '',
				description: 'The fulfillment service associated with the product variant.<br />Valid values: manual or the handle of a fulfillment service.',
			},
			{
				displayName: 'Grams',
				name: 'grams',
				type: 'number',
				default: '',
				description: 'The weight of the product variant in grams.',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: '',
				description: 'The unique numeric identifier for the product variant.',
			},
			{
				displayName: 'Image ID',
				name: 'image_id',
				type: 'number',
				default: '',
				description: 'The unique numeric identifier for a product\'s image.<br />The image must be associated to the same product as the variant.',
			},
			{
				displayName: 'Inventory Item ID',
				name: 'inventory_item_id',
				type: 'number',
				default: '',
				description: 'The unique identifier for the inventory item, which is used in the Inventory API to query for inventory information.',
			},
			{
				displayName: 'Inventory Management',
				name: 'inventory_management',
				type: 'number',
				default: '',
				description: 'The fulfillment service that tracks the number of items in stock for the product variant.<br />If you track the inventory yourself using the admin, then set the value to "shopify".<br />Valid values: shopify or the handle of a fulfillment service that has inventory management enabled.<br />Must be the same fulfillment service referenced by the fulfillment_service property.',
			},
			{
				displayName: 'Inventory Policy',
				name: 'inventory_policy',
				type: 'options',
				default: 'deny',
				options: [
					{
						name: 'Deny',
						value: 'deny',
						description: 'Customers are not allowed to place orders for the product variant if it\'s out of stock.'
					},
					{
						name: 'Continue',
						value: 'continue',
						description: 'Customers are allowed to place orders for the product variant if it\'s out of stock.'
					},
				],
				description: 'Whether customers are allowed to place an order for the product variant when it\'s out of stock.',
			},
			{
				displayName: 'Option 1',
				name: 'option1',
				type: 'string',
				default: '',
				description: 'The custom properties that a shop owner uses to define product variants.<br />You can define three options for a product: option1, option2, option3. Default value: "Default Title."',
			},
			{
				displayName: 'Option 2',
				name: 'option2',
				type: 'string',
				default: '',
				description: 'The custom properties that a shop owner uses to define product variants.<br />You can define three options for a product: option1, option2, option3. Default value: "Default Title."',
			},
			{
				displayName: 'Option 3',
				name: 'option3',
				type: 'string',
				default: '',
				description: 'The custom properties that a shop owner uses to define product variants.<br />You can define three options for a product: option1, option2, option3. Default value: "Default Title."',
			},
			{
				displayName: 'Presentment Prices',
				name: 'presentment_prices',
				type: 'collection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Compare At Price',
						name: 'compare_at_price',
						type: 'collection',
						default: {},
						description: '',
						options: [
							{
								displayName: 'Amount',
								name: 'amount',
								type: 'string',
								default: '',
								description: 'The variant\'s price or compare-at price in the presentment currency.',
							},
							{
								displayName: 'Currency Code',
								name: 'currency_code',
								type: 'string',
								default: '',
								description: 'The three-letter code (ISO 4217 format) for one of the shop\'s enabled presentment currencies.',
							},
						],
					},
					{
						displayName: 'Price',
						name: 'price',
						type: 'collection',
						default: {},
						description: '',
						options: [
							{
								displayName: 'Amount',
								name: 'amount',
								type: 'string',
								default: '',
								description: 'The variant\'s price or compare-at price in the presentment currency.',
							},
							{
								displayName: 'Currency Code',
								name: 'currency_code',
								type: 'string',
								default: '',
								description: 'The three-letter code (ISO 4217 format) for one of the shop\'s enabled presentment currencies.',
							},
						],
					},
				],
				description: 'A list of the variant\'s presentment prices and compare-at<br />prices in each of the shop\'s enabled presentment currencies.',
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'string',
				default: '',
				description: 'The price of the product variant.',
			},
			{
				displayName: 'Product ID',
				name: 'product_id',
				type: 'number',
				default: '',
				description: 'The unique numeric identifier for the product.',
			},
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				default: '',
				description: 'A unique identifier for the product variant in the shop. Required in order to connect to a FulfillmentService.',
			},
			{
				displayName: 'Taxable',
				name: 'taxable',
				type: 'boolean',
				default: false,
				description: 'Whether a tax is charged when the product variant is sold.',
			},
			{
				displayName: 'Tax Code',
				name: 'tax_code',
				type: 'string',
				default: '',
				description: 'This parameter applies only to the stores that have the Avalara AvaTax app installed.<br />Specifies the Avalara tax code for the product variant.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title of the product variant.',
			},
			{
				displayName: 'Updated At',
				name: 'updated_at',
				type: 'dateTime',
				default: '',
				description: 'The date and time when the product variant was last modified. Gets returned in ISO 8601 format.',
			},
			{
				displayName: 'Weight',
				name: 'weight',
				type: 'number',
				default: '',
				description: 'The weight of the product variant in the unit system specified with weight_unit.',
			},
			{
				displayName: 'Weight Unit',
				name: 'weight_unit',
				type: 'options',
				default: '',
				options: [
					{
						name: 'g',
						value: 'g',
						description: ''
					},
					{
						name: 'kg',
						value: 'kg',
						description: ''
					},
					{
						name: 'oz',
						value: 'oz',
						description: ''
					},
					{
						name: 'lb',
						value: 'lb',
						description: ''
					},
				],
				description: 'The unit of measurement that applies to the product variant\'s weight.<br />If you don\'t specify a value for weight_unit,<br />then the shop\'s default unit of measurement is applied.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                product:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                product:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'product',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the product will return, formatted as a string of comma-separated values.<br />By default all the fields are returned',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                product:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'getAll',
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
				resource: [
					'product',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'product',
				],
			},
		},
		options: [
			{
				displayName: 'Collection ID',
				name: 'collection_id',
				type: 'string',
				default: '',
				description: 'Filter results by product collection ID.'
			},
			{
				displayName: 'Created At Max',
				name: 'created_at_max',
				type: 'dateTime',
				default: '',
				description: 'Show products created before date.'
			},
			{
				displayName: 'Created At Min',
				name: 'created_at_min',
				type: 'dateTime',
				default: '',
				description: 'Show products created after date'
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Show only certain fields, specified by a comma-separated list of field names.'
			},
			{
				displayName: 'Handle',
				name: 'handle',
				type: 'string',
				default: '',
				description: 'Filter results by product handle.'
			},
			{
				displayName: 'IDs',
				name: 'ids',
				type: 'string',
				default: '',
				description: 'Return only products specified by a comma-separated list of product IDs.'
			},
			{
				displayName: 'Presentment Currencies',
				name: 'presentment_currencies',
				type: 'string',
				default: '',
				description: 'Return presentment prices in only certain currencies,<br />specified by a comma-separated list of ISO 4217 currency codes.'
			},
			{
				displayName: 'Product Type',
				name: 'product_type',
				type: 'string',
				default: '',
				description: 'Filter results by product type.'
			},
			{
				displayName: 'Published At Max',
				name: 'published_at_max',
				type: 'dateTime',
				default: '',
				description: 'Show products published before date.'
			},
			{
				displayName: 'Published At Min',
				name: 'published_at_min',
				type: 'dateTime',
				default: '',
				description: 'Show products published after date.'
			},
			{
				displayName: 'Published Status',
				name: 'published_status',
				type: 'options',
				options: [
					{
						name: 'Any',
						value: 'any',
						description: 'Show all products.'
					},
					{
						name: 'Published',
						value: 'published',
						description: 'Show only published products.'
					},
					{
						name: 'Unpublished',
						value: 'unpublished',
						description: 'Show only unpublished products.'
					}
				],
				default: 'any',
				description: 'Return products by their published status.'
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Filter results by product title.'
			},
			{
				displayName: 'Updated At Max',
				name: 'updated_at_max',
				type: 'dateTime',
				default: '',
				description: 'Show products last updated before date.'
			},
			{
				displayName: 'Updated At Min',
				name: 'updated_at_min',
				type: 'dateTime',
				default: '',
				description: 'Show products last updated after date.'
			},
			{
				displayName: 'Vendor',
				name: 'vendor',
				type: 'string',
				default: '',
				description: 'Filter results by product vendor.'
			}
		],
	},
] as INodeProperties[];
