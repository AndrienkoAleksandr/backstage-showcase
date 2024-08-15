import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { DatabaseService } from '@backstage/backend-plugin-api';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { DatabaseManager } from '@backstage/backend-defaults/database';
import { DatabaseUserInfoStore } from '../database/databaseUserInfoStore';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  database: DatabaseService;
}

export type UserInfoResponse = {
  // firstTimeLogin: string;
  // lastTimeLogin: string;
  userEntityRef: string;
  firstName?: string;
  lastName?: string;
};

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const authDB = await DatabaseManager.fromConfig(options.config)
    .forPlugin('auth')
    .getClient();

  const userInfoStore = new DatabaseUserInfoStore(authDB);

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/users/quantity', async (_, response) => {
    const quantity = await userInfoStore.getQuantityUsers();
    response.json({ quantity });
  });

  // todo add ability return responce in csv format, not only json.
  router.get('/users', async (_, response) => {
    const users = await userInfoStore.getListUsers();

    const userInfoResp: UserInfoResponse[] = users.map(user => {
      return {
        userEntityRef: user.userEntityRef,
      };
    });

    response.json(userInfoResp);
  });

  const middleware = MiddlewareFactory.create({ logger, config });

  router.use(middleware.error());
  return router;
}
