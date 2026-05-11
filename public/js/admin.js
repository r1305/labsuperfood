let productosData = [];
let clientesData = [];
let editandoProducto = false;
let editandoCliente = false;

// Variables para cotización
let clienteSeleccionado = null;
let productoSeleccionado = null;
let itemsCotizacion = [];
let contadorItems = 0;
let cotizacionesData = [];
let editandoCotizacion = false;
let cotizacionEditandoId = null;

// Variables para configuración bancaria
let cuentasBancariasData = [];
let editandoBanco = false;

document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos iniciales
    cargarProductos();
    cargarClientes();
    cargarCotizaciones();
    cargarCuentasBancarias();

    // Inicializar cotización
    inicializarCotizacion();
    inicializarListaCotizaciones();
    inicializarConfiguracionBancaria();

    // Buscadores productos y clientes (tabs originales)
    document.getElementById('buscarProducto').addEventListener('input', function() {
        filtrarProductos(this.value);
    });

    document.getElementById('buscarCliente').addEventListener('input', function() {
        filtrarClientes(this.value);
    });

    // Precio producto editable
    document.getElementById('precioProductoSeleccionado').addEventListener('input', function() {
        calcularTotalProducto();
    });

    // Botones de cancelar
    document.getElementById('btnCancelarProducto').addEventListener('click', function() {
        cancelarEdicionProducto();
    });

    document.getElementById('btnCancelarCliente').addEventListener('click', function() {
        cancelarEdicionCliente();
    });

    // Formulario de productos
    document.getElementById('formProducto').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        try {
            let response;
            if (editandoProducto) {
                response = await fetch(`/productos/${data.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch('/productos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                mostrarAlerta(result.message, 'success', 'productos');
                this.reset();
                cancelarEdicionProducto();
                cargarProductos();
            } else {
                mostrarAlerta(result.message, 'danger', 'productos');
            }
        } catch (error) {
            mostrarAlerta('Error al procesar producto', 'danger', 'productos');
        }
    });

    // Formulario de clientes
    document.getElementById('formCliente').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        try {
            let response;
            if (editandoCliente) {
                response = await fetch(`/clientes/${data.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch('/clientes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                mostrarAlerta(result.message, 'success', 'clientes');
                this.reset();
                cancelarEdicionCliente();
                cargarClientes();
            } else {
                mostrarAlerta(result.message, 'danger', 'clientes');
            }
        } catch (error) {
            mostrarAlerta('Error al procesar cliente', 'danger', 'clientes');
        }
    });
});

