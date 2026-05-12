const express = require('express');
const { createConnection } = require('./database');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta principal - Vista administrador
app.get('/', (req, res) => {
  res.render('admin', { title: 'Administrador - LabSuperFood' });
});

// Rutas para cotizaciones
app.post('/cotizaciones', async (req, res) => {
  let connection;
  try {
    console.log('=== GUARDANDO COTIZACIÓN ===');
    console.log('Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    const { cliente_id, items, total, abono, saldo } = req.body;
    
    // Validaciones
    if (!cliente_id) {
      console.log('Error: cliente_id no proporcionado');
      return res.json({ success: false, message: 'Cliente ID requerido' });
    }
    
    if (!items || items.length === 0) {
      console.log('Error: items vacío o no proporcionado');
      return res.json({ success: false, message: 'Items requeridos' });
    }
    
    console.log('Conectando a base de datos...');
    connection = await createConnection();
    console.log('Conexión establecida');
    
    // Insertar cotización
    console.log('Insertando cotización...');
    const [result] = await connection.execute(
      'INSERT INTO cotizaciones (cliente_id, total, abono, saldo) VALUES (?, ?, ?, ?)',
      [cliente_id, total, abono, saldo]
    );
    
    const cotizacionId = result.insertId;
    console.log('Cotización insertada con ID:', cotizacionId);
    
    // Insertar detalles
    console.log('Insertando detalles...');
    for (const item of items) {
      console.log('Insertando item:', item);
      await connection.execute(
        'INSERT INTO detalle_cotizaciones (cotizacion_id, producto_id, cantidad, precio_unitario, total) VALUES (?, ?, ?, ?, ?)',
        [cotizacionId, item.producto_id, item.cantidad, item.precio, item.total]
      );
    }
    
    console.log('Todos los detalles insertados');
    await connection.end();
    console.log('=== COTIZACIÓN GUARDADA EXITOSAMENTE ===');
    
    res.json({ success: true, message: 'Cotización guardada correctamente', id: cotizacionId });
  } catch (error) {
    console.error('=== ERROR AL GUARDAR COTIZACIÓN ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error cerrando conexión:', closeError);
      }
    }
    
    res.json({ success: false, message: 'Error al guardar cotización: ' + error.message });
  }
});

app.get('/cotizaciones', async (req, res) => {
  try {
    const connection = await createConnection();
    const [cotizaciones] = await connection.execute(`
      SELECT c.*, cl.razon_social, cl.dni_ruc 
      FROM cotizaciones c 
      JOIN clientes cl ON c.cliente_id = cl.id 
      ORDER BY c.created_at DESC
    `);
    await connection.end();
    res.json(cotizaciones);
  } catch (error) {
    console.error('Error:', error);
    res.json([]);
  }
});

app.get('/cotizaciones/:id/detalle', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    
    // Obtener cotización con cliente
    const [cotizacion] = await connection.execute(`
      SELECT c.*, cl.razon_social, cl.dni_ruc, cl.distrito, cl.direccion, cl.telefono
      FROM cotizaciones c 
      JOIN clientes cl ON c.cliente_id = cl.id 
      WHERE c.id = ?
    `, [id]);
    
    // Obtener detalles
    const [detalles] = await connection.execute(`
      SELECT dc.*, p.nombre as producto_nombre
      FROM detalle_cotizaciones dc
      JOIN productos p ON dc.producto_id = p.id
      WHERE dc.cotizacion_id = ?
    `, [id]);
    
    await connection.end();
    
    if (cotizacion.length === 0) {
      return res.json({ success: false, message: 'Cotización no encontrada' });
    }
    
    res.json({ 
      success: true, 
      cotizacion: cotizacion[0], 
      detalles: detalles 
    });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al obtener detalle' });
  }
});

app.put('/cotizaciones/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const connection = await createConnection();
    
    await connection.execute(
      'UPDATE cotizaciones SET estado = ? WHERE id = ?',
      [estado, id]
    );
    
    await connection.end();
    res.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al actualizar estado' });
  }
});

