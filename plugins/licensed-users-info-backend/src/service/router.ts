import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import {
  AuthService,
  DiscoveryService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { LoggerService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import { DatabaseManager } from '@backstage/backend-defaults/database';
import {
  DatabaseUserInfoStore,
  UserInfoRow,
} from '../database/databaseUserInfoStore';
import { CatalogEntityStore } from './catalogStore';
import { readBackstageTokenExpiration } from './readBackstageTokenExpiration';
import { json2csv } from 'json-2-csv';
import { CatalogClient } from '@backstage/catalog-client';

export interface RouterOptions {
  logger: LoggerService;
  config: RootConfigService;
  auth: AuthService;
  discovery: DiscoveryService;
}

export type UserInfoResponse = {
  // firstTimeLogin: string;
  userEntityRef: string;
  displayName?: string;
  email?: string;
  lastTimeLogin: string;
};

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, auth, discovery } = options;

  const tokenExpiration = readBackstageTokenExpiration(config);

  const authDB = await DatabaseManager.fromConfig(options.config)
    .forPlugin('auth')
    .getClient();

  const catalogClient = new CatalogClient({ discoveryApi: discovery });

  const userInfoStore = new DatabaseUserInfoStore(authDB);
  const catalogEntityStore = new CatalogEntityStore(catalogClient, auth);

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  router.get('/users/quantity', async (_, response) => {
    const quantity = await userInfoStore.getQuantityRecordedActiveUsers();
    response.json({ quantity });
  });

  router.get('/users', async (request, response) => {
    const usersRow = await userInfoStore.getListUsers();
    const users = usersRow.map(userInfoRow =>
      rowToResponse(userInfoRow, tokenExpiration),
    );

    const userEntities = await catalogEntityStore.getUserEntities();
    for (const userInfo of users) {
      const entity = userEntities.get(userInfo.userEntityRef);
      if (entity && entity.spec && entity.spec.profile) {
        userInfo.displayName = (entity.spec.profile as any)
          .displayName as string;
        userInfo.email = (entity.spec.profile as any).email as string;
      }
    }

    if (request.headers['content-type']?.includes('text/csv')) {
      try {
        const csv = await json2csv(users, {
          keys: ['userEntityRef', 'displayName', 'email', 'lastTimeLogin'],
        });
        response.header('Content-Type', 'text/csv');
        response.attachment('data.csv');
        response.send(csv);
      } catch (err) {
        response.status(500).send('Error converting to CSV');
      }
    } else {
      response.json(users);
    }
  });

  const middleware = MiddlewareFactory.create({ logger, config });

  router.use(middleware.error());
  return router;
}

export function rowToResponse(
  userInfoRow: UserInfoRow,
  tokenExpiration: number,
): UserInfoResponse {
  return {
    userEntityRef: userInfoRow.user_entity_ref,
    lastTimeLogin: new Date(
      userInfoRow.exp.getTime() - tokenExpiration,
    ).toUTCString(),
  };
}
