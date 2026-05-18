require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: '-05:00'
};

async function createConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Conexión a MySQL establecida correctamente');
    return connection;
  } catch (error) {
    console.error('Error conectando a MySQL:', error);
    throw error;
  }
}

module.exports = { createConnection };