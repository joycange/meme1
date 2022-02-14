import { hashSync, genSaltSync } from 'bcryptjs';
import express = require('express');
import { getConnection } from 'typeorm';
import validator from 'validator';
import { v4 as uuid } from 'uuid';
import * as request from 'supertest';

import config = require('../../config');
import * as utils from './shared/utils';
import { LOGGED_OUT_RESPONSE_BODY, REST_PATH_SEGMENT } from './shared/constants';
import { Db } from '../../src';
import { User } from '../../src/databases/entities/User';
import { Role } from '../../src/databases/entities/Role';

describe('auth endpoints', () => {
	describe('Owner requests', () => {
		let app: express.Application;
		let globalOwnerRole: Role;

		beforeAll(async () => {
			app = utils.initTestServer({ namespaces: ['auth'], applyAuth: true });
			await utils.initTestDb();
			await utils.truncateUserTable();
		});

		beforeEach(async () => {
			globalOwnerRole = await Db.collections.Role!.findOneOrFail({
				name: 'owner',
				scope: 'global',
			});

			const newOwner = new User();

			Object.assign(newOwner, {
				id: uuid(),
				email: TEST_USER.email,
				firstName: TEST_USER.firstName,
				lastName: TEST_USER.lastName,
				password: hashSync(TEST_USER.password, genSaltSync(10)),
				globalRole: globalOwnerRole,
			});

			await Db.collections.User!.save(newOwner);

			config.set('userManagement.hasOwner', true);

			await Db.collections.Settings!.update(
				{ key: 'userManagement.hasOwner' },
				{ value: JSON.stringify(true) },
			);
		});

		afterEach(async () => {
			await utils.truncateUserTable();
		});

		afterAll(() => {
			return getConnection().close();
		});

		test('POST /login should log user in', async () => {
			const authlessAgent = await utils.createAuthlessAgent(app);

			const response = await authlessAgent.post('/login').send({
				email: TEST_USER.email,
				password: TEST_USER.password,
			});

			expect(response.statusCode).toBe(200);

			const {
				id,
				email,
				firstName,
				lastName,
				password,
				personalizationAnswers,
				globalRole,
				resetPasswordToken,
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(TEST_USER.email);
			expect(firstName).toBe(TEST_USER.firstName);
			expect(lastName).toBe(TEST_USER.lastName);
			expect(password).toBeUndefined();
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(globalRole).toBeDefined();
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');

			const authToken = utils.getAuthToken(response);
			expect(authToken).toBeDefined();
		});

		test('GET /login should receive logged in user', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const authOwnerAgent = await utils.createAuthAgent(app, owner);

			const response = await authOwnerAgent.get('/login');

			expect(response.statusCode).toBe(200);

			const {
				id,
				email,
				firstName,
				lastName,
				password,
				personalizationAnswers,
				globalRole,
				resetPasswordToken,
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(TEST_USER.email);
			expect(firstName).toBe(TEST_USER.firstName);
			expect(lastName).toBe(TEST_USER.lastName);
			expect(password).toBeUndefined();
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(globalRole).toBeDefined();
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');

			expect(response.headers['set-cookie']).toBeUndefined();
		});

		test('GET /logout should log user out', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const authOwnerAgent = await utils.createAuthAgent(app, owner);

			const response = await authOwnerAgent.get('/logout');

			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(LOGGED_OUT_RESPONSE_BODY);

			const authToken = utils.getAuthToken(response);
			expect(authToken).toBeUndefined();
		});
	});
});

const TEST_USER = {
	email: utils.randomEmail(),
	password: utils.randomValidPassword(),
	firstName: utils.randomName(),
	lastName: utils.randomName(),
};