async function cargarProductos() {
    try {
        const response = await fetch('/productos');
        productosData = await response.json();
        mostrarProductos(productosData);
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

async function cargarClientes() {
    try {
        const response = await fetch('/clientes');
        clientesData = await response.json();
        mostrarClientes(clientesData);
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

function mostrarProductos(productos) {
    const lista = document.getElementById('listaProductos');
    lista.innerHTML = '';
    
    if (productos.length === 0) {
        lista.innerHTML = '<p class="text-muted">No hay productos registrados</p>';
        return;
    }
    
    productos.forEach(producto => {
        const item = document.createElement('div');
        item.className = 'lista-item';
        item.innerHTML = `
            <div class="item-content">
                <strong>${producto.nombre}</strong><br>
                <span class="text-muted">Precio: S/ ${parseFloat(producto.precio).toFixed(2)}</span>
            </div>
            <div class="item-actions">
                <button class="btn btn-warning btn-sm" onclick="editarProducto(${producto.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${producto.id})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        lista.appendChild(item);
    });
}

function mostrarClientes(clientes) {
    const lista = document.getElementById('listaClientes');
    lista.innerHTML = '';
    
    if (clientes.length === 0) {
        lista.innerHTML = '<p class="text-muted">No hay clientes registrados</p>';
        return;
    }
    
    clientes.forEach(cliente => {
        const item = document.createElement('div');
        item.className = 'lista-item';
        item.innerHTML = `
            <div class="item-content">
                <strong>${cliente.razon_social}</strong><br>
                <span class="text-muted">DNI/RUC: ${cliente.dni_ruc}</span><br>
                <span class="text-muted">${cliente.distrito} - ${cliente.direccion}</span><br>
                <span class="text-muted">Tel: ${cliente.telefono}</span>
            </div>
            <div class="item-actions">
                <button class="btn btn-warning btn-sm" onclick="editarCliente(${cliente.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="eliminarCliente(${cliente.id})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        lista.appendChild(item);
    });
}

function filtrarProductos(termino) {
    const productosFiltrados = productosData.filter(producto => 
        producto.nombre.toLowerCase().includes(termino.toLowerCase())
    );
    mostrarProductos(productosFiltrados);
}

function filtrarClientes(termino) {
    const clientesFiltrados = clientesData.filter(cliente => 
        cliente.razon_social.toLowerCase().includes(termino.toLowerCase()) ||
        cliente.dni_ruc.includes(termino) ||
        cliente.distrito.toLowerCase().includes(termino.toLowerCase())
    );
    mostrarClientes(clientesFiltrados);
}

function editarProducto(id) {
    const producto = productosData.find(p => p.id === id);
    if (producto) {
        document.getElementById('productoId').value = producto.id;
        document.getElementById('nombreProducto').value = producto.nombre;
        document.getElementById('precioProducto').value = producto.precio;
        document.getElementById('tituloFormProducto').textContent = 'Editar Producto';
        document.getElementById('btnProducto').textContent = 'Actualizar Producto';
        document.getElementById('btnCancelarProducto').style.display = 'inline-block';
        editandoProducto = true;
    }
}

function editarCliente(id) {
    const cliente = clientesData.find(c => c.id === id);
    if (cliente) {
        document.getElementById('clienteId').value = cliente.id;
        document.getElementById('razonSocial').value = cliente.razon_social;
        document.getElementById('dniRuc').value = cliente.dni_ruc;
        document.getElementById('distrito').value = cliente.distrito;
        document.getElementById('direccion').value = cliente.direccion;
        document.getElementById('telefono').value = cliente.telefono;
        document.getElementById('tituloFormCliente').textContent = 'Editar Cliente';
        document.getElementById('btnCliente').textContent = 'Actualizar Cliente';
        document.getElementById('btnCancelarCliente').style.display = 'inline-block';
        editandoCliente = true;
    }
}

function cancelarEdicionProducto() {
    document.getElementById('formProducto').reset();
    document.getElementById('tituloFormProducto').textContent = 'Agregar Producto';
    document.getElementById('btnProducto').textContent = 'Agregar Producto';
    document.getElementById('btnCancelarProducto').style.display = 'none';
    editandoProducto = false;
}

function cancelarEdicionCliente() {
    document.getElementById('formCliente').reset();
    document.getElementById('tituloFormCliente').textContent = 'Agregar Cliente';
    document.getElementById('btnCliente').textContent = 'Agregar Cliente';
    document.getElementById('btnCancelarCliente').style.display = 'none';
    editandoCliente = false;
}

async function eliminarProducto(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        try {
            const response = await fetch(`/productos/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                mostrarAlerta(result.message, 'success', 'productos');
                cargarProductos();
            } else {
                mostrarAlerta(result.message, 'danger', 'productos');
            }
        } catch (error) {
            mostrarAlerta('Error al eliminar producto', 'danger', 'productos');
        }
    }
}

async function eliminarCliente(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
        try {
            const response = await fetch(`/clientes/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                mostrarAlerta(result.message, 'success', 'clientes');
                cargarClientes();
            } else {
                mostrarAlerta(result.message, 'danger', 'clientes');
            }
        } catch (error) {
            mostrarAlerta('Error al eliminar cliente', 'danger', 'clientes');
        }
    }
}

function mostrarAlerta(mensaje, tipo, tab) {
    const tabPane = document.getElementById(tab);
    const alertaExistente = tabPane.querySelector('.alert');
    
    if (alertaExistente) {
        alertaExistente.remove();
    }
    
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    tabPane.insertBefore(alerta, tabPane.firstChild);
    
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 5000);
}

// ===== FUNCIONES DE COTIZACIÓN =====

function inicializarCotizacion() {
    // Buscador de cliente
    document.getElementById('buscarClienteCotizacion').addEventListener('input', function() {
        buscarClientesCotizacion(this.value);
    });

    // Limpiar cliente seleccionado
    document.getElementById('btnLimpiarCliente').addEventListener('click', function() {
        limpiarClienteSeleccionado();
    });

    // Buscador de producto
    document.getElementById('buscarProductoCotizacion').addEventListener('input', function() {
        buscarProductosCotizacion(this.value);
    });

    // Cantidad producto
    document.getElementById('cantidadProducto').addEventListener('input', function() {
        calcularTotalProducto();
    });

    // Abono
    document.getElementById('abono').addEventListener('input', function() {
        calcularSaldo();
    });

    // Agregar item
    document.getElementById('btnAgregarItem').addEventListener('click', function() {
        agregarItemCotizacion();
    });

    // Guardar cotización
    document.getElementById('btnGuardarCotizacion').addEventListener('click', function() {
        guardarCotizacion();
    });
}

function buscarClientesCotizacion(termino) {
    const select = document.getElementById('selectCliente');
    
    if (termino.length < 2) {
        select.style.display = 'none';
        return;
    }

    const clientesFiltrados = clientesData.filter(cliente => 
        cliente.razon_social.toLowerCase().includes(termino.toLowerCase()) ||
        cliente.dni_ruc.includes(termino)
    );

    select.innerHTML = '';
    
    if (clientesFiltrados.length > 0) {
        clientesFiltrados.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = `${cliente.razon_social} - ${cliente.dni_ruc}`;
            option.addEventListener('click', () => seleccionarCliente(cliente));
            select.appendChild(option);
        });
        select.style.display = 'block';
    } else {
        select.style.display = 'none';
    }
}

