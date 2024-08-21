import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';
import {
  authOwnershipResolutionExtensionPoint,
  AuthOwnershipResolver,
  AuthProviderFactory,
  authProvidersExtensionPoint,
} from '@backstage/plugin-auth-node';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';
import { signInWrapper } from './service/authProviderFactoryWrapper';

/**
 * licensedUsersInfoPlugin backend plugin
 *
 * @public
 */
export const licensedUsersInfoPlugin = createBackendPlugin({
  pluginId: 'auth',
  register(env) {
    const providers = new Map<string, AuthProviderFactory>();
    let ownershipResolver: AuthOwnershipResolver | undefined = undefined;

    env.registerExtensionPoint(authProvidersExtensionPoint, {
      registerProvider({ providerId, factory }) {
        if (providers.has(providerId)) {
          throw new Error(
            `Auth provider '${providerId}' was already registered`,
          );
        }
        providers.set(providerId, factory);
      },
    });

    env.registerExtensionPoint(authOwnershipResolutionExtensionPoint, {
      setAuthOwnershipResolver(resolver) {
        if (ownershipResolver) {
          throw new Error('Auth ownership resolver is already set');
        }
        ownershipResolver = resolver;
      },
    });

    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        auth: coreServices.auth,
        discovery: coreServices.discovery,
        permissions: coreServices.permissions,
        httpAuth: coreServices.httpAuth,
        database: coreServices.database,
        tokenManager: coreServices.tokenManager,
        catalogApi: catalogServiceRef,
      },
      async init({
        httpRouter,
        logger,
        config,
        auth,
        discovery,
        permissions,
        httpAuth,
        database,
        tokenManager,
        catalogApi,
      }) {
        httpRouter.use(
          await createRouter({
            logger,
            config,
            auth,
            discovery,
            permissions,
            httpAuth,
            database,
            tokenManager,
            providerFactories: Object.fromEntries(
              Array.from(providers.entries(), ([key, providerFactory]) => [
                key,
                signInWrapper(providerFactory),
              ]),
            ),
            disableDefaultProviderFactories: true,
            catalogApi,
            ownershipResolver,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
