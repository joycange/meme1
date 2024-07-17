import { ClientSecretCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import type { SecretsProvider, SecretsProviderState } from '@/Interfaces';
import type { INodeProperties } from 'n8n-workflow';
import type { AzureKeyVaultContext, AzureKeyVaultSecret } from './types';
import { DOCS_HELP_NOTICE, EXTERNAL_SECRETS_NAME_REGEX } from '@/ExternalSecrets/constants';

export class AzureKeyVault implements SecretsProvider {
	name = 'azureKeyVault';

	displayName = 'Azure Key Vault';

	state: SecretsProviderState = 'initializing';

	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
		{
			displayName: 'Vault Name',
			description: 'The name of your existing Azure Key Vault.',
			name: 'vaultName',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. my-vault',
			noDataExpression: true,
		},
		{
			displayName: 'Directory (Tenant) ID',
			name: 'tenantId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. 7dec9324-7074-72b7-a3ca-a9bb3012f466',
			noDataExpression: true,
		},
		{
			displayName: 'Application (Client) ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. 7753d8c2-e41f-22ed-3dd7-c9e96463622c',
			typeOptions: { password: true },
			noDataExpression: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			description: 'The client secret value of your registered application.',
			type: 'string',
			default: '',
			required: true,
			typeOptions: { password: true },
			noDataExpression: true,
		},
	];

	private cachedSecrets: Record<string, string> = {};

	private client: SecretClient;

	private settings: AzureKeyVaultContext['settings'];

	async init(context: AzureKeyVaultContext) {
		this.settings = context.settings;
	}

	async connect() {
		const { vaultName, tenantId, clientId, clientSecret } = this.settings;

		try {
			const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
			this.client = new SecretClient(`https://${vaultName}.vault.azure.net/`, credential);
			this.state = 'connected';
		} catch (error) {
			this.state = 'error';
		}
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		if (!this.client) return [false, 'Failed to connect to Azure Key Vault'];

		try {
			await this.client.listPropertiesOfSecrets().next();
			return [true];
		} catch (error: unknown) {
			return [false, error instanceof Error ? error.message : 'unknown error'];
		}
	}

	async disconnect() {
		// unused
	}

	async update() {
		const secretNames: string[] = [];

		for await (const secret of this.client.listPropertiesOfSecrets()) {
			secretNames.push(secret.name);
		}

		const promises = secretNames
			.filter((name) => EXTERNAL_SECRETS_NAME_REGEX.test(name))
			.map(async (name) => {
				const { value } = await this.client.getSecret(name);
				return { name, value };
			});

		const secrets = await Promise.all(promises);

		secrets
			.filter((secret): secret is AzureKeyVaultSecret => secret.value !== undefined)
			.forEach(({ name, value }) => {
				this.cachedSecrets[name] = value;
			});
	}

	getSecret(name: string) {
		return this.cachedSecrets[name];
	}

	hasSecret(name: string) {
		return name in this.cachedSecrets;
	}

	getSecretNames() {
		return Object.keys(this.cachedSecrets);
	}
}
