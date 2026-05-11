const { createConnection } = require('./database');

async function probarConexion() {
  try {
    console.log('Probando conexión a la base de datos...');
    const connection = await createConnection();
    
    // Probar consulta simple
    const [result] = await connection.execute('SELECT COUNT(*) as total FROM cotizaciones');
    console.log('✅ Conexión exitosa. Total cotizaciones:', result[0].total);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

probarConexion();