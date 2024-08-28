import {
  AuthService,
  BackstageCredentials,
  DiscoveryService,
  HttpAuthService,
  LoggerService,
  PermissionsService,
  RootConfigService,
  TokenManagerService,
} from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import {
  DatabaseUserInfoStore,
  UserInfoRow,
} from '../database/databaseUserInfoStore';
import { CatalogEntityStore } from './catalogStore';
import { readBackstageTokenExpiration } from './readBackstageTokenExpiration';
import { json2csv } from 'json-2-csv';
import { CatalogClient } from '@backstage/catalog-client';
import { NotAllowedError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { policyEntityReadPermission } from '@janus-idp/backstage-plugin-rbac-common';
import {
  createRouter as authCreateRouter,
  ProviderFactories,
} from '@backstage/plugin-auth-backend';
import { PluginDatabaseManager } from '@backstage/backend-common';
import { CatalogApi } from '@backstage/catalog-client';
import { AuthOwnershipResolver } from '@backstage/plugin-auth-node';
import { DateTime } from 'luxon';

export interface RouterOptions {
  logger: LoggerService;
  config: RootConfigService;
  auth: AuthService;
  discovery: DiscoveryService;
  permissions: PermissionsService;
  httpAuth: HttpAuthService;
  database: PluginDatabaseManager;
  tokenManager: TokenManagerService;
  disableDefaultProviderFactories: true;
  providerFactories?: ProviderFactories;
  catalogApi: CatalogApi;
  ownershipResolver: AuthOwnershipResolver | undefined;
}

export type UserInfoResponse = {
  // firstLoginTime: string;
  userEntityRef: string;
  displayName?: string;
  email?: string;
  lastAuthTime: string;
};

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const {
    logger,
    database,
    config,
    auth,
    discovery,
    permissions,
    httpAuth,
    tokenManager,
    disableDefaultProviderFactories,
    providerFactories,
    catalogApi,
    ownershipResolver,
  } = options;

  const tokenExpiration = readBackstageTokenExpiration(config);

  const catalogClient = new CatalogClient({ discoveryApi: discovery });

  const userInfoStore = new DatabaseUserInfoStore(await database.getClient());
  const catalogEntityStore = new CatalogEntityStore(catalogClient, auth);

  const router = Router();

  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  router.get('/users/quantity', async (request, response) => {
    await permissionCheck(permissions, await httpAuth.credentials(request));

    const quantity = await userInfoStore.getQuantityRecordedActiveUsers();
    response.json({ quantity });
  });

  router.get('/users', async (request, response) => {
    await permissionCheck(permissions, await httpAuth.credentials(request));

    const usersRow = await userInfoStore.getListUsers();
    const users = usersRow.map(userInfoRow =>
      rowToResponse(userInfoRow, tokenExpiration),
    );

    const userEntities = await catalogEntityStore.getUserEntities();
    for (const userInfo of users) {
      const entity = userEntities.get(userInfo.userEntityRef);
      if (entity?.spec?.profile) {
        userInfo.displayName = (entity.spec.profile as any)
          .displayName as string;
        userInfo.email = (entity.spec.profile as any).email as string;
      }
    }

    if (request.headers['content-type']?.includes('text/csv')) {
      try {
        const csv = await json2csv(users, {
          keys: ['userEntityRef', 'displayName', 'email', 'lastAuthTime'],
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

  const authRoter = await authCreateRouter({
    logger,
    database,
    config,
    discovery,
    tokenManager,
    auth,
    httpAuth,
    providerFactories,
    disableDefaultProviderFactories,
    catalogApi,
    ownershipResolver,
  });

  router.use(authRoter);

  return router;
}

export function rowToResponse(
  userInfoRow: UserInfoRow,
  tokenExpirationSeconds: number,
): UserInfoResponse {
  let tokenExpirationDate = DateTime.fromSQL(userInfoRow.exp, {
    zone: 'utc',
  });

  if (!tokenExpirationDate.isValid) {
    tokenExpirationDate = DateTime.fromJSDate(new Date(userInfoRow.exp), {
      zone: 'utc',
    });
  }

  // Validate the date
  if (!tokenExpirationDate.isValid) {
    throw new Error(
      'Failed to parse expiration date format in userInfoRow.exp',
    );
  }

  const tokenExpirationMillis = tokenExpirationSeconds * 1000;
  const tokenIssuedTime =
    tokenExpirationDate.toMillis() - tokenExpirationMillis;
  return {
    userEntityRef: userInfoRow.user_entity_ref,
    lastAuthTime: new Date(tokenIssuedTime).toUTCString(),
  };
}

export async function permissionCheck(
  permissions: PermissionsService,
  credentials: BackstageCredentials,
) {
  const decision = (
    await permissions.authorize(
      [
        {
          permission: policyEntityReadPermission,
          resourceRef: policyEntityReadPermission.resourceType,
        },
      ],
      {
        credentials,
      },
    )
  )[0];

  if (decision.result === AuthorizeResult.DENY) {
    throw new NotAllowedError('Unauthorized');
  }
}
