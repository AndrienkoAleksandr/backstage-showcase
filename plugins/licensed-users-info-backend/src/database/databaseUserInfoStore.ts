import { Knex } from 'knex';

// todo: move to the common package
export type UserInfo = {
  id: string;
  email: string;
  displayName: string;
  picture?: string;
};

export type UserInfoRow = {
  firstTimeLogin: string;
  lastTimeLogin: string;
  userEntityRef: string;
  firstName: string;
  lastName: string;
};

export interface UserInfoStore {
  getUserByReference(userEntityRef: string): Promise<UserInfo | undefined>;
  getListUsers(): Promise<UserInfo[]>;
  getQuantityUsers(): Promise<number>;
}

export class DatabaseUserInfoStore implements UserInfoStore {
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
    return [];
    // const users = await this.database<UserInfoRow>('users').where('email', email);
    // return users.map(user => ({
    //   id: user.id,
    //   email: user.email,
    //   displayName: user.display_name,
    //   picture: user.picture,
    // }));
  }

  async getQuantityUsers(): Promise<number> {
    return 0;
    // return this.database<UserInfoRow>('users').count('id').first();
  }
}
