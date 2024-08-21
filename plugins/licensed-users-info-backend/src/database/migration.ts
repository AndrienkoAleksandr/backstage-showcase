import { resolvePackagePath } from '@backstage/backend-plugin-api';
import { DatabaseService } from '@backstage/backend-plugin-api';

const pluginAuthMigrationsDir = resolvePackagePath(
  '@backstage/plugin-auth-backend',
  'migrations',
);
const statisticsMigrationsDir = resolvePackagePath(
  '@internal/backstage-plugin-licensed-users-info-backend', // Package name
  'migrations', // Migrations directory
);

export async function migrate(database: DatabaseService) {
  const knex = await database.getClient();

  if (!database.migrations?.skip) {
    await knex.migrate.latest({
      directory: [pluginAuthMigrationsDir, statisticsMigrationsDir],
    });
  }
}
