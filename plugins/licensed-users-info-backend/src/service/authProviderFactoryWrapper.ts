import {
  AuthProviderFactory,
  AuthProviderRouteHandlers,
} from '@backstage/plugin-auth-node';
import { Request, Response } from 'express';

class AuthProviderRouteHandlersWrapper implements AuthProviderRouteHandlers {
  constructor(private readonly originalHandler: AuthProviderRouteHandlers) {}

  async start(req: Request, res: Response): Promise<void> {
    await this.originalHandler.start(req, res);

    console.log('==== start!');
  }

  async frameHandler(req: Request, res: Response): Promise<void> {
    await this.originalHandler.frameHandler(req, res);
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

export function signInWrapper(
  authProviderFactory: AuthProviderFactory,
): AuthProviderFactory {
  return (options): AuthProviderRouteHandlers => {
    const handlers = authProviderFactory(options);
    return new AuthProviderRouteHandlersWrapper(handlers);
  };
}
