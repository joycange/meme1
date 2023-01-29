/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import express from 'express';
import http from 'http';
import type PCancelable from 'p-cancelable';

import { Command, flags } from '@oclif/command';
import { BinaryDataManager, UserSettings, WorkflowExecute } from 'n8n-core';

import type { IExecuteResponsePromiseData, INodeTypes, IRun } from 'n8n-workflow';
import { Workflow, LoggerProxy, ErrorReporterProxy as ErrorReporter, sleep } from 'n8n-workflow';

import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { CredentialTypes } from '@/CredentialTypes';
import * as Db from '@/Db';
import { ExternalHooks } from '@/ExternalHooks';
import { NodeTypes } from '@/NodeTypes';
import * as ResponseHelper from '@/ResponseHelper';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { InternalHooksManager } from '@/InternalHooksManager';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { getLogger } from '@/Logger';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';

import config from '@/config';
import * as Queue from '@/Queue';
import * as CrashJournal from '@/CrashJournal';
import { getWorkflowOwner } from '@/UserManagement/UserManagementHelper';
import { generateFailedExecutionFromError } from '@/WorkflowHelpers';
import { N8N_VERSION } from '@/constants';
import { initErrorHandling } from '@/ErrorReporting';

const exitWithCrash = async (message: string, error: unknown) => {
	ErrorReporter.error(new Error(message, { cause: error }), { level: 'fatal' });
	await sleep(2000);
	process.exit(1);
};

const exitSuccessFully = async () => {
	try {
		await CrashJournal.cleanup();
	} finally {
		process.exit();
	}
};

export class Worker extends Command {
	static description = '\nStarts a n8n worker';

	static examples = ['$ n8n worker --concurrency=5'];

	static flags = {
		help: flags.help({ char: 'h' }),
		concurrency: flags.integer({
			default: 10,
			description: 'How many jobs can run in parallel.',
		}),
	};

	static runningJobs: {
		[key: string]: PCancelable<IRun>;
	} = {};

	static jobQueue: Queue.JobQueue;

