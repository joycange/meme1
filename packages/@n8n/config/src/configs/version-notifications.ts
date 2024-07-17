import { Config, Env } from '../decorators';

@Config
export class VersionNotificationsConfig {
	/** Whether feature is enabled to request notifications about new versions and security updates */
	@Env('N8N_VERSION_NOTIFICATIONS_ENABLED')
	readonly enabled: boolean = true;

	/** Endpoint to retrieve version information from */
	@Env('N8N_VERSION_NOTIFICATIONS_ENDPOINT')
	readonly endpoint: string = 'https://api.n8n.io/api/versions/';

	/** URL for versions panel to page instructing user on how to update n8n instance */
	@Env('N8N_VERSION_NOTIFICATIONS_INFO_URL')
	readonly infoUrl: string = 'https://docs.n8n.io/hosting/installation/updating/';
}
