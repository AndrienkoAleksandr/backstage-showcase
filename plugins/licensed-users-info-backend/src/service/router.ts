import {} from '@backstage/backend-defaults';
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { DatabaseService } from '@backstage/backend-plugin-api';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { DatabaseUserInfoStore } from '../database/databaseUserInfoStore';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  database: DatabaseService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, database } = options;

  const userInfoStorage = new DatabaseUserInfoStore(await database.getClient());

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('users/quantity', async (_, response) => {
    const quantity = await userInfoStorage.getQuantityUsers();
    response.json({ quantity });
  });

  const middleware = MiddlewareFactory.create({ logger, config });

  router.use(middleware.error());
  return router;
}
