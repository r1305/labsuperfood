const express = require('express');
const { createConnection } = require('./database');
const path = require('path');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const multer = require('multer');

// Configuración de multer para subida de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'uploads', 'etiquetas');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `etiqueta_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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
    const { cliente_id, company_id, items, total, abono, saldo } = req.body;
    if (!cliente_id) return res.json({ success: false, message: 'Cliente ID requerido' });
    if (!items || items.length === 0) return res.json({ success: false, message: 'Items requeridos' });
    connection = await createConnection();
    const [result] = await connection.execute(
      'INSERT INTO cotizaciones (cliente_id, company_id, total, abono, saldo) VALUES (?, ?, ?, ?, ?)',
      [cliente_id, company_id || 1, total, abono, saldo]
    );
    const cotizacionId = result.insertId;
    for (const item of items) {
      await connection.execute(
        'INSERT INTO detalle_cotizaciones (cotizacion_id, producto_id, cantidad, precio_unitario, total) VALUES (?, ?, ?, ?, ?)',
        [cotizacionId, item.producto_id, item.cantidad, item.precio, item.total]
      );
    }
    await connection.end();
    res.json({ success: true, message: 'Cotización guardada correctamente', id: cotizacionId });
  } catch (error) {
    if (connection) try { await connection.end(); } catch (e) {}
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
    res.json([]);
  }
});

app.get('/cotizaciones/:id/detalle', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    const [cotizacion] = await connection.execute(`
      SELECT c.*, cl.razon_social, cl.dni_ruc, cl.distrito, cl.direccion, cl.telefono
      FROM cotizaciones c 
      JOIN clientes cl ON c.cliente_id = cl.id 
      WHERE c.id = ?
    `, [id]);
    const [detalles] = await connection.execute(`
      SELECT dc.*, p.nombre as producto_nombre
      FROM detalle_cotizaciones dc
      JOIN productos p ON dc.producto_id = p.id
      WHERE dc.cotizacion_id = ?
    `, [id]);
    await connection.end();
    if (cotizacion.length === 0) return res.json({ success: false, message: 'Cotización no encontrada' });
    res.json({ success: true, cotizacion: cotizacion[0], detalles });
  } catch (error) {
    res.json({ success: false, message: 'Error al obtener detalle' });
  }
});

app.delete('/cotizaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    await connection.execute('DELETE FROM detalle_cotizaciones WHERE cotizacion_id = ?', [id]);
    await connection.execute('DELETE FROM cotizaciones WHERE id = ?', [id]);
    await connection.end();
    res.json({ success: true, message: 'Cotización eliminada correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al eliminar cotización' });
  }
});

app.put('/cotizaciones/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const connection = await createConnection();
    await connection.execute('UPDATE cotizaciones SET estado = ? WHERE id = ?', [estado, id]);
    await connection.end();
    res.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al actualizar estado' });
  }
});

app.put('/cotizaciones/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { cliente_id, company_id, items, total, abono, saldo } = req.body;
    connection = await createConnection();
    await connection.execute(
      'UPDATE cotizaciones SET cliente_id = ?, company_id = ?, total = ?, abono = ?, saldo = ? WHERE id = ?',
      [cliente_id, company_id || 1, total, abono, saldo, id]
    );
    await connection.execute('DELETE FROM detalle_cotizaciones WHERE cotizacion_id = ?', [id]);
    for (const item of items) {
      await connection.execute(
        'INSERT INTO detalle_cotizaciones (cotizacion_id, producto_id, cantidad, precio_unitario, total) VALUES (?, ?, ?, ?, ?)',
        [id, item.producto_id, item.cantidad, item.precio, item.total]
      );
    }
    await connection.end();
    res.json({ success: true, message: 'Cotización actualizada correctamente' });
  } catch (error) {
    if (connection) try { await connection.end(); } catch (e) {}
    res.json({ success: false, message: 'Error al actualizar cotización: ' + error.message });
  }
});

