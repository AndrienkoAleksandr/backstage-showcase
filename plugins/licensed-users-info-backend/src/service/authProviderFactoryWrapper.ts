import {
  AuthProviderFactory,
  AuthProviderRouteHandlers,
} from '@backstage/plugin-auth-node';
import { Request, Response } from 'express';
import {
  DatabaseUserInfoStore,
  UserInfoRow,
} from '../database/databaseUserInfoStore';
import {
  HttpAuthService,
  IdentityService,
} from '@backstage/backend-plugin-api';

class AuthProviderRouteHandlersWrapper implements AuthProviderRouteHandlers {
  constructor(
    private readonly originalHandler: AuthProviderRouteHandlers,
    private readonly userInfoStore: DatabaseUserInfoStore,
    private readonly identity: IdentityService,
    private readonly httpAuth: HttpAuthService,
  ) {
    console.log(`==== Who: ${userInfoStore}`);
  }

  async start(request: Request, response: Response): Promise<void> {
    // start original login
    await this.originalHandler.start(request, response);

    console.log(
      `==== start!  request : ${request.url} and headers: ${JSON.stringify(request.headers)}`,
    );
    try {
      const cred = await this.httpAuth.credentials(request);
      console.log(`==== Principial ${JSON.stringify(cred.principal)}`);
      const userIdentity = await this.identity.getIdentity({ request });
      if (userIdentity) {
        const now = new Date();
        const loginRaw: UserInfoRow = {
          user_entity_ref: userIdentity.identity.userEntityRef,
          first_recorded_login_at: now,
          last_recorded_login_at: now,
        };
        await this.userInfoStore.addUserLogInInfo(loginRaw);
      } else {
        console.error(`==== No user`);
      }

      console.log(`==== start! ${JSON.stringify(response.getHeaders())}`);
    } catch (err) {
      console.error('==== start error', err); // todo use normal logger
    }
  }

  async frameHandler(req: Request, res: Response): Promise<void> {
    console.log(
      `==== frameHandler request: ${req.url} ${JSON.stringify(req.headers)}`,
    );
    await this.originalHandler.frameHandler(req, res);
    console.log(
      `==== frameHandler response: ${JSON.stringify(res.getHeaders())} `,
    );
  }

  async refresh(req: Request, res: Response): Promise<void> {
    if (this.originalHandler.refresh) {
      this.originalHandler.refresh(req, res);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    if (this.originalHandler.logout) {
      await this.originalHandler.logout(req, res);
    }
  }
}

export function customAuthProviderHandlers(
  providers: Map<string, AuthProviderFactory>,
  userInfoStore: DatabaseUserInfoStore,
  idenitity: IdentityService,
  httpAuth: HttpAuthService,
): { [key: string]: AuthProviderFactory } {
  const wrappedProviders = Array.from(
    providers.entries(),
    ([key, providerFactory]) => [
      key,
      wrapProviderFactory(providerFactory, userInfoStore, idenitity, httpAuth),
    ],
  );
  return Object.fromEntries(wrappedProviders);
}

function wrapProviderFactory(
  authProviderFactory: AuthProviderFactory,
  userInfoStore: DatabaseUserInfoStore,
  idenitity: IdentityService,
  httpAuth: HttpAuthService,
): AuthProviderFactory {
  return (options): AuthProviderRouteHandlers => {
    const handlers = authProviderFactory(options);
    return new AuthProviderRouteHandlersWrapper(
      handlers,
      userInfoStore,
      idenitity,
      httpAuth,
    );
  };
}
