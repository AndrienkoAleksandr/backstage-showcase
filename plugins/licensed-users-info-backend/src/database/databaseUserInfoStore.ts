import { Knex } from 'knex';
import { readBackstageTokenExpiration } from '../service/readBackstageTokenExpiration';
import { RootConfigService } from '@backstage/backend-plugin-api';
import { UserInfoResponse } from '../service/router';

export type UserInfoRow = {
  user_entity_ref: string;
  user_info: string;
  exp: Date;
};

export class DatabaseUserInfoStore {
  constructor(
    private readonly database: Knex,
    private readonly config: RootConfigService,
  ) {
    this.database = database;
  }

  // async getUserByReference(
  //   userEntityRef: string,
  // ): Promise<UserInfoRow | undefined> {
  //   return await this.database<UserInfoRow>('user_info').where('entity_ref', userEntityRef).first();
  // }

  async getListUsers(): Promise<UserInfoResponse[]> {
    const tokenExpiration = readBackstageTokenExpiration(this.config);
    const userInfos = await this.database<UserInfoRow>('user_info');
    return userInfos.map(userInfo => ({
      userEntityRef: userInfo.user_entity_ref,
      lastTimeLogin: new Date(
        userInfo.exp.getTime() - tokenExpiration,
      ).toUTCString(),
    }));
  }

  async getQuantityRecordedActiveUsers(): Promise<number> {
    // Perform the count query with an alias for the count result
    const result = await this.database<UserInfoRow>('user_info')
      .count<{ count: number }>('user_entity_ref as count')
      .first();

    // Check if the result is valid and contains the count
    if (!result || result.count === undefined) {
      throw new Error('No user info found');
    }

    // Return the count as a number
    return result.count;
  }
}
