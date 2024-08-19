import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import {
  DatabaseService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { LoggerService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import { DatabaseManager } from '@backstage/backend-defaults/database';
import { DatabaseUserInfoStore } from '../database/databaseUserInfoStore';
import { CatalogEntityStore } from '../database/catalogStore';
import { readBackstageTokenExpiration } from './readBackstageTokenExpiration';

export interface RouterOptions {
  logger: LoggerService;
  config: RootConfigService;
  database: DatabaseService;
}

export type UserInfoResponse = {
  // firstTimeLogin: string;
  lastTimeLogin: string;
  userEntityRef: string;
  displayName?: string;
};

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const tokenExpiration = readBackstageTokenExpiration(config);
  console.log(`===== Token expiration: ${tokenExpiration}`);

  const authDB = await DatabaseManager.fromConfig(options.config)
    .forPlugin('auth')
    .getClient();
  const catalogDB = await DatabaseManager.fromConfig(options.config)
    .forPlugin('catalog')
    .getClient();

  const userInfoStore = new DatabaseUserInfoStore(authDB, config);
  const catalogEntityStore = new CatalogEntityStore(catalogDB);

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/users/quantity', async (_, response) => {
    const quantity = await userInfoStore.getQuantityRecordedActiveUsers();
    response.json({ quantity });
  });

  // todo add ability return responce in csv format, not only json.
  router.get('/users', async (_, response) => {
    const users = await userInfoStore.getListUsers();
    const userEntities = await catalogEntityStore.getUserEntities();

    for (const userInfo of users) {
      const entity = userEntities.get(userInfo.userEntityRef);
      if (
        entity &&
        entity.spec &&
        entity.spec.profile &&
        (entity.spec.profile as any).displayName
      ) {
        userInfo.displayName = (entity.spec.profile as any)
          .displayName as string;
      }
    }

    response.json(users);
  });

  const middleware = MiddlewareFactory.create({ logger, config });

  router.use(middleware.error());
  return router;
}
