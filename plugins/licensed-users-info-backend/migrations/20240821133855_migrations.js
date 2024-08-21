/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('user_statistics', table => {
    table.comment('Licenced users statistics');

    table
      .string('user_entity_ref')
      .primary()
      .notNullable()
      .comment('User entity reference');

    table
      .timestamp('first_recorded_login_at')
      .notNullable()
      .comment('First recorded login timestamp');

    table
      .timestamp('last_recorded_login_at')
      .notNullable()
      .comment('Last recorded login timestamp');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('user_statistics');
};
