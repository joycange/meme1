import type { GetAllActiveFilter } from './execution.types';
import { ExecutionRequest } from './execution.types';
import { ExecutionService } from './execution.service';
import { Authorized, Get, Post, RestController } from '@/decorators';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';
import type { User } from '@/databases/entities/User';
import config from '@/config';
import { jsonParse } from 'n8n-workflow';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ActiveExecutionService } from './active-execution.service';

@Authorized()
@RestController('/executions')
export class ExecutionsController {
	private readonly isQueueMode = config.getEnv('executions.mode') === 'queue';

	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly activeExecutionService: ActiveExecutionService,
	) {}

	private async getAccessibleWorkflowIds(user: User) {
		return isSharingEnabled()
			? await this.workflowSharingService.getSharedWorkflowIds(user)
			: await this.workflowSharingService.getSharedWorkflowIds(user, ['owner']);
	}

	@Get('/')
	async getMany(req: ExecutionRequest.GetMany) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (workflowIds.length === 0) return { count: 0, estimated: false, results: [] };

		return await this.executionService.findMany(req, workflowIds);
	}

	@Get('/:id')
	async getOne(req: ExecutionRequest.Get) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return isSharingEnabled()
			? await this.enterpriseExecutionService.findOne(req, workflowIds)
			: await this.executionService.findOne(req, workflowIds);
	}

	@Post('/:id/retry')
	async retry(req: ExecutionRequest.Retry) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return await this.executionService.retry(req, workflowIds);
	}

	@Post('/delete')
	async delete(req: ExecutionRequest.Delete) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		return await this.executionService.delete(req, workflowIds);
	}

	@Get('/active')
	async getActive(req: ExecutionRequest.GetAllActive) {
		const filter = req.query.filter?.length ? jsonParse<GetAllActiveFilter>(req.query.filter) : {};

		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return this.isQueueMode
			? await this.activeExecutionService.findManyInQueueMode(filter, workflowIds)
			: await this.activeExecutionService.findManyInRegularMode(filter, workflowIds);
	}

	@Post('/active/:id/stop')
	async stop(req: ExecutionRequest.Stop) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		if (workflowIds.length === 0) throw new NotFoundError('Execution not found');

		const execution = await this.activeExecutionService.findOne(req.params.id, workflowIds);

		if (!execution) throw new NotFoundError('Execution not found');

		return this.isQueueMode
			? await this.activeExecutionService.stopExecutionInQueueMode(execution)
			: await this.activeExecutionService.stopExecutionInRegularMode(execution);
	}
}
