import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

/**
 * licensedUsersInfoPlugin backend plugin
 *
 * @public
 */
export const licensedUsersInfoPlugin = createBackendPlugin({
  pluginId: 'licensed-users-info',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        database: coreServices.database,
      },
      async init({ httpRouter, logger, config, database }) {
        httpRouter.use(
          await createRouter({
            logger,
            config,
            database,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