// Helper para obtener datos de cotización
async function getDatosCotizacion(id) {
  const connection = await createConnection();
  const [cotizacion] = await connection.execute(`
    SELECT c.*, cl.razon_social, cl.dni_ruc, cl.distrito, cl.direccion, cl.telefono,
      co.razon_social as company_nombre, co.ruc_dni as company_ruc
    FROM cotizaciones c 
    JOIN clientes cl ON c.cliente_id = cl.id
    JOIN company co ON c.company_id = co.id
    WHERE c.id = ?
  `, [id]);
  if (cotizacion.length === 0) { await connection.end(); return null; }
  const [detalles] = await connection.execute(`
    SELECT dc.*, p.nombre as producto_nombre
    FROM detalle_cotizaciones dc
    JOIN productos p ON dc.producto_id = p.id
    WHERE dc.cotizacion_id = ?
  `, [id]);
  const [cuentasBancarias] = await connection.execute(
    'SELECT * FROM configuracion_bancaria WHERE activo = TRUE AND company_id = ? ORDER BY created_at ASC',
    [cotizacion[0].company_id]
  );
  await connection.end();
  console.log(`[PDF] cotizacion_id=${id} company_id=${cotizacion[0].company_id} bancos=${cuentasBancarias.length}`);
  return { cotizacion: cotizacion[0], detalles, cuentasBancarias };
}