function seleccionarCliente(cliente) {
    clienteSeleccionado = cliente;
    document.getElementById('buscarClienteCotizacion').value = `${cliente.razon_social} - ${cliente.dni_ruc}`;
    document.getElementById('selectCliente').style.display = 'none';
    
    // Mostrar datos del cliente
    const infoCliente = document.getElementById('infoCliente');
    infoCliente.innerHTML = `
        <strong>${cliente.razon_social}</strong><br>
        <span class="text-muted">DNI/RUC: ${cliente.dni_ruc}</span><br>
        <span class="text-muted">${cliente.distrito} - ${cliente.direccion}</span><br>
        <span class="text-muted">Tel: ${cliente.telefono}</span>
    `;
    document.getElementById('datosClienteSeleccionado').style.display = 'block';
}

function limpiarClienteSeleccionado() {
    clienteSeleccionado = null;
    document.getElementById('buscarClienteCotizacion').value = '';
    document.getElementById('selectCliente').style.display = 'none';
    document.getElementById('datosClienteSeleccionado').style.display = 'none';
}

function buscarProductosCotizacion(termino) {
    const select = document.getElementById('selectProducto');
    
    if (termino.length < 2) {
        select.style.display = 'none';
        return;
    }

    const productosFiltrados = productosData.filter(producto => 
        producto.nombre.toLowerCase().includes(termino.toLowerCase())
    );

    select.innerHTML = '';
    
    if (productosFiltrados.length > 0) {
        productosFiltrados.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.nombre} - S/ ${parseFloat(producto.precio).toFixed(2)}`;
            option.addEventListener('click', () => seleccionarProducto(producto));
            select.appendChild(option);
        });
        select.style.display = 'block';
    } else {
        select.style.display = 'none';
    }
}

function seleccionarProducto(producto) {
    productoSeleccionado = producto;
    document.getElementById('buscarProductoCotizacion').value = producto.nombre;
    document.getElementById('precioProductoSeleccionado').value = parseFloat(producto.precio).toFixed(2);
    document.getElementById('selectProducto').style.display = 'none';
    document.getElementById('cantidadProducto').focus();
    calcularTotalProducto();
}

function calcularTotalProducto() {
    if (!productoSeleccionado) return;
    
    const cantidad = parseFloat(document.getElementById('cantidadProducto').value) || 0;
    const precio = parseFloat(document.getElementById('precioProductoSeleccionado').value) || 0;
    const total = cantidad * precio;
    
    document.getElementById('totalProducto').value = `S/ ${total.toFixed(2)}`;
}

function agregarItemCotizacion() {
    if (!productoSeleccionado) {
        alert('Selecciona un producto');
        return;
    }
    
    const cantidad = parseFloat(document.getElementById('cantidadProducto').value);
    if (!cantidad || cantidad <= 0) {
        alert('Ingresa una cantidad válida');
        return;
    }
    
    const precio = parseFloat(document.getElementById('precioProductoSeleccionado').value) || 0;
    const total = cantidad * precio;
    
    const item = {
        id: ++contadorItems,
        producto_id: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        precio: precio,
        cantidad: cantidad,
        total: total
    };
    
    itemsCotizacion.push(item);
    actualizarTablaItems();
    limpiarFormularioProducto();
    calcularTotalCotizacion();
}

function actualizarTablaItems() {
    const tbody = document.getElementById('itemsCotizacion');
    const noItems = document.getElementById('noItems');
    
    if (itemsCotizacion.length === 0) {
        noItems.style.display = 'table-row';
        return;
    }
    
    noItems.style.display = 'none';
    
    // Limpiar filas existentes excepto "noItems"
    const filas = tbody.querySelectorAll('tr:not(#noItems)');
    filas.forEach(fila => fila.remove());
    
    itemsCotizacion.forEach(item => {
        const fila = document.createElement('tr');
        fila.className = 'item-row';
        fila.innerHTML = `
            <td>${item.nombre}</td>
            <td>S/ ${item.precio.toFixed(2)}</td>
            <td>${item.cantidad}</td>
            <td>S/ ${item.total.toFixed(2)}</td>
            <td>S/ ${item.total.toFixed(2)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="eliminarItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

function eliminarItem(itemId) {
    itemsCotizacion = itemsCotizacion.filter(item => item.id !== itemId);
    actualizarTablaItems();
    calcularTotalCotizacion();
}

function limpiarFormularioProducto() {
    productoSeleccionado = null;
    document.getElementById('buscarProductoCotizacion').value = '';
    document.getElementById('precioProductoSeleccionado').value = '';
    document.getElementById('cantidadProducto').value = '';
    document.getElementById('totalProducto').value = '';
    document.getElementById('selectProducto').style.display = 'none';
}

function calcularTotalCotizacion() {
    const total = itemsCotizacion.reduce((sum, item) => sum + item.total, 0);
    document.getElementById('totalAPagar').textContent = `S/ ${total.toFixed(2)}`;
    document.getElementById('totalPorFacturar').textContent = `S/ ${total.toFixed(2)}`;
    calcularSaldo();
    
    // Mostrar información bancaria si hay items
    if (itemsCotizacion.length > 0) {
        mostrarInfoBancaria();
    } else {
        document.getElementById('infoBancaria').style.display = 'none';
    }
}

function calcularSaldo() {
    const total = itemsCotizacion.reduce((sum, item) => sum + item.total, 0);
    const abono = parseFloat(document.getElementById('abono').value) || 0;
    const saldo = total - abono;
    document.getElementById('saldo').textContent = `S/ ${saldo.toFixed(2)}`;
}

function guardarCotizacion() {
    if (!clienteSeleccionado) {
        alert('Selecciona un cliente');
        return;
    }
    
    if (itemsCotizacion.length === 0) {
        alert('Agrega al menos un producto');
        return;
    }
    
    const total = itemsCotizacion.reduce((sum, item) => sum + item.total, 0);
    const abono = parseFloat(document.getElementById('abono').value) || 0;
    const saldo = total - abono;
    
    const cotizacionData = {
        cliente_id: clienteSeleccionado.id,
        items: itemsCotizacion,
        total: total,
        abono: abono,
        saldo: saldo
    };
    
    // Determinar URL y método
    let url, method;
    if (editandoCotizacion && cotizacionEditandoId) {
        url = `/cotizaciones/${cotizacionEditandoId}`;
        method = 'PUT';
        console.log('Modo edición - Actualizando cotización ID:', cotizacionEditandoId);
    } else {
        url = '/cotizaciones';
        method = 'POST';
        console.log('Modo creación - Nueva cotización');
    }
    
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Datos:', cotizacionData);
    
    // Guardar en base de datos
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotizacionData)
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        console.log('Resultado del servidor:', result);
        if (result.success) {
            const mensaje = editandoCotizacion ? 
                `Cotización #${cotizacionEditandoId} actualizada correctamente` : 
                `Cotización #${result.id} guardada correctamente`;
            alert(mensaje);
            
            // Resetear modo edición
            editandoCotizacion = false;
            cotizacionEditandoId = null;
            document.getElementById('btnGuardarCotizacion').innerHTML = '<i class="fas fa-save"></i> Guardar Cotización';
            
            limpiarCotizacion();
            cargarCotizaciones(); // Actualizar lista
        } else {
            alert('Error al procesar cotización: ' + result.message);
        }
    })
    .catch(error => {
        console.error('Error completo:', error);
        alert('Error de conexión: ' + error.message);
    });
}

