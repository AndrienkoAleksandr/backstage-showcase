import { Knex } from 'knex';
import { Entity } from '@backstage/catalog-model';

export class CatalogEntityStore {
  private readonly database: Knex;

  constructor(database: Knex) {
    this.database = database;
  }

  async getUserEntities(): Promise<Map<string, Entity>> {
    const result = await this.database('final_entities').select('final_entity');
    // console.log(`before filter ${result.length}`);

    const entityMap: Map<string, Entity> = result.reduce((map, row) => {
      const entity = JSON.parse(row.final_entity);
      if (entity.kind === 'User' && entity.metadata && entity.metadata.name) {
        map.set(
          `user:default/${(entity.metadata.name as string).toLocaleLowerCase()}`,
          entity,
        );
      }
      return map;
    }, new Map());

    // console.log(`Filtered Entity Map:`, entityMap.size);

    return entityMap;
  }
}
