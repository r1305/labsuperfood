const { createConnection } = require('./database');

async function inicializarBaseDatos() {
  let connection;
  
  try {
    console.log('Conectando a la base de datos...');
    connection = await createConnection();
    console.log('✅ Conexión establecida');

    // Crear tabla productos
    console.log('Creando tabla productos...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS productos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla productos creada');

    // Crear tabla clientes
    console.log('Creando tabla clientes...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        razon_social VARCHAR(255) NOT NULL,
        dni_ruc VARCHAR(20) NOT NULL,
        distrito VARCHAR(100) NOT NULL,
        direccion TEXT NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Crear tabla cotizaciones
    console.log('Creando tabla cotizaciones...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        abono DECIMAL(10,2) DEFAULT 0,
        saldo DECIMAL(10,2) NOT NULL,
        estado ENUM('pendiente', 'pagado', 'cancelado') DEFAULT 'pendiente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);
    console.log('✅ Tabla cotizaciones creada');

    // Crear tabla detalle_cotizaciones
    console.log('Creando tabla detalle_cotizaciones...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS detalle_cotizaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cotizacion_id INT NOT NULL,
        producto_id INT NOT NULL,
        cantidad DECIMAL(10,2) NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);
    console.log('✅ Tabla detalle_cotizaciones creada');

    // Crear tabla configuracion_bancaria
    console.log('Creando tabla configuracion_bancaria...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS configuracion_bancaria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        banco VARCHAR(100) NOT NULL,
        tipo_cuenta ENUM('ahorros', 'corriente') NOT NULL,
        numero_cuenta VARCHAR(50) NOT NULL,
        cci VARCHAR(50),
        titular VARCHAR(255) NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla configuracion_bancaria creada');

    // Crear tabla tipo_precio
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tipo_precio (
        id INT AUTO_INCREMENT PRIMARY KEY,
        producto_id INT NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
      )
    `);
    console.log('\u2705 Tabla tipo_precio creada');

    // Crear tabla etiquetas_cliente
    console.log('Creando tabla etiquetas_cliente...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS etiquetas_cliente (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        marca VARCHAR(100) NOT NULL,
        nombre_producto VARCHAR(255) NOT NULL,
        foto VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla etiquetas_cliente creada');

    // Verificar que las tablas existen
    console.log('Verificando tablas...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tablas en la base de datos:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

    // Insertar datos de prueba si las tablas están vacías
    const [productosCount] = await connection.execute('SELECT COUNT(*) as count FROM productos');
    if (productosCount[0].count === 0) {
      console.log('Insertando productos de prueba...');
      await connection.execute(`
        INSERT INTO productos (nombre, precio) VALUES 
        ('Producto Demo 1', 25.50),
        ('Producto Demo 2', 15.75)
      `);
      console.log('✅ Productos de prueba insertados');
    }

    const [clientesCount] = await connection.execute('SELECT COUNT(*) as count FROM clientes');
    if (clientesCount[0].count === 0) {
      console.log('Insertando clientes de prueba...');
      await connection.execute(`
        INSERT INTO clientes (razon_social, dni_ruc, distrito, direccion, telefono) VALUES 
        ('Cliente Demo S.A.C.', '20123456789', 'Lima', 'Av. Demo 123', '987654321'),
        ('Cliente Prueba E.I.R.L.', '10987654321', 'Miraflores', 'Jr. Prueba 456', '123456789')
      `);
      console.log('✅ Clientes de prueba insertados');
    }

    console.log('🎉 Base de datos inicializada correctamente');

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Verifica que el host sea correcto: bh8980.banahosting.com');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Verifica las credenciales de usuario y contraseña');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Verifica que el nombre de la base de datos sea correcto');
    }
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar el script
inicializarBaseDatos();