app.put('/cotizaciones/:id', async (req, res) => {
  let connection;
  try {
    console.log('=== ACTUALIZANDO COTIZACIÓN ===');
    const { id } = req.params;
    const { cliente_id, items, total, abono, saldo } = req.body;
    
    console.log('ID cotización:', id);
    console.log('Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    connection = await createConnection();
    
    // Actualizar cotización
    await connection.execute(
      'UPDATE cotizaciones SET cliente_id = ?, total = ?, abono = ?, saldo = ? WHERE id = ?',
      [cliente_id, total, abono, saldo, id]
    );
    
    // Eliminar detalles existentes
    await connection.execute('DELETE FROM detalle_cotizaciones WHERE cotizacion_id = ?', [id]);
    
    // Insertar nuevos detalles
    for (const item of items) {
      await connection.execute(
        'INSERT INTO detalle_cotizaciones (cotizacion_id, producto_id, cantidad, precio_unitario, total) VALUES (?, ?, ?, ?, ?)',
        [id, item.producto_id, item.cantidad, item.precio, item.total]
      );
    }
    
    await connection.end();
    console.log('=== COTIZACIÓN ACTUALIZADA EXITOSAMENTE ===');
    
    res.json({ success: true, message: 'Cotización actualizada correctamente' });
  } catch (error) {
    console.error('=== ERROR AL ACTUALIZAR COTIZACIÓN ===');
    console.error('Error completo:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error cerrando conexión:', closeError);
      }
    }
    
    res.json({ success: false, message: 'Error al actualizar cotización: ' + error.message });
  }
});

