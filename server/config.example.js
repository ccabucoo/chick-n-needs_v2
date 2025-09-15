// Example configuration file for XAMPP MySQL
// Copy this to .env file and update the values

export const config = {
  // Database Configuration for XAMPP MySQL
  MYSQL_HOST: '127.0.0.1',
  MYSQL_PORT: 3306,
  MYSQL_DATABASE: 'chicknneeds',
  MYSQL_USER: 'root',
  MYSQL_PASSWORD: '',

  // Server Configuration
  PORT: 4000,
  NODE_ENV: 'development',

  // JWT Secret
  JWT_SECRET: 'your-secret-key-here',

  // Frontend URL
  FRONTEND_URL: 'http://localhost:5173',
  PUBLIC_APP_URL: 'http://localhost:5173'
};
