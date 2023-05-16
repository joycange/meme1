import { Authorized, Get, Post, RestController } from '@/decorators';
import { versionControlLicensedMiddleware } from './middleware/versionControlEnabledMiddleware.ee';
import { VersionControlService } from './versionControl.service.ee';
import { VersionControlRequest } from './types/requests';
import type { VersionControlPreferences } from './types/versionControlPreferences';
import { BadRequestError } from '@/ResponseHelper';
import type { PullResult, PushResult, StatusResult } from 'simple-git';
import { AuthenticatedRequest } from '../../requests';
import express from 'express';
import type { ImportResult } from './types/importResult';
import type { VersionControlPushWorkFolder } from './types/versionControlPushWorkFolder';
import { VersionControlPreferencesService } from './versionControlPreferences.service.ee';
import type { VersionControlledFile } from './types/versionControlledFile';

@RestController('/version-control')
export class VersionControlController {
	constructor(
		private versionControlService: VersionControlService,
		private versionControlPreferencesService: VersionControlPreferencesService,
	) {}

	@Authorized('any')
	@Get('/preferences', { middlewares: [versionControlLicensedMiddleware] })
	async getPreferences(): Promise<VersionControlPreferences> {
		// returns the settings with the privateKey property redacted
		return this.versionControlPreferencesService.versionControlPreferences;
	}

	@Authorized(['global', 'owner'])
	@Post('/preferences', { middlewares: [versionControlLicensedMiddleware] })
	async setPreferences(req: VersionControlRequest.UpdatePreferences) {
		if (this.versionControlPreferencesService.isVersionControlConnected()) {
			throw new BadRequestError(
				'Cannot change preferences while connected to a version control provider. Please disconnect first.',
			);
		}
		try {
			const sanitizedPreferences: Partial<VersionControlPreferences> = {
				...req.body,
				initRepo: req.body.initRepo ?? true, // default to true if not specified
				connected: undefined,
				publicKey: undefined,
			};
			await this.versionControlPreferencesService.validateVersionControlPreferences(
				sanitizedPreferences,
			);
			const newPreferences = await this.versionControlPreferencesService.setPreferences(
				sanitizedPreferences,
			);
			if (sanitizedPreferences.initRepo === true) {
				await this.versionControlService.initializeRepository({
					...newPreferences,
					initRepo: true,
				});
				await this.versionControlPreferencesService.setPreferences({ connected: true });
			}
			await this.versionControlService.init();
			return newPreferences;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/connect')
	async connect() {
		try {
			return await this.versionControlService.connect();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/disconnect')
	async disconnect(req: VersionControlRequest.Disconnect) {
		try {
			return await this.versionControlService.disconnect(req.body);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/get-branches')
	async getBranches() {
		try {
			return await this.versionControlService.getBranches();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/set-branch')
	async setBranch(req: VersionControlRequest.SetBranch) {
		try {
			return await this.versionControlService.setBranch(req.body.branch);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/push-workfolder')
	async pushWorkfolder(
		req: VersionControlRequest.PushWorkFolder,
		res: express.Response,
	): Promise<PushResult | VersionControlledFile[]> {
		try {
			const result = await this.versionControlService.pushWorkfolder(req.body);
			if ((result as PushResult).pushed) {
				res.statusCode = 200;
			} else {
				res.statusCode = 409;
			}
			return result;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/pull-workfolder')
	async pullWorkfolder(
		req: VersionControlRequest.PullWorkFolder,
		res: express.Response,
	): Promise<VersionControlledFile[] | ImportResult | PullResult | undefined> {
		try {
			const result = await this.versionControlService.pullWorkfolder({
				force: req.body.force,
				variables: req.body.variables,
				userId: req.user.id,
				importAfterPull: req.body.importAfterPull ?? true,
			});
			if ((result as ImportResult).workflows || (result as PullResult).summary) {
				res.statusCode = 200;
			} else {
				res.statusCode = 409;
			}
			return result;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/reset-workfolder')
	async resetWorkfolder(
		req: VersionControlRequest.PullWorkFolder,
	): Promise<ImportResult | undefined> {
		try {
			return await this.versionControlService.resetWorkfolder({
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
	@Get('/get-status')
	async getStatus() {
		try {
			return await this.versionControlService.getStatus();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/status')
	async status(): Promise<StatusResult> {
		try {
			return await this.versionControlService.status();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	// #region Version Control Test Functions
	//TODO: SEPARATE FUNCTIONS FOR DEVELOPMENT ONLY
	//TODO: REMOVE THESE FUNCTIONS AFTER TESTING

	@Authorized(['global', 'owner'])
	@Post('/generate-key-pair', { middlewares: [versionControlLicensedMiddleware] })
	async generateKeyPair() {
		try {
			return await this.versionControlPreferencesService.generateAndSaveKeyPair();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/export', { middlewares: [versionControlLicensedMiddleware] })
	async export() {
		try {
			return await this.versionControlService.export();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/import', { middlewares: [versionControlLicensedMiddleware] })
	async import(req: AuthenticatedRequest) {
		try {
			return await this.versionControlService.import({
				userId: req.user.id,
			});
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/fetch')
	async fetch() {
		try {
			return await this.versionControlService.fetch();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized('any')
	@Get('/diff')
	async diff() {
		try {
			return await this.versionControlService.diff();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/push')
	async push(req: VersionControlRequest.Push): Promise<PushResult> {
		try {
			return await this.versionControlService.push(req.body.force);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/commit')
	async commit(req: VersionControlRequest.Commit) {
		try {
			return await this.versionControlService.commit(req.body.message);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/stage')
	async stage(req: VersionControlRequest.Stage): Promise<{ staged: string[] } | string> {
		try {
			return await this.versionControlService.stage(req.body as VersionControlPushWorkFolder);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/unstage')
	async unstage(): Promise<StatusResult | string> {
		try {
			return await this.versionControlService.unstage();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Authorized(['global', 'owner'])
	@Get('/pull')
	async pull(): Promise<PullResult> {
		try {
			return await this.versionControlService.pull();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	// #endregion
}
