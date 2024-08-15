import { Knex } from 'knex';

export type UserInfoRow = {
  user_entity_ref: string;
  user_info: string;
  exp: Date;
};

// todo: move to the common package
export type UserInfo = {
  // firstTimeLogin: string;
  // lastTimeLogin: string;
  userEntityRef: string;
};

export class DatabaseUserInfoStore {
  private readonly database: Knex;

  constructor(database: Knex) {
    this.database = database;
  }

  async getUserByReference(
    _userEntityRef: string,
  ): Promise<UserInfo | undefined> {
    console.log(this.database.VERSION);
    return undefined;
    // const user = await this.database<UserInfoRow>('users').where('id', userId).first();
    // if (!user) {
    //   return undefined;
    // }
    // return {
    //   id: user.id,
    //   email: user.email,
    //   displayName: user.display_name,
    //   picture: user.picture,
    // };
  }

  async getListUsers(): Promise<UserInfo[]> {
    const userInfos = await this.database<UserInfoRow>('user_info');
    return userInfos.map(userInfo => ({
      userEntityRef: userInfo.user_entity_ref,
    }));
  }

  async getQuantityUsers(): Promise<number> {
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
