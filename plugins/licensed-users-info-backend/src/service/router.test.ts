import { mockServices } from '@backstage/backend-test-utils';
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';
import { CatalogApi } from '@backstage/catalog-client';

const mockCatalogApi: jest.Mocked<CatalogApi> = {
  getEntities: jest.fn(),
  addLocation: jest.fn(),
  getLocationById: jest.fn(),
  removeLocationById: jest.fn(),
  getLocationByEntity: jest.fn(),
  getEntityAncestors: jest.fn(),
  getEntitiesByRefs: jest.fn(),
  getEntityByRef: jest.fn(),
  getEntityFacets: jest.fn(),
  getLocationByRef: jest.fn(),
  queryEntities: jest.fn(),
  refreshEntity: jest.fn(),
  removeEntityByUid: jest.fn(),
  validateEntity: jest.fn(),
};

jest.mock('@backstage/plugin-auth-backend', () => ({
  createRouter: jest.fn(() => {
    const router = express.Router();
    // Define routes or middleware here if needed
    return router;
  }),
}));

jest.mock('@backstage/backend-defaults/database', () => ({
  DatabaseManager: {
    fromConfig: jest.fn().mockReturnValue({
      forPlugin: jest.fn().mockReturnValue({
        getClient: jest.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig(),
      auth: mockServices.auth.mock(),
      discovery: mockServices.discovery.mock(),
      permissions: mockServices.permissions.mock(),
      httpAuth: mockServices.httpAuth.mock(),
      database: mockServices.database.mock(),
      tokenManager: mockServices.tokenManager.mock(),
      disableDefaultProviderFactories: true,
      catalogApi: mockCatalogApi,
      ownershipResolver: undefined,
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