// Ruta para generar PDF
app.get('/cotizaciones/:id/pdf', async (req, res) => {
  let browser;
  const { id } = req.params;
  try {
    const datos = await getDatosCotizacion(id);
    if (!datos) return res.status(404).send('Cotización no encontrada');

    const html = await new Promise((resolve, reject) => {
      res.app.render('cotizacion-pdf', datos, (err, html) => err ? reject(err) : resolve(html));
    });

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true
    });
    await browser.close();
    browser = null;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdf.length);
    res.setHeader('Content-Disposition', `inline; filename="Cotizacion-${id.toString().padStart(6, '0')}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(pdf);
  } catch (error) {
    console.error('ERROR PDF:', error.message);
    if (browser) try { await browser.close(); } catch (e) {}
    res.redirect(`/cotizaciones/${id}/pdf-simple`);
  }
});

// Ruta alternativa para PDF en móviles
app.get('/cotizaciones/:id/pdf-simple', async (req, res) => {
  const { id } = req.params;
  try {
    const datos = await getDatosCotizacion(id);
    if (!datos) return res.status(404).send('Cotización no encontrada');

    const html = await new Promise((resolve, reject) => {
      res.app.render('cotizacion-pdf', datos, (err, html) => err ? reject(err) : resolve(html));
    });

    const cotizacionId = datos.cotizacion.id.toString().padStart(6, '0');
    const htmlFinal = html
      .replace('</head>', `
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
      <script src="/js/pdf-download.js"></script>
      <style>
        #barra-descarga { position:fixed; top:0; left:0; right:0; background:#007bff; color:white; padding:10px 20px; display:flex; justify-content:space-between; align-items:center; z-index:9999; font-family:Arial,sans-serif; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
        #barra-descarga span { font-size:14px; font-weight:bold; }
        #barra-descarga button { background:white; color:#007bff; border:none; padding:8px 18px; border-radius:5px; font-size:14px; font-weight:bold; cursor:pointer; }
        body { padding-top:55px !important; }
        .footer { position:static !important; margin-top:20px !important; }
        @media print { #barra-descarga { display:none !important; } }
      </style>
      </head>`)
      .replace('<body>', `<body>
      <input type="hidden" id="pdf-filename" value="Cotizacion-${cotizacionId}.pdf">
      <div id="barra-descarga">
        <span>Cotización #${cotizacionId}</span>
        <button onclick="descargarPDF()" id="btnDescarga">⬇️ Descargar PDF</button>
      </div>
      <div id="contenido-pdf">`)
      .replace('</body>', '</div></body>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlFinal);
  } catch (error) {
    console.error('Error pdf-simple:', error.message);
    res.status(500).send(`<h1>Error: ${error.message}</h1>`);
  }
});

// Rutas para configuración bancaria
app.post('/configuracion-bancaria', async (req, res) => {
  try {
    const { banco, tipo_cuenta, numero_cuenta, cci, titular, company_id } = req.body;
    const connection = await createConnection();
    await connection.execute(
      'INSERT INTO configuracion_bancaria (banco, tipo_cuenta, numero_cuenta, cci, titular, company_id) VALUES (?, ?, ?, ?, ?, ?)',
      [banco, tipo_cuenta, numero_cuenta, cci || null, titular, company_id || 1]
    );
    await connection.end();
    res.json({ success: true, message: 'Cuenta bancaria agregada correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al agregar cuenta bancaria' });
  }
});

app.get('/configuracion-bancaria', async (req, res) => {
  try {
    const connection = await createConnection();
    const [cuentas] = await connection.execute(`
      SELECT cb.*, co.razon_social as company_nombre
      FROM configuracion_bancaria cb
      LEFT JOIN company co ON cb.company_id = co.id
      ORDER BY cb.created_at DESC
    `);
    await connection.end();
    res.json(cuentas);
  } catch (error) {
    res.json([]);
  }
});

app.put('/configuracion-bancaria/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { banco, tipo_cuenta, numero_cuenta, cci, titular, company_id } = req.body;
    const connection = await createConnection();
    await connection.execute(
      'UPDATE configuracion_bancaria SET banco = ?, tipo_cuenta = ?, numero_cuenta = ?, cci = ?, titular = ?, company_id = ? WHERE id = ?',
      [banco, tipo_cuenta, numero_cuenta, cci || null, titular, company_id || 1, id]
    );
    await connection.end();
    res.json({ success: true, message: 'Cuenta bancaria actualizada correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al actualizar cuenta bancaria' });
  }
});

app.put('/configuracion-bancaria/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const connection = await createConnection();
    await connection.execute('UPDATE configuracion_bancaria SET activo = ? WHERE id = ?', [activo, id]);
    await connection.end();
    res.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (error) {
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
    res.json({ success: false, message: 'Error al eliminar cuenta bancaria' });
  }
});

// Rutas para etiquetas de clientes
app.get('/clientes/:id/etiquetas', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    const [etiquetas] = await connection.execute(
      'SELECT * FROM etiquetas_cliente WHERE cliente_id = ? ORDER BY created_at DESC', [id]
    );
    await connection.end();
    res.json(etiquetas);
  } catch (error) {
    res.json([]);
  }
});

app.post('/clientes/:id/etiquetas', upload.single('foto'), async (req, res) => {
  try {
    const { id } = req.params;
    const { marca, nombre_producto } = req.body;
    const foto = req.file ? `/uploads/etiquetas/${req.file.filename}` : null;
    const connection = await createConnection();
    await connection.execute(
      'INSERT INTO etiquetas_cliente (cliente_id, marca, nombre_producto, foto) VALUES (?, ?, ?, ?)',
      [id, marca, nombre_producto, foto]
    );
    await connection.end();
    res.json({ success: true, message: 'Etiqueta agregada correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al agregar etiqueta' });
  }
});

app.delete('/etiquetas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    const [rows] = await connection.execute('SELECT foto FROM etiquetas_cliente WHERE id = ?', [id]);
    if (rows.length > 0 && rows[0].foto) {
      const fotoPath = path.join(__dirname, 'public', rows[0].foto);
      if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
    }
    await connection.execute('DELETE FROM etiquetas_cliente WHERE id = ?', [id]);
    await connection.end();
    res.json({ success: true, message: 'Etiqueta eliminada correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al eliminar etiqueta' });
  }
});

// Rutas para tipo_precio
app.get('/productos/:id/tipos-precio', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    const [tipos] = await connection.execute(
      'SELECT * FROM tipo_precio WHERE producto_id = ? ORDER BY tipo ASC', [id]
    );
    await connection.end();
    res.json(tipos);
  } catch (error) {
    res.json([]);
  }
});

app.post('/productos/:id/tipos-precio', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, precio } = req.body;
    const connection = await createConnection();
    await connection.execute('INSERT INTO tipo_precio (producto_id, tipo, precio) VALUES (?, ?, ?)', [id, tipo, precio]);
    await connection.end();
    res.json({ success: true, message: 'Tipo de precio agregado correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al agregar tipo de precio' });
  }
});

app.put('/tipos-precio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, precio } = req.body;
    const connection = await createConnection();
    await connection.execute('UPDATE tipo_precio SET tipo = ?, precio = ? WHERE id = ?', [tipo, precio, id]);
    await connection.end();
    res.json({ success: true, message: 'Tipo de precio actualizado correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al actualizar tipo de precio' });
  }
});

app.delete('/tipos-precio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    await connection.execute('DELETE FROM tipo_precio WHERE id = ?', [id]);
    await connection.end();
    res.json({ success: true, message: 'Tipo de precio eliminado correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al eliminar tipo de precio' });
  }
});

// Rutas para productos
app.post('/productos', async (req, res) => {
  try {
    const { nombre, company_id } = req.body;
    const connection = await createConnection();
    await connection.execute('INSERT INTO productos (nombre, company_id) VALUES (?, ?)', [nombre, company_id || 1]);
    await connection.end();
    res.json({ success: true, message: 'Producto agregado correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al agregar producto' });
  }
});

app.get('/productos', async (req, res) => {
  try {
    const { company_id } = req.query;
    const connection = await createConnection();
    let query = `SELECT p.id, p.nombre, p.company_id, p.created_at, COUNT(tp.id) as total_tipos
      FROM productos p LEFT JOIN tipo_precio tp ON p.id = tp.producto_id`;
    const params = [];
    if (company_id) { query += ' WHERE p.company_id = ?'; params.push(company_id); }
    query += ' GROUP BY p.id ORDER BY p.id DESC';
    const [productos] = await connection.execute(query, params);
    await connection.end();
    res.json(productos);
  } catch (error) {
    res.json([]);
  }
});

app.put('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, company_id } = req.body;
    const connection = await createConnection();
    await connection.execute('UPDATE productos SET nombre = ?, company_id = ? WHERE id = ?', [nombre, company_id || 1, id]);
    await connection.end();
    res.json({ success: true, message: 'Producto actualizado correctamente' });
  } catch (error) {
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
    res.json({ success: false, message: 'Error al eliminar producto' });
  }
});

// Rutas para company
app.get('/company', async (req, res) => {
  try {
    const connection = await createConnection();
    const [companies] = await connection.execute('SELECT * FROM company ORDER BY id DESC');
    await connection.end();
    res.json(companies);
  } catch (error) {
    res.json([]);
  }
});

app.post('/company', async (req, res) => {
  try {
    const { razon_social, ruc_dni } = req.body;
    const connection = await createConnection();
    await connection.execute('INSERT INTO company (razon_social, ruc_dni) VALUES (?, ?)', [razon_social, ruc_dni]);
    await connection.end();
    res.json({ success: true, message: 'Compañía agregada correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al agregar compañía' });
  }
});

app.put('/company/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { razon_social, ruc_dni } = req.body;
    const connection = await createConnection();
    await connection.execute('UPDATE company SET razon_social = ?, ruc_dni = ? WHERE id = ?', [razon_social, ruc_dni, id]);
    await connection.end();
    res.json({ success: true, message: 'Compañía actualizada correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al actualizar compañía' });
  }
});

app.delete('/company/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await createConnection();
    await connection.execute('DELETE FROM company WHERE id = ?', [id]);
    await connection.end();
    res.json({ success: true, message: 'Compañía eliminada correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al eliminar compañía' });
  }
});

// Rutas para clientes
app.post('/clientes', async (req, res) => {
  try {
    const { razon_social, dni_ruc, distrito, direccion, telefono, company_id } = req.body;
    const connection = await createConnection();
    await connection.execute(
      'INSERT INTO clientes (razon_social, dni_ruc, distrito, direccion, telefono, company_id) VALUES (?, ?, ?, ?, ?, ?)',
      [razon_social, dni_ruc, distrito, direccion, telefono, company_id || 1]
    );
    await connection.end();
    res.json({ success: true, message: 'Cliente agregado correctamente' });
  } catch (error) {
    res.json({ success: false, message: 'Error al agregar cliente' });
  }
});

app.get('/clientes', async (req, res) => {
  try {
    const { company_id } = req.query;
    const connection = await createConnection();
    let query = 'SELECT * FROM clientes';
    const params = [];
    if (company_id) { query += ' WHERE company_id = ?'; params.push(company_id); }
    query += ' ORDER BY id DESC';
    const [clientes] = await connection.execute(query, params);
    await connection.end();
    res.json(clientes);
  } catch (error) {
    res.json([]);
  }
});

app.put('/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { razon_social, dni_ruc, distrito, direccion, telefono, company_id } = req.body;
    const connection = await createConnection();
    await connection.execute(
      'UPDATE clientes SET razon_social = ?, dni_ruc = ?, distrito = ?, direccion = ?, telefono = ?, company_id = ? WHERE id = ?',
      [razon_social, dni_ruc, distrito, direccion, telefono, company_id || 1, id]
    );
    await connection.end();
    res.json({ success: true, message: 'Cliente actualizado correctamente' });
  } catch (error) {
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
    res.json({ success: false, message: 'Error al eliminar cliente' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