// Ruta para generar PDF
app.get('/cotizaciones/:id/pdf', async (req, res) => {
  let connection;
  let browser;
  
  try {
    const { id } = req.params;
    console.log('=== GENERANDO PDF ===');
    console.log('ID Cotización:', id);
    console.log('User-Agent:', req.headers['user-agent']);
    
    connection = await createConnection();
    console.log('Conexión a BD establecida');
    
    // Obtener cotización con cliente
    const [cotizacion] = await connection.execute(`
      SELECT c.*, cl.razon_social, cl.dni_ruc, cl.distrito, cl.direccion, cl.telefono
      FROM cotizaciones c 
      JOIN clientes cl ON c.cliente_id = cl.id 
      WHERE c.id = ?
    `, [id]);
    
    if (cotizacion.length === 0) {
      console.log('Cotización no encontrada:', id);
      await connection.end();
      res.status(404);
      res.setHeader('Content-Type', 'text/plain');
      return res.end('Cotización no encontrada');
    }
    
    console.log('Cotización encontrada:', cotizacion[0].id);
    
    // Obtener detalles
    const [detalles] = await connection.execute(`
      SELECT dc.*, p.nombre as producto_nombre
      FROM detalle_cotizaciones dc
      JOIN productos p ON dc.producto_id = p.id
      WHERE dc.cotizacion_id = ?
    `, [id]);
    
    console.log('Detalles encontrados:', detalles.length);
    
    // Obtener cuentas bancarias activas
    const [cuentasBancarias] = await connection.execute(`
      SELECT * FROM configuracion_bancaria WHERE activo = TRUE ORDER BY created_at ASC
    `);
    
    console.log('Cuentas bancarias:', cuentasBancarias.length);
    
    await connection.end();
    connection = null;
    
    // Renderizar HTML
    console.log('Renderizando HTML...');
    const html = await new Promise((resolve, reject) => {
      res.app.render('cotizacion-pdf', {
        cotizacion: cotizacion[0],
        detalles: detalles,
        cuentasBancarias: cuentasBancarias
      }, (err, html) => {
        if (err) {
          console.error('Error renderizando template:', err);
          reject(err);
        } else {
          console.log('HTML renderizado exitosamente, longitud:', html.length);
          resolve(html);
        }
      });
    });
    
    // Detectar si es móvil para ajustar configuración de Puppeteer
    const userAgent = req.headers['user-agent'] || '';
    const esMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    console.log('Es móvil:', esMobile);
    console.log('Iniciando Puppeteer...');
    
    // Configuración de Puppeteer optimizada
    const puppeteerConfig = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };
    
    // Para móviles, usar configuración más simple
    if (esMobile) {
      puppeteerConfig.args = ['--no-sandbox', '--disable-setuid-sandbox'];
    }
    
    browser = await puppeteer.launch(puppeteerConfig);
    console.log('Puppeteer iniciado');
    
    const page = await browser.newPage();
    console.log('Nueva página creada');
    
    // Configurar página
    await page.setViewport({ width: 1200, height: 800 });
    console.log('Viewport configurado');
    
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    console.log('Contenido HTML cargado');
    
    console.log('Generando PDF...');
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 15000
    });
    
    await browser.close();
    browser = null;
    
    console.log('PDF generado exitosamente, tamaño:', pdf.length, 'bytes');
    
    // Configurar headers y enviar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdf.length);
    res.setHeader('Content-Disposition', `inline; filename="Cotizacion-${id.toString().padStart(6, '0')}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.end(pdf);
    console.log('=== PDF ENVIADO EXITOSAMENTE ===');
    
  } catch (error) {
    console.error('=== ERROR GENERANDO PDF ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (browser) {
      try {
        console.log('Cerrando browser...');
        await browser.close();
      } catch (closeError) {
        console.error('Error cerrando browser:', closeError);
      }
    }
    
    if (connection) {
      try {
        console.log('Cerrando conexión BD...');
        await connection.end();
      } catch (closeError) {
        console.error('Error cerrando conexión:', closeError);
      }
    }
    
    // Enviar error detallado
    if (!res.headersSent) {
      res.status(500);
      res.setHeader('Content-Type', 'text/plain');
      res.end(`Error generando PDF: ${error.message}`);
    }
    
    console.log('=== FIN ERROR PDF ===');
  }
});

// Ruta alternativa para PDF en móviles (sin Puppeteer)
app.get('/cotizaciones/:id/pdf-simple', async (req, res) => {
  let connection;
  
  try {
    const { id } = req.params;
    console.log('=== GENERANDO PDF SIMPLE PARA MÓVIL ===');
    console.log('ID Cotización:', id);
    
    connection = await createConnection();
    
    // Obtener cotización con cliente
    const [cotizacion] = await connection.execute(`
      SELECT c.*, cl.razon_social, cl.dni_ruc, cl.distrito, cl.direccion, cl.telefono
      FROM cotizaciones c 
      JOIN clientes cl ON c.cliente_id = cl.id 
      WHERE c.id = ?
    `, [id]);
    
    if (cotizacion.length === 0) {
      await connection.end();
      res.status(404);
      res.setHeader('Content-Type', 'text/html');
      return res.end('<h1>Cotización no encontrada</h1>');
    }
    
    // Obtener detalles
    const [detalles] = await connection.execute(`
      SELECT dc.*, p.nombre as producto_nombre
      FROM detalle_cotizaciones dc
      JOIN productos p ON dc.producto_id = p.id
      WHERE dc.cotizacion_id = ?
    `, [id]);
    
    // Obtener cuentas bancarias activas
    const [cuentasBancarias] = await connection.execute(`
      SELECT * FROM configuracion_bancaria WHERE activo = TRUE ORDER BY created_at ASC
    `);
    
    await connection.end();
    
    // Renderizar HTML directamente (sin PDF)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    
    res.render('cotizacion-pdf', {
      cotizacion: cotizacion[0],
      detalles: detalles,
      cuentasBancarias: cuentasBancarias
    });
    
    console.log('=== HTML SIMPLE ENVIADO ===');
    
  } catch (error) {
    console.error('Error en PDF simple:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error cerrando conexión:', closeError);
      }
    }
    
    res.status(500);
    res.setHeader('Content-Type', 'text/html');
    res.end(`<h1>Error: ${error.message}</h1>`);
  }
});

// Rutas para configuración bancaria
app.post('/configuracion-bancaria', async (req, res) => {
  try {
    const { banco, tipo_cuenta, numero_cuenta, cci, titular } = req.body;
    const connection = await createConnection();
    
    await connection.execute(
      'INSERT INTO configuracion_bancaria (banco, tipo_cuenta, numero_cuenta, cci, titular) VALUES (?, ?, ?, ?, ?)',
      [banco, tipo_cuenta, numero_cuenta, cci || null, titular]
    );
    
    await connection.end();
    res.json({ success: true, message: 'Cuenta bancaria agregada correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al agregar cuenta bancaria' });
  }
});

app.get('/configuracion-bancaria', async (req, res) => {
  try {
    const connection = await createConnection();
    const [cuentas] = await connection.execute('SELECT * FROM configuracion_bancaria ORDER BY created_at DESC');
    await connection.end();
    res.json(cuentas);
  } catch (error) {
    console.error('Error:', error);
    res.json([]);
  }
});

app.put('/configuracion-bancaria/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { banco, tipo_cuenta, numero_cuenta, cci, titular } = req.body;
    const connection = await createConnection();
    
    await connection.execute(
      'UPDATE configuracion_bancaria SET banco = ?, tipo_cuenta = ?, numero_cuenta = ?, cci = ?, titular = ? WHERE id = ?',
      [banco, tipo_cuenta, numero_cuenta, cci || null, titular, id]
    );
    
    await connection.end();
    res.json({ success: true, message: 'Cuenta bancaria actualizada correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al actualizar cuenta bancaria' });
  }
});

app.put('/configuracion-bancaria/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const connection = await createConnection();
    
    await connection.execute(
      'UPDATE configuracion_bancaria SET activo = ? WHERE id = ?',
      [activo, id]
    );
    
    await connection.end();
    res.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al actualizar estado' });
  }
});

app.delete('/configuracion-bancaria/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    
    await connection.execute('DELETE FROM configuracion_bancaria WHERE id = ?', [id]);
    
    await connection.end();
    res.json({ success: true, message: 'Cuenta bancaria eliminada correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al eliminar cuenta bancaria' });
  }
});

// Rutas para productos
app.post('/productos', async (req, res) => {
  try {
    const { nombre, precio } = req.body;
    const connection = await createConnection();
    
    await connection.execute(
      'INSERT INTO productos (nombre, precio) VALUES (?, ?)',
      [nombre, precio]
    );
    
    await connection.end();
    res.json({ success: true, message: 'Producto agregado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al agregar producto' });
  }
});

app.get('/productos', async (req, res) => {
  try {
    const connection = await createConnection();
    const [productos] = await connection.execute('SELECT * FROM productos ORDER BY id DESC');
    await connection.end();
    res.json(productos);
  } catch (error) {
    console.error('Error:', error);
    res.json([]);
  }
});

app.put('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio } = req.body;
    const connection = await createConnection();
    
    await connection.execute(
      'UPDATE productos SET nombre = ?, precio = ? WHERE id = ?',
      [nombre, precio, id]
    );
    
    await connection.end();
    res.json({ success: true, message: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al actualizar producto' });
  }
});

app.delete('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    
    await connection.execute('DELETE FROM productos WHERE id = ?', [id]);
    
    await connection.end();
    res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al eliminar producto' });
  }
});

// Rutas para clientes
app.post('/clientes', async (req, res) => {
  try {
    const { razon_social, dni_ruc, distrito, direccion, telefono } = req.body;
    const connection = await createConnection();
    
    await connection.execute(
      'INSERT INTO clientes (razon_social, dni_ruc, distrito, direccion, telefono) VALUES (?, ?, ?, ?, ?)',
      [razon_social, dni_ruc, distrito, direccion, telefono]
    );
    
    await connection.end();
    res.json({ success: true, message: 'Cliente agregado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al agregar cliente' });
  }
});

app.get('/clientes', async (req, res) => {
  try {
    const connection = await createConnection();
    const [clientes] = await connection.execute('SELECT * FROM clientes ORDER BY id DESC');
    await connection.end();
    res.json(clientes);
  } catch (error) {
    console.error('Error:', error);
    res.json([]);
  }
});

app.put('/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { razon_social, dni_ruc, distrito, direccion, telefono } = req.body;
    const connection = await createConnection();
    
    await connection.execute(
      'UPDATE clientes SET razon_social = ?, dni_ruc = ?, distrito = ?, direccion = ?, telefono = ? WHERE id = ?',
      [razon_social, dni_ruc, distrito, direccion, telefono, id]
    );
    
    await connection.end();
    res.json({ success: true, message: 'Cliente actualizado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al actualizar cliente' });
  }
});

app.delete('/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    
    await connection.execute('DELETE FROM clientes WHERE id = ?', [id]);
    
    await connection.end();
    res.json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, message: 'Error al eliminar cliente' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});