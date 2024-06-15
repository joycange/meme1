import { CLOUD_BASE_URL_PRODUCTION, CLOUD_BASE_URL_STAGING, STORES } from '@/constants';
import type { RootState } from '@/Interface';
import { setGlobalState } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const { VUE_APP_URL_BASE_API } = import.meta.env;

export const useRootStore = defineStore(STORES.ROOT, () => {
	const state = ref({
		baseUrl: VUE_APP_URL_BASE_API ?? window.BASE_PATH,
		restEndpoint:
			!window.REST_ENDPOINT || window.REST_ENDPOINT === '{{REST_ENDPOINT}}'
				? 'rest'
				: window.REST_ENDPOINT,
		defaultLocale: 'en',
		endpointForm: 'form',
		endpointFormTest: 'form-test',
		endpointFormWaiting: 'form-waiting',
		endpointWebhook: 'webhook',
		endpointWebhookTest: 'webhook-test',
		pushConnectionActive: true,
		timezone: 'America/New_York',
		executionTimeout: -1,
		maxExecutionTimeout: Number.MAX_SAFE_INTEGER,
		versionCli: '0.0.0',
		oauthCallbackUrls: {},
		n8nMetadata: {},
		pushRef: Math.random().toString(36).substring(2, 15),
		urlBaseWebhook: 'http://localhost:5678/',
		urlBaseEditor: 'http://localhost:5678',
		isNpmAvailable: false,
		instanceId: '',
		binaryDataMode: 'default',
	});

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	const getBaseUrl = computed(() => state.value.baseUrl);
	const getFormUrl = computed(() => `${state.value.urlBaseWebhook}${state.value.endpointForm}`);
	const getFormTestUrl = computed(
		() => `${state.value.urlBaseEditor}${state.value.endpointFormTest}`,
	);
	const getFormWaitingUrl = computed(
		() => `${state.value.baseUrl}${state.value.endpointFormWaiting}`,
	);
	const getWebhookUrl = computed(
		() => `${state.value.urlBaseWebhook}${state.value.endpointWebhook}`,
	);
	const getWebhookTestUrl = computed(
		() => `${state.value.urlBaseEditor}${state.value.endpointWebhookTest}`,
	);
	const getRestUrl = computed(() => `${state.value.baseUrl}${state.value.restEndpoint}`);
	const getRestCloudApiContext = computed(() => ({
		baseUrl: window.location.host.includes('stage-app.n8n.cloud')
			? CLOUD_BASE_URL_STAGING
			: CLOUD_BASE_URL_PRODUCTION,
		pushRef: '',
	}));
	const getRestApiContext = computed(() => ({
		baseUrl: getRestUrl.value,
		pushRef: state.value.pushRef,
	}));

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Methods
	// ---------------------------------------------------------------------------

	const setUrlBaseWebhook = (urlBaseWebhook: string) => {
		const url = urlBaseWebhook.endsWith('/') ? urlBaseWebhook : `${urlBaseWebhook}/`;
		state.value.urlBaseWebhook = url;
	};

	const setUrlBaseEditor = (urlBaseEditor: string) => {
		const url = urlBaseEditor.endsWith('/') ? urlBaseEditor : `${urlBaseEditor}/`;
		state.value.urlBaseEditor = url;
	};

	const setEndpointForm = (endpointForm: string) => {
		state.value.endpointForm = endpointForm;
	};

	const setEndpointFormTest = (endpointFormTest: string) => {
		state.value.endpointFormTest = endpointFormTest;
	};

	const setEndpointFormWaiting = (endpointFormWaiting: string) => {
		state.value.endpointFormWaiting = endpointFormWaiting;
	};

	const setEndpointWebhook = (endpointWebhook: string) => {
		state.value.endpointWebhook = endpointWebhook;
	};

	const setEndpointWebhookTest = (endpointWebhookTest: string) => {
		state.value.endpointWebhookTest = endpointWebhookTest;
	};

	const setTimezone = (timezone: string) => {
		state.value.timezone = timezone;
		setGlobalState({ defaultTimezone: timezone });
	};

	const setExecutionTimeout = (executionTimeout: number) => {
		state.value.executionTimeout = executionTimeout;
	};

	const setMaxExecutionTimeout = (maxExecutionTimeout: number) => {
		state.value.maxExecutionTimeout = maxExecutionTimeout;
	};

	const setVersionCli = (version: string) => {
		state.value.versionCli = version;
	};

	const setInstanceId = (instanceId: string) => {
		state.value.instanceId = instanceId;
	};

	const setOauthCallbackUrls = (urls: RootState['oauthCallbackUrls']) => {
		state.value.oauthCallbackUrls = urls;
	};

	const setN8nMetadata = (metadata: RootState['n8nMetadata']) => {
		state.value.n8nMetadata = metadata;
	};

	const setDefaultLocale = (locale: string) => {
		state.value.defaultLocale = locale;
	};

	const setIsNpmAvailable = (isNpmAvailable: boolean) => {
		state.value.isNpmAvailable = isNpmAvailable;
	};

	const setBinaryDataMode = (binaryDataMode: string) => {
		state.value.binaryDataMode = binaryDataMode;
	};

	// #endregion

	return {
		state,
		getBaseUrl,
		getFormUrl,
		getFormTestUrl,
		getFormWaitingUrl,
		getWebhookUrl,
		getWebhookTestUrl,
		getRestUrl,
		getRestCloudApiContext,
		getRestApiContext,
		setUrlBaseWebhook,
		setUrlBaseEditor,
		setEndpointForm,
		setEndpointFormTest,
		setEndpointFormWaiting,
		setEndpointWebhook,
		setEndpointWebhookTest,
		setTimezone,
		setExecutionTimeout,
		setMaxExecutionTimeout,
		setVersionCli,
		setInstanceId,
		setOauthCallbackUrls,
		setN8nMetadata,
		setDefaultLocale,
		setIsNpmAvailable,
		setBinaryDataMode,
		...state,
	};
});