function limpiarCotizacion() {
    limpiarClienteSeleccionado();
    limpiarFormularioProducto();
    itemsCotizacion = [];
    contadorItems = 0;
    document.getElementById('abono').value = '0';
    actualizarTablaItems();
    calcularTotalCotizacion();
    // Limpiar Por Facturar
    document.getElementById('totalPorFacturar').textContent = 'S/ 0.00';
    
    // Resetear modo edición
    editandoCotizacion = false;
    cotizacionEditandoId = null;
    document.getElementById('btnGuardarCotizacion').innerHTML = '<i class="fas fa-save"></i> Guardar Cotización';
    
    // Recargar datos para limpiar las listas
    cargarProductos();
    cargarClientes();
}

// ===== FUNCIONES DE LISTA DE COTIZACIONES =====

function inicializarListaCotizaciones() {
    // Buscador de cotizaciones
    document.getElementById('buscarCotizacion').addEventListener('input', function() {
        filtrarCotizaciones();
    });

    // Filtro por estado
    document.getElementById('filtroEstado').addEventListener('change', function() {
        filtrarCotizaciones();
    });
}

async function cargarCotizaciones() {
    try {
        const response = await fetch('/cotizaciones');
        cotizacionesData = await response.json();
        mostrarCotizaciones(cotizacionesData);
    } catch (error) {
        console.error('Error cargando cotizaciones:', error);
    }
}

