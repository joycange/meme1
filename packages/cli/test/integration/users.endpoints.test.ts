import express = require('express');
import { getConnection } from 'typeorm';
import validator from 'validator';
import { v4 as uuid } from 'uuid';

import * as utils from './shared/utils';
import { Db } from '../../src';
import config = require('../../config');
import { SUCCESS_RESPONSE_BODY } from './shared/constants';

let app: express.Application;

beforeAll(async () => {
	app = utils.initTestServer({ namespaces: ['users'], applyAuth: true });
	await utils.initTestDb();
	await utils.truncateUserTable();
});

beforeEach(async () => {
	const ownerRole = await Db.collections.Role!.findOneOrFail({ name: 'owner', scope: 'global' });

	await Db.collections.User!.save({
		id: INITIAL_TEST_USER.id,
		email: INITIAL_TEST_USER.email,
		password: INITIAL_TEST_USER.password,
		firstName: INITIAL_TEST_USER.firstName,
		lastName: INITIAL_TEST_USER.lastName,
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: ownerRole,
	});

	config.set('userManagement.hasOwner', true);
});

afterEach(async () => {
	await utils.truncateUserTable();
});

afterAll(() => {
	return getConnection().close();
});

test('GET /users should return all users', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const response = await authOwnerAgent.get('/users');

	expect(response.statusCode).toBe(200);

	for (const user of response.body.data) {
		const {
			id,
			email,
			firstName,
			lastName,
			personalizationAnswers,
			globalRole,
			password,
			resetPasswordToken,
		} = user;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeDefined();
		expect(lastName).toBeDefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(globalRole).toBeUndefined();
	}
});

test('DELETE /users/:id should delete the user', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const memberRole = await Db.collections.Role!.findOneOrFail({ name: 'member', scope: 'global' });
	const { id: idToDelete } = await Db.collections.User!.save({
		id: uuid(),
		email: utils.randomEmail(),
		password: utils.randomValidPassword(),
		firstName: utils.randomName(),
		lastName: utils.randomName(),
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: memberRole,
	});

	const response = await authOwnerAgent.delete(`/users/${idToDelete}`);

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
});

test('DELETE /users/:id should fail to delete self', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const response = await authOwnerAgent.delete(`/users/${owner.id}`);

	expect(response.statusCode).toBe(400);
});

test('DELETE /users/:id should fail if deletee equals transferee', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const memberRole = await Db.collections.Role!.findOneOrFail({ name: 'member', scope: 'global' });
	const { id: idToDelete } = await Db.collections.User!.save({
		id: uuid(),
		email: utils.randomEmail(),
		password: utils.randomValidPassword(),
		firstName: utils.randomName(),
		lastName: utils.randomName(),
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: memberRole,
	});

	const response = await authOwnerAgent.delete(`/users/${idToDelete}`).query({
		transferId: idToDelete,
	});

	expect(response.statusCode).toBe(400);
});

test('DELETE /users/:id with transferId should perform transfer', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const workflowOwnerRole = await Db.collections.Role!.findOneOrFail({
		name: 'owner',
		scope: 'workflow',
	});

	const userToDelete = await Db.collections.User!.save({
		id: uuid(),
		email: utils.randomEmail(),
		password: utils.randomValidPassword(),
		firstName: utils.randomName(),
		lastName: utils.randomName(),
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: workflowOwnerRole,
	});

	const savedWorkflow = await Db.collections.Workflow!.save({
		name: utils.randomName(),
		active: false,
		connections: {},
	});

	await Db.collections.SharedWorkflow!.save({
		role: workflowOwnerRole,
		user: userToDelete,
		workflow: savedWorkflow,
	});

	const response = await authOwnerAgent.delete(`/users/${userToDelete.id}`).query({
		transferId: owner.id,
	});

	expect(response.statusCode).toBe(200);

	const shared = await Db.collections.SharedWorkflow!.findOneOrFail({ relations: ['user'] });

	expect(shared.user.id).toBe(owner.id);
});

test('GET /resolve-signup-token should validate invite token', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const memberRole = await Db.collections.Role!.findOneOrFail({ name: 'member', scope: 'global' });
	const { id: inviteeId } = await Db.collections.User!.save({
		id: uuid(),
		email: utils.randomEmail(),
		password: utils.randomValidPassword(),
		firstName: utils.randomName(),
		lastName: utils.randomName(),
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: memberRole,
	});

	const response = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: INITIAL_TEST_USER.id })
		.query({ inviteeId });

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual({
		data: {
			inviter: {
				firstName: INITIAL_TEST_USER.firstName,
				lastName: INITIAL_TEST_USER.lastName,
			},
		},
	});
});

test('GET /resolve-signup-token should fail with invalid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const memberRole = await Db.collections.Role!.findOneOrFail({ name: 'member', scope: 'global' });
	const { id: inviteeId } = await Db.collections.User!.save({
		id: uuid(),
		email: utils.randomEmail(),
		password: utils.randomValidPassword(),
		firstName: utils.randomName(),
		lastName: utils.randomName(),
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: memberRole,
	});

	const firstResponse = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: INITIAL_TEST_USER.id });

	expect(firstResponse.statusCode).toBe(400);

	const secondResponse = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviteeId });

	expect(secondResponse.statusCode).toBe(400);

	const thirdResponse = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: '123', inviteeId: '456' });

	expect(thirdResponse.statusCode).toBe(400);

	await Db.collections.User!.update(owner.id, { email: '' });

	const fourthResponse = await authOwnerAgent
		.get('/resolve-signup-token')
		.query({ inviterId: INITIAL_TEST_USER.id })
		.query({ inviteeId });

	expect(fourthResponse.statusCode).toBe(400);
});

const INITIAL_TEST_USER = {
	id: uuid(),
	email: utils.randomEmail(),
	firstName: utils.randomName(),
	lastName: utils.randomName(),
	password: utils.randomValidPassword(),
};
