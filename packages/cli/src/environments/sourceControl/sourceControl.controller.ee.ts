import { Authorized, Get, Post, Patch, RestController } from '@/decorators';
import {
	sourceControlLicensedMiddleware,
	sourceControlLicensedAndEnabledMiddleware,
} from './middleware/sourceControlEnabledMiddleware.ee';
import { SourceControlService } from './sourceControl.service.ee';
import { SourceControlRequest } from './types/requests';
import { SourceControlPreferencesService } from './sourceControlPreferences.service.ee';
import type { SourceControlPreferences } from './types/sourceControlPreferences';
import type { SourceControlledFile } from './types/sourceControlledFile';
import { SOURCE_CONTROL_API_ROOT, SOURCE_CONTROL_DEFAULT_BRANCH } from './constants';
import { BadRequestError } from '@/ResponseHelper';
import type { PullResult, PushResult, StatusResult } from 'simple-git';
import express from 'express';
import type { ImportResult } from './types/importResult';
import Container from 'typedi';
import { InternalHooks } from '../../InternalHooks';
import {
	getRepoType,
	getTrackingInformationFromPrePushResult,
	getTrackingInformationFromPostPushResult,
	getTrackingInformationFromPullResult,
} from './sourceControlHelper.ee';

@RestController(`/${SOURCE_CONTROL_API_ROOT}`)
export class SourceControlController {
	constructor(
		private sourceControlService: SourceControlService,
		private sourceControlPreferencesService: SourceControlPreferencesService,
	) {}

	@Authorized('any')
	@Get('/preferences', { middlewares: [sourceControlLicensedMiddleware] })
	async getPreferences(): Promise<SourceControlPreferences> {
		// returns the settings with the privateKey property redacted
		return this.sourceControlPreferencesService.getPreferences();
	}