	/**
	 * Stop n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	static async stopProcess() {
		LoggerProxy.info('Stopping n8n...');

		// Stop accepting new jobs
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		Worker.jobQueue.pause(true);

		try {
			const externalHooks = ExternalHooks();
			await externalHooks.run('n8n.stop', []);

			const maxStopTime = config.getEnv('queue.bull.gracefulShutdownTimeout') * 1000;

			const stopTime = new Date().getTime() + maxStopTime;

			setTimeout(async () => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				await exitSuccessFully();
			}, maxStopTime);

			// Wait for active workflow executions to finish
			let count = 0;
			while (Object.keys(Worker.runningJobs).length !== 0) {
				if (count++ % 4 === 0) {
					const waitLeft = Math.ceil((stopTime - new Date().getTime()) / 1000);
					LoggerProxy.info(
						`Waiting for ${
							Object.keys(Worker.runningJobs).length
						} active executions to finish... (wait ${waitLeft} more seconds)`,
					);
				}
				// eslint-disable-next-line no-await-in-loop
				await sleep(500);
			}
		} catch (error) {
			await exitWithCrash('There was an error shutting down n8n.', error);
		}

		await exitSuccessFully();
	}

	async runJob(job: Queue.Job, nodeTypes: INodeTypes): Promise<Queue.JobResponse> {
		const { executionId, loadStaticData } = job.data;
		const executionDb = await Db.collections.Execution.findOneBy({ id: executionId });

		if (!executionDb) {
			LoggerProxy.error(
				`Worker failed to find data of execution "${executionId}" in database. Cannot continue.`,
				{ executionId },
			);
			throw new Error(
				`Unable to find data of execution "${executionId}" in database. Aborting execution.`,
			);
		}
		const currentExecutionDb = ResponseHelper.unflattenExecutionData(executionDb);
		LoggerProxy.info(
			`Start job: ${job.id} (Workflow ID: ${currentExecutionDb.workflowData.id} | Execution: ${executionId})`,
		);

		const workflowOwner = await getWorkflowOwner(currentExecutionDb.workflowData.id!.toString());

		let { staticData } = currentExecutionDb.workflowData;
		if (loadStaticData) {
			const workflowData = await Db.collections.Workflow.findOne({
				select: ['id', 'staticData'],
				where: {
					id: currentExecutionDb.workflowData.id,
				},
			});
			if (workflowData === null) {
				LoggerProxy.error(
					'Worker execution failed because workflow could not be found in database.',
					{
						workflowId: currentExecutionDb.workflowData.id,
						executionId,
					},
				);
				throw new Error(
					`The workflow with the ID "${currentExecutionDb.workflowData.id}" could not be found`,
				);
			}
			staticData = workflowData.staticData;
		}

		let workflowTimeout = config.getEnv('executions.timeout'); // initialize with default
		if (
			// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
			currentExecutionDb.workflowData.settings &&
			currentExecutionDb.workflowData.settings.executionTimeout
		) {
			workflowTimeout = currentExecutionDb.workflowData.settings.executionTimeout as number; // preference on workflow setting
		}

		let executionTimeoutTimestamp: number | undefined;
		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout'));
			executionTimeoutTimestamp = Date.now() + workflowTimeout * 1000;
		}

		const workflow = new Workflow({
			id: currentExecutionDb.workflowData.id as string,
			name: currentExecutionDb.workflowData.name,
			nodes: currentExecutionDb.workflowData.nodes,
			connections: currentExecutionDb.workflowData.connections,
			active: currentExecutionDb.workflowData.active,
			nodeTypes,
			staticData,
			settings: currentExecutionDb.workflowData.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			workflowOwner.id,
			undefined,
			executionTimeoutTimestamp,
		);
		additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
			currentExecutionDb.mode,
			job.data.executionId,
			currentExecutionDb.workflowData,
			{ retryOf: currentExecutionDb.retryOf as string },
		);

		try {
			await PermissionChecker.check(workflow, workflowOwner.id);
		} catch (error) {
			const failedExecution = generateFailedExecutionFromError(
				currentExecutionDb.mode,
				error,
				error.node,
			);
			await additionalData.hooks.executeHookFunctions('workflowExecuteAfter', [failedExecution]);
			return {
				success: true,
			};
		}

		additionalData.hooks.hookFunctions.sendResponse = [
			async (response: IExecuteResponsePromiseData): Promise<void> => {
				const progress: Queue.WebhookResponse = {
					executionId,
					response: WebhookHelpers.encodeWebhookResponse(response),
				};
				await job.progress(progress);
			},
		];

		additionalData.executionId = executionId;

		let workflowExecute: WorkflowExecute;
		let workflowRun: PCancelable<IRun>;
		if (currentExecutionDb.data !== undefined) {
			workflowExecute = new WorkflowExecute(
				additionalData,
				currentExecutionDb.mode,
				currentExecutionDb.data,
			);
			workflowRun = workflowExecute.processRunExecutionData(workflow);
		} else {
			// Execute all nodes
			// Can execute without webhook so go on
			workflowExecute = new WorkflowExecute(additionalData, currentExecutionDb.mode);
			workflowRun = workflowExecute.run(workflow);
		}

		Worker.runningJobs[job.id] = workflowRun;

		// Wait till the execution is finished
		await workflowRun;

		delete Worker.runningJobs[job.id];

		return {
			success: true,
		};
	}

	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// eslint-disable-next-line no-console
		console.info('Starting n8n worker...');

		// Make sure that n8n shuts down gracefully if possible
		process.once('SIGTERM', Worker.stopProcess);
		process.once('SIGINT', Worker.stopProcess);

		await initErrorHandling();
		await CrashJournal.init();

		// Wrap that the process does not close but we can still use async
		await (async () => {
			try {
				const { flags } = this.parse(Worker);

				// Start directly with the init of the database to improve startup time
				const startDbInitPromise = Db.init().catch(async (error: Error) =>
					exitWithCrash('There was an error initializing DB', error),
				);

				// Make sure the settings exist
				await UserSettings.prepareUserSettings();

				// Load all node and credential types
				const loadNodesAndCredentials = LoadNodesAndCredentials();
				await loadNodesAndCredentials.init();

				// Add the found types to an instance other parts of the application can use
				const nodeTypes = NodeTypes(loadNodesAndCredentials);
				const credentialTypes = CredentialTypes(loadNodesAndCredentials);

				// Load the credentials overwrites if any exist
				await CredentialsOverwrites(credentialTypes).init();

				// Load all external hooks
				const externalHooks = ExternalHooks();
				await externalHooks.init();

				// Wait till the database is ready
				await startDbInitPromise;

				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const redisConnectionTimeoutLimit = config.getEnv('queue.bull.redis.timeoutThreshold');

				const queue = await Queue.getInstance();
				Worker.jobQueue = queue.getBullObjectInstance();
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				Worker.jobQueue.process(flags.concurrency, async (job) => this.runJob(job, nodeTypes));

				const instanceId = await UserSettings.getInstanceId();

				await InternalHooksManager.init(instanceId, nodeTypes);

				const binaryDataConfig = config.getEnv('binaryDataManager');
				await BinaryDataManager.init(binaryDataConfig);

				console.info('\nn8n worker is now ready');
				console.info(` * Version: ${N8N_VERSION}`);
				console.info(` * Concurrency: ${flags.concurrency}`);
				console.info('');

				Worker.jobQueue.on('global:progress', (jobId, progress) => {
					// Progress of a job got updated which does get used
					// to communicate that a job got canceled.

					if (progress === -1) {
						// Job has to get canceled
						if (Worker.runningJobs[jobId] !== undefined) {
							// Job is processed by current worker so cancel
							Worker.runningJobs[jobId].cancel();
							delete Worker.runningJobs[jobId];
						}
					}
				});

				let lastTimer = 0;
				let cumulativeTimeout = 0;
				Worker.jobQueue.on('error', (error: Error) => {
					if (error.toString().includes('ECONNREFUSED')) {
						const now = Date.now();
						if (now - lastTimer > 30000) {
							// Means we had no timeout at all or last timeout was temporary and we recovered
							lastTimer = now;
							cumulativeTimeout = 0;
						} else {
							cumulativeTimeout += now - lastTimer;
							lastTimer = now;
							if (cumulativeTimeout > redisConnectionTimeoutLimit) {
								logger.error(
									`Unable to connect to Redis after ${redisConnectionTimeoutLimit}. Exiting process.`,
								);
								process.exit(1);
							}
						}
						logger.warn('Redis unavailable - trying to reconnect...');
					} else if (error.toString().includes('Error initializing Lua scripts')) {
						// This is a non-recoverable error
						// Happens when worker starts and Redis is unavailable
						// Even if Redis comes back online, worker will be zombie
						logger.error('Error initializing worker.');
						process.exit(2);
					} else {
						logger.error('Error from queue: ', error);
						throw error;
					}
				});

				if (config.getEnv('queue.health.active')) {
					const port = config.getEnv('queue.health.port');

					const app = express();
					app.disable('x-powered-by');

					const server = http.createServer(app);

					app.get(
						'/healthz',
						// eslint-disable-next-line consistent-return
						async (req: express.Request, res: express.Response) => {
							LoggerProxy.debug('Health check started!');

							const connection = Db.getConnection();

							try {
								if (!connection.isInitialized) {
									// Connection is not active
									throw new Error('No active database connection!');
								}
								// DB ping
								await connection.query('SELECT 1');
							} catch (e) {
								LoggerProxy.error('No Database connection!', e);
								const error = new ResponseHelper.ServiceUnavailableError('No Database connection!');
								return ResponseHelper.sendErrorResponse(res, error);
							}

							// Just to be complete, generally will the worker stop automatically
							// if it loses the connection to redis
							try {
								// Redis ping
								await Worker.jobQueue.client.ping();
							} catch (e) {
								LoggerProxy.error('No Redis connection!', e);
								const error = new ResponseHelper.ServiceUnavailableError('No Redis connection!');
								return ResponseHelper.sendErrorResponse(res, error);
							}

							// Everything fine
							const responseData = {
								status: 'ok',
							};

							LoggerProxy.debug('Health check completed successfully!');

							ResponseHelper.sendSuccessResponse(res, responseData, true, 200);
						},
					);

					server.listen(port, () => {
						console.info(`\nn8n worker health check via, port ${port}`);
					});

					server.on('error', (error: Error & { code: string }) => {
						if (error.code === 'EADDRINUSE') {
							console.log(
								`n8n's port ${port} is already in use. Do you have the n8n main process running on that port?`,
							);
							process.exit(1);
						}
					});
				}
			} catch (error) {
				await exitWithCrash('Worker process cannot continue.', error);
			}
		})();
	}
}
