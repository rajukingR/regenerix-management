require('dotenv').config();
const lite = process.env.DB_CLIENT === 'better-sqlite3'; // used only for local testing
module.exports = {
  client: process.env.DB_CLIENT || 'mysql2',
  connection: lite ? { filename: process.env.DB_FILE || './dev.sqlite3' } : {
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4', dateStrings: ['DATE'] },
  useNullAsDefault: true,
  migrations: { directory: './migrations' },
};