	@Authorized(['global', 'owner'])
	@Post('/preferences', { middlewares: [sourceControlLicensedMiddleware] })
	async setPreferences(req: SourceControlRequest.UpdatePreferences) {
		if (
			req.body.branchReadOnly === undefined &&
			this.sourceControlPreferencesService.isSourceControlConnected()
		) {
			throw new BadRequestError(
				'Cannot change preferences while connected to a source control provider. Please disconnect first.',
			);
		}
		try {
			const sanitizedPreferences: Partial<SourceControlPreferences> = {
				...req.body,
				initRepo: req.body.initRepo ?? true, // default to true if not specified
				connected: undefined,
				publicKey: undefined,
			};
			await this.sourceControlPreferencesService.validateSourceControlPreferences(
				sanitizedPreferences,
			);
			const updatedPreferences = await this.sourceControlPreferencesService.setPreferences(
				sanitizedPreferences,
			);
			if (sanitizedPreferences.initRepo === true) {
				try {
					await this.sourceControlService.initializeRepository(
						{
							...updatedPreferences,
							branchName:
								updatedPreferences.branchName === ''
									? SOURCE_CONTROL_DEFAULT_BRANCH
									: updatedPreferences.branchName,
							initRepo: true,
						},
						req.user,
					);
					if (this.sourceControlPreferencesService.getPreferences().branchName !== '') {
						await this.sourceControlPreferencesService.setPreferences({
							connected: true,
						});
					}
				} catch (error) {
					// if initialization fails, run cleanup to remove any intermediate state and throw the error
					await this.sourceControlService.disconnect({ keepKeyPair: true });
					throw error;
				}
			}
			await this.sourceControlService.init();
			const resultingPreferences = this.sourceControlPreferencesService.getPreferences();
			void Container.get(InternalHooks).onSourceControlSettingsUpdated({
				branch_name: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				read_only_instance: resultingPreferences.branchReadOnly,
				repo_type: getRepoType(resultingPreferences.repositoryUrl),
			});
			return resultingPreferences;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Patch('/preferences', { middlewares: [sourceControlLicensedMiddleware] })
	async updatePreferences(req: SourceControlRequest.UpdatePreferences) {
		try {
			const sanitizedPreferences: Partial<SourceControlPreferences> = {
				...req.body,
				initRepo: false,
				connected: undefined,
				publicKey: undefined,
				repositoryUrl: undefined,
			};
			const currentPreferences = this.sourceControlPreferencesService.getPreferences();
			await this.sourceControlPreferencesService.validateSourceControlPreferences(
				sanitizedPreferences,
			);
			if (
				sanitizedPreferences.branchName &&
				sanitizedPreferences.branchName !== currentPreferences.branchName
			) {
				await this.sourceControlService.setBranch(sanitizedPreferences.branchName);
			}
			if (sanitizedPreferences.branchColor || sanitizedPreferences.branchReadOnly !== undefined) {
				await this.sourceControlPreferencesService.setPreferences(
					{
						branchColor: sanitizedPreferences.branchColor,
						branchReadOnly: sanitizedPreferences.branchReadOnly,
					},
					true,
				);
			}
			await this.sourceControlService.init();
			const resultingPreferences = this.sourceControlPreferencesService.getPreferences();
			void Container.get(InternalHooks).onSourceControlSettingsUpdated({
				branch_name: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				read_only_instance: resultingPreferences.branchReadOnly,
				repo_type: getRepoType(resultingPreferences.repositoryUrl),
			});
			return resultingPreferences;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/disconnect', { middlewares: [sourceControlLicensedMiddleware] })
	async disconnect(req: SourceControlRequest.Disconnect) {
		try {
			return await this.sourceControlService.disconnect(req.body);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/get-branches', { middlewares: [sourceControlLicensedMiddleware] })
	async getBranches() {
		try {
			return await this.sourceControlService.getBranches();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/push-workfolder', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	async pushWorkfolder(
		req: SourceControlRequest.PushWorkFolder,
		res: express.Response,
	): Promise<
		| { pushResult: PushResult; diffResult: SourceControlledFile[] | undefined }
		| SourceControlledFile[]
	> {
		if (this.sourceControlPreferencesService.isBranchReadOnly()) {
			throw new BadRequestError('Cannot push onto read-only branch.');
		}
		try {
			await this.sourceControlService.setGitUserDetails(
				`${req.user.firstName} ${req.user.lastName}`,
				req.user.email,
			);
			const result = await this.sourceControlService.pushWorkfolder(req.body);
			if ('pushResult' in result && result.pushResult) {
				void Container.get(InternalHooks).onSourceControlUserFinishedPushUI(
					getTrackingInformationFromPostPushResult(result.diffResult),
				);
				res.statusCode = 200;
			} else {
				void Container.get(InternalHooks).onSourceControlUserStartedPushUI(
					getTrackingInformationFromPrePushResult(result.diffResult),
				);
				res.statusCode = 409;
			}
			return result.diffResult;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/pull-workfolder', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	async pullWorkfolder(
		req: SourceControlRequest.PullWorkFolder,
		res: express.Response,
	): Promise<SourceControlledFile[] | ImportResult | PullResult | StatusResult | undefined> {
		try {
			const result = await this.sourceControlService.pullWorkfolder({
				force: req.body.force,
				variables: req.body.variables,
				userId: req.user.id,
				importAfterPull: req.body.importAfterPull ?? true,
			});
			if (result.status === 200) {
				void Container.get(InternalHooks).onSourceControlUserFinishedPullUI(
					getTrackingInformationFromPullResult(result.diffResult),
				);
				res.statusCode = 200;
			} else {
				void Container.get(InternalHooks).onSourceControlUserStartedPullUI(
					getTrackingInformationFromPullResult(result.diffResult),
				);
				res.statusCode = 409;
			}
			return result.diffResult;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/reset-workfolder', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	async resetWorkfolder(
		req: SourceControlRequest.PullWorkFolder,
	): Promise<ImportResult | undefined> {
		try {
			return await this.sourceControlService.resetWorkfolder({
				force: req.body.force,
				variables: req.body.variables,
				userId: req.user.id,
				importAfterPull: req.body.importAfterPull ?? true,
			});
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/get-status', { middlewares: [sourceControlLicensedAndEnabledMiddleware] })
	async getStatus() {
		try {
			const result = await this.sourceControlService.getStatus();
			getTrackingInformationFromPrePushResult(result);
			void Container.get(InternalHooks).onSourceControlUserStartedPushUI(
				getTrackingInformationFromPrePushResult(result),
			);
			return result;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/status', { middlewares: [sourceControlLicensedMiddleware] })
	async status(): Promise<StatusResult> {
		try {
			return await this.sourceControlService.status();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/generate-key-pair', { middlewares: [sourceControlLicensedMiddleware] })
	async generateKeyPair(): Promise<SourceControlPreferences> {
		try {
			const result = await this.sourceControlPreferencesService.generateAndSaveKeyPair();
			return result;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}
}
