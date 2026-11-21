import mysql from 'mysql2/promise';

const required = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Faltan variables en server/.env: ${missing.join(', ')}`);
  process.exit(1);
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: ['DATE'],
});

// Todas las fechas se manejan en UTC para evitar desfases entre servidor y app.
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});
