const { createConnection } = require('./database');

async function main() {
  try {
    const connection = await createConnection();
    
    // Ejemplo de consulta
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('Prueba de conexión exitosa:', rows);
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();