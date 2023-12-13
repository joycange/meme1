import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { mockInstance } from '../shared/mocking';
import { randomName } from './shared/random';
import { generateNanoId } from '@/databases/utils/generators';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { setupTestServer } from './shared/utils';
import type { SuperAgentTest } from 'supertest';
import { createOwner } from './shared/db/users';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';

describe('DebugController', () => {
	const workflowRepository = mockInstance(WorkflowRepository);
	const activeWorkflowRunner = mockInstance(ActiveWorkflowRunner);

	let testServer = setupTestServer({ endpointGroups: ['debug'] });
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
		testServer.license.enable('feat:multipleMainInstances');
	});

	describe('GET /debug/multi-main-setup', () => {
		test('should return multi-main setup details', async () => {
			const workflowId = generateNanoId();
			const activeWorkflows = [{ id: workflowId, name: randomName() }] as WorkflowEntity[];
			const activationErrors = { [workflowId]: 'Failed to activate' };
			const instanceId = 'main-71JdWtq306epIFki';

			workflowRepository.find.mockResolvedValue(activeWorkflows);
			activeWorkflowRunner.allActiveInMemory.mockReturnValue([workflowId]);
			activeWorkflowRunner.getAllWorkflowActivationErrors.mockResolvedValue(activationErrors);
			jest.spyOn(MultiMainSetup.prototype, 'instanceId', 'get').mockReturnValue(instanceId);
			jest.spyOn(MultiMainSetup.prototype, 'fetchLeaderKey').mockResolvedValue('some-leader-key');

			const response = await ownerAgent.get('/debug/multi-main-setup').expect(200);

			expect(response.body.data).toMatchObject({
				instanceId,
				leaderKey: 'some-leader-key',
				activeWorkflows,
				activationErrors,
			});
		});
	});
});