function mostrarCotizaciones(cotizaciones) {
    const tbody = document.getElementById('tablaCotizaciones');
    const noCotizaciones = document.getElementById('noCotizaciones');
    
    // Limpiar filas existentes excepto "noCotizaciones"
    const filas = tbody.querySelectorAll('tr:not(#noCotizaciones)');
    filas.forEach(fila => fila.remove());
    
    if (cotizaciones.length === 0) {
        noCotizaciones.style.display = 'table-row';
        return;
    }
    
    noCotizaciones.style.display = 'none';
    
    cotizaciones.forEach(cotizacion => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td class="text-center"><strong>#${cotizacion.id}</strong></td>
            <td>
                <strong>${cotizacion.razon_social}</strong><br>
                <small class="text-muted">${cotizacion.dni_ruc}</small>
            </td>
            <td class="text-center"><strong>S/ ${parseFloat(cotizacion.total).toFixed(2)}</strong></td>
            <td class="text-center">S/ ${parseFloat(cotizacion.abono).toFixed(2)}</td>
            <td class="text-center">S/ ${parseFloat(cotizacion.saldo).toFixed(2)}</td>
            <td class="text-center">
                <span class="badge bg-${getEstadoColor(cotizacion.estado)}">
                    ${cotizacion.estado.toUpperCase()}
                </span>
            </td>
            <td class="text-center">
                <small>${new Date(cotizacion.created_at).toLocaleDateString()}</small><br>
                <small class="text-muted">${new Date(cotizacion.created_at).toLocaleTimeString()}</small>
            </td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-info" onclick="verDetalleCotizacion(${cotizacion.id})" title="Ver detalle">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-warning" onclick="editarCotizacion(${cotizacion.id})" title="Editar cotización">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-success" onclick="descargarPDF(${cotizacion.id})" title="Descargar PDF">
                                        <i class="fas fa-file-pdf"></i>
                                    </button>
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown" title="Cambiar estado">
                                            <i class="fas fa-cog"></i>
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item" href="#" onclick="cambiarEstado(${cotizacion.id}, 'pendiente')">Pendiente</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="cambiarEstado(${cotizacion.id}, 'pagado')">Pagado</a></li>
                                            <li><a class="dropdown-item" href="#" onclick="cambiarEstado(${cotizacion.id}, 'cancelado')">Cancelado</a></li>
                                        </ul>
                                    </div>
                                </div>
                            </td>
        `;
        tbody.appendChild(fila);
    });
}

function filtrarCotizaciones() {
    const termino = document.getElementById('buscarCotizacion').value.toLowerCase();
    const estado = document.getElementById('filtroEstado').value;
    
    let cotizacionesFiltradas = cotizacionesData.filter(cotizacion => {
        const coincideTexto = cotizacion.razon_social.toLowerCase().includes(termino) ||
                             cotizacion.dni_ruc.includes(termino) ||
                             cotizacion.id.toString().includes(termino);
        
        const coincideEstado = !estado || cotizacion.estado === estado;
        
        return coincideTexto && coincideEstado;
    });
    
    mostrarCotizaciones(cotizacionesFiltradas);
}

function getEstadoColor(estado) {
    switch(estado) {
        case 'pendiente': return 'warning';
        case 'pagado': return 'success';
        case 'cancelado': return 'danger';
        default: return 'secondary';
    }
}

async function verDetalleCotizacion(id) {
    try {
        const response = await fetch(`/cotizaciones/${id}/detalle`);
        const result = await response.json();
        
        if (result.success) {
            mostrarModalDetalle(result.cotizacion, result.detalles);
        } else {
            alert('Error al cargar detalle: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar detalle de cotización');
    }
}

function mostrarModalDetalle(cotizacion, detalles) {
    let detalleHtml = `
        <div class="modal fade" id="modalDetalle" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Cotización #${cotizacion.id}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6>Cliente:</h6>
                                <p><strong>${cotizacion.razon_social}</strong><br>
                                DNI/RUC: ${cotizacion.dni_ruc}<br>
                                ${cotizacion.distrito} - ${cotizacion.direccion}<br>
                                Tel: ${cotizacion.telefono}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Información:</h6>
                                <p>Fecha: ${new Date(cotizacion.created_at).toLocaleString()}<br>
                                Estado: <span class="badge bg-${getEstadoColor(cotizacion.estado)}">${cotizacion.estado.toUpperCase()}</span></p>
                            </div>
                        </div>
                        
                        <h6>Productos:</h6>
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th class="text-center">Precio Unit.</th>
                                    <th class="text-center">Cantidad</th>
                                    <th class="text-center">Total</th>
                                    <th class="text-center">Por Facturar</th>
                                </tr>
                            </thead>
                            <tbody>
    `;
    
    detalles.forEach(detalle => {
        detalleHtml += `
            <tr>
                <td>${detalle.producto_nombre}</td>
                <td class="text-center">S/ ${parseFloat(detalle.precio_unitario).toFixed(2)}</td>
                <td class="text-center">${detalle.cantidad}</td>
                <td class="text-center">S/ ${parseFloat(detalle.total).toFixed(2)}</td>
                <td class="text-center">S/ ${parseFloat(detalle.total).toFixed(2)}</td>
            </tr>
        `;
    });
    
    detalleHtml += `
                            </tbody>
                        </table>
                        
                                <div class="row mt-3">
                            <div class="col-md-6 offset-md-6">
                                <table class="table table-sm">
                                    <tr>
                                        <td><strong>Total:</strong></td>
                                        <td class="text-end"><strong>S/ ${parseFloat(cotizacion.total).toFixed(2)}</strong></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Por Facturar:</strong></td>
                                        <td class="text-end"><strong>S/ ${parseFloat(cotizacion.total).toFixed(2)}</strong></td>
                                    </tr>
                                    <tr>
                                        <td>Abono:</td>
                                        <td class="text-end">S/ ${parseFloat(cotizacion.abono).toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Saldo:</strong></td>
                                        <td class="text-end"><strong>S/ ${parseFloat(cotizacion.saldo).toFixed(2)}</strong></td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-success" onclick="descargarPDF(${cotizacion.id})">
                            <i class="fas fa-file-pdf"></i> Descargar PDF
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente si existe
    const modalExistente = document.getElementById('modalDetalle');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    // Agregar modal al body
    document.body.insertAdjacentHTML('beforeend', detalleHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalDetalle'));
    modal.show();
}

async function cambiarEstado(id, nuevoEstado) {
    try {
        const response = await fetch(`/cotizaciones/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        const result = await response.json();
        
        if (result.success) {
            cargarCotizaciones(); // Recargar lista
        } else {
            alert('Error al cambiar estado: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar estado');
    }
}

// ===== FUNCIONES DE CONFIGURACIÓN BANCARIA =====

function inicializarConfiguracionBancaria() {
    // Botón cancelar banco
    document.getElementById('btnCancelarBanco').addEventListener('click', function() {
        cancelarEdicionBanco();
    });

    // Formulario de banco
    document.getElementById('formBanco').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        try {
            let response;
            if (editandoBanco) {
                response = await fetch(`/configuracion-bancaria/${data.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch('/configuracion-bancaria', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert(result.message);
                this.reset();
                cancelarEdicionBanco();
                cargarCuentasBancarias();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar cuenta bancaria');
        }
    });
}

async function cargarCuentasBancarias() {
    try {
        const response = await fetch('/configuracion-bancaria');
        cuentasBancariasData = await response.json();
        mostrarCuentasBancarias(cuentasBancariasData);
    } catch (error) {
        console.error('Error cargando cuentas bancarias:', error);
    }
}

function mostrarCuentasBancarias(cuentas) {
    const lista = document.getElementById('listaCuentasBancarias');
    lista.innerHTML = '';
    
    if (cuentas.length === 0) {
        lista.innerHTML = '<p class="text-muted">No hay cuentas bancarias registradas</p>';
        return;
    }
    
    cuentas.forEach(cuenta => {
        const item = document.createElement('div');
        item.className = 'lista-item mb-3';
        const estadoBadge = cuenta.activo ? 
            '<span class="badge bg-success">Activa</span>' : 
            '<span class="badge bg-secondary">Inactiva</span>';
        
        item.innerHTML = `
            <div class="item-content">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${cuenta.banco}</strong> ${estadoBadge}<br>
                        <span class="text-muted">Tipo: ${cuenta.tipo_cuenta === 'ahorros' ? 'Ahorros' : 'Corriente'}</span><br>
                        <span class="text-muted">Cuenta: ${cuenta.numero_cuenta}</span><br>
                        ${cuenta.cci ? `<span class="text-muted">CCI: ${cuenta.cci}</span><br>` : ''}
                        <span class="text-muted">Titular: ${cuenta.titular}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-warning btn-sm" onclick="editarBanco(${cuenta.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn ${cuenta.activo ? 'btn-secondary' : 'btn-success'} btn-sm" 
                                onclick="toggleEstadoBanco(${cuenta.id}, ${!cuenta.activo})">
                            <i class="fas fa-${cuenta.activo ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarBanco(${cuenta.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        lista.appendChild(item);
    });
}

function editarBanco(id) {
    const cuenta = cuentasBancariasData.find(c => c.id === id);
    if (cuenta) {
        document.getElementById('bancoId').value = cuenta.id;
        document.getElementById('nombreBanco').value = cuenta.banco;
        document.getElementById('tipoCuenta').value = cuenta.tipo_cuenta;
        document.getElementById('numeroCuenta').value = cuenta.numero_cuenta;
        document.getElementById('cci').value = cuenta.cci || '';
        document.getElementById('titular').value = cuenta.titular;
        document.getElementById('tituloFormBanco').textContent = 'Editar Cuenta Bancaria';
        document.getElementById('btnBanco').textContent = 'Actualizar Cuenta';
        document.getElementById('btnCancelarBanco').style.display = 'inline-block';
        editandoBanco = true;
    }
}

function cancelarEdicionBanco() {
    document.getElementById('formBanco').reset();
    document.getElementById('tituloFormBanco').textContent = 'Agregar Cuenta Bancaria';
    document.getElementById('btnBanco').textContent = 'Agregar Cuenta';
    document.getElementById('btnCancelarBanco').style.display = 'none';
    editandoBanco = false;
}

async function toggleEstadoBanco(id, nuevoEstado) {
    try {
        const response = await fetch(`/configuracion-bancaria/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ activo: nuevoEstado })
        });
        
        const result = await response.json();
        
        if (result.success) {
            cargarCuentasBancarias();
        } else {
            alert('Error al cambiar estado: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar estado de la cuenta');
    }
}

async function eliminarBanco(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta cuenta bancaria?')) {
        try {
            const response = await fetch(`/configuracion-bancaria/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(result.message);
                cargarCuentasBancarias();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar cuenta bancaria');
        }
    }
}

// Función para mostrar información bancaria en cotización
async function mostrarInfoBancaria() {
    try {
        const response = await fetch('/configuracion-bancaria');
        const cuentas = await response.json();
        
        const cuentasActivas = cuentas.filter(cuenta => cuenta.activo);
        const infoContainer = document.getElementById('cuentasBancariasInfo');
        
        if (cuentasActivas.length === 0) {
            infoContainer.innerHTML = '<p class="text-muted small">No hay cuentas bancarias configuradas</p>';
        } else {
            let html = '';
            cuentasActivas.forEach(cuenta => {
                html += `
                    <div class="border rounded p-2 mb-2 bg-light">
                        <div class="row">
                            <div class="col-12">
                                <strong class="text-primary">${cuenta.banco}</strong>
                                <span class="badge bg-info ms-2">${cuenta.tipo_cuenta === 'ahorros' ? 'Ahorros' : 'Corriente'}</span>
                            </div>
                        </div>
                        <div class="row mt-1">
                            <div class="col-6">
                                <small class="text-muted">Número de Cuenta:</small><br>
                                <strong>${cuenta.numero_cuenta}</strong>
                            </div>
                            ${cuenta.cci ? `
                            <div class="col-6">
                                <small class="text-muted">CCI:</small><br>
                                <strong>${cuenta.cci}</strong>
                            </div>
                            ` : ''}
                        </div>
                        <div class="row mt-1">
                            <div class="col-12">
                                <small class="text-muted">Titular:</small><br>
                                <strong>${cuenta.titular}</strong>
                            </div>
                        </div>
                    </div>
                `;
            });
            infoContainer.innerHTML = html;
        }
        
        document.getElementById('infoBancaria').style.display = 'block';
    } catch (error) {
        console.error('Error cargando información bancaria:', error);
    }
}

// Función para descargar PDF
function descargarPDF(id) {
    // Mostrar indicador de carga
    const btn = event.target.closest('button');
    const iconoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    // Crear enlace temporal para descarga
    const link = document.createElement('a');
    link.href = `/cotizaciones/${id}/pdf`;
    link.download = `Cotizacion-${id.toString().padStart(6, '0')}.pdf`;
    
    // Agregar al DOM y hacer clic
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Restaurar botón después de un momento
    setTimeout(() => {
        btn.innerHTML = iconoOriginal;
        btn.disabled = false;
    }, 2000);
}

// Función para editar cotización
async function editarCotizacion(id) {
    try {
        const response = await fetch(`/cotizaciones/${id}/detalle`);
        const result = await response.json();
        
        if (result.success) {
            // Cambiar al tab de nueva cotización
            const cotizacionTab = new bootstrap.Tab(document.getElementById('cotizacion-tab'));
            cotizacionTab.show();
            
            // Limpiar formulario actual
            limpiarCotizacion();
            
            // Cargar datos de la cotización
            editandoCotizacion = true;
            cotizacionEditandoId = id;
            
            // Seleccionar cliente
            const cliente = {
                id: result.cotizacion.cliente_id,
                razon_social: result.cotizacion.razon_social,
                dni_ruc: result.cotizacion.dni_ruc,
                distrito: result.cotizacion.distrito,
                direccion: result.cotizacion.direccion,
                telefono: result.cotizacion.telefono
            };
            seleccionarCliente(cliente);
            
            // Cargar items
            itemsCotizacion = [];
            contadorItems = 0;
            
            result.detalles.forEach(detalle => {
                const item = {
                    id: ++contadorItems,
                    producto_id: detalle.producto_id,
                    nombre: detalle.producto_nombre,
                    precio: parseFloat(detalle.precio_unitario),
                    cantidad: parseFloat(detalle.cantidad),
                    total: parseFloat(detalle.total)
                };
                itemsCotizacion.push(item);
            });
            
            // Cargar abono
            document.getElementById('abono').value = parseFloat(result.cotizacion.abono);
            
            // Actualizar vista
            actualizarTablaItems();
            calcularTotalCotizacion();
            
            // Cambiar texto del botón
            document.getElementById('btnGuardarCotizacion').innerHTML = '<i class="fas fa-save"></i> Actualizar Cotización';
            
            alert('Cotización cargada para edición');
        } else {
            alert('Error al cargar cotización: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar cotización para edición');
    }
}