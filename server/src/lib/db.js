import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'chicknneeds',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || '',
  {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    define: { underscored: true }
  }
);


