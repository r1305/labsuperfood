// ===== FUNCIONES DE UTILIDAD =====

// Función para formatear moneda peruana
function formatearMoneda(monto) {
    const numero = parseFloat(monto) || 0;
    return numero.toLocaleString('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Función alternativa sin símbolo de moneda
function formatearNumero(monto) {
    const numero = parseFloat(monto) || 0;
    return numero.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

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
    
    // Inicializar funciones móviles
    inicializarMovil();

    // Buscadores productos y clientes (tabs originales)
    document.getElementById('buscarProducto').addEventListener('input', function() {
        filtrarProductos(this.value);
    });

    document.getElementById('buscarCliente').addEventListener('input', function() {
        filtrarClientes(this.value);
    });

    // Precio y descuento producto editable
    document.getElementById('precioProductoSeleccionado').addEventListener('input', function() {
        calcularTotalProducto();
    });

    document.getElementById('descuentoProducto').addEventListener('input', function() {
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
    document.getElementById('btnGuardarProducto').addEventListener('click', async function() {
        const form = document.getElementById('formProducto');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            let response;
            if (editandoProducto) {
                response = await fetch(`/productos/${data.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch('/productos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
                cancelarEdicionProducto();
                cargarProductos();
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('Error al procesar producto');
        }
    });

    // Formulario de clientes
    document.getElementById('btnGuardarCliente').addEventListener('click', async function() {
        const form = document.getElementById('formCliente');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            let response;
            if (editandoCliente) {
                response = await fetch(`/clientes/${data.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch('/clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
                cancelarEdicionCliente();
                cargarClientes();
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('Error al procesar cliente');
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

// ===== VARIABLES DE PAGINACIÓN PRODUCTOS =====
let paginaActualProductos = 1;
const productosPorPagina = 10;
let productosFiltrados = [];

function mostrarProductos(productos) {
    productosFiltrados = productos;
    paginaActualProductos = 1;
    renderTablaProductos();
}

function renderTablaProductos() {
    const lista = document.getElementById('listaProductos');
    const contador = document.getElementById('contadorProductos');
    const paginacion = document.getElementById('paginacionProductos');

    if (contador) contador.textContent = productosFiltrados.length;

    if (productosFiltrados.length === 0) {
        lista.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-box-open fa-3x mb-3 d-block"></i>
                <p class="mb-0">No hay productos registrados</p>
                <small>Haz clic en "Nuevo Producto" para agregar uno</small>
            </div>`;
        paginacion.innerHTML = '';
        return;
    }

    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    const inicio = (paginaActualProductos - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const paginaData = productosFiltrados.slice(inicio, fin);

    lista.innerHTML = `
        <div class="table-responsive mobile-scroll">
            <table class="table table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th class="text-center">#</th>
                        <th>Nombre</th>
                        <th class="text-center" style="min-width:120px;">Precio</th>
                        <th class="text-center" style="min-width:90px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginaData.map((p, i) => `
                        <tr>
                            <td class="text-muted align-middle">${inicio + i + 1}</td>
                            <td class="align-middle">${p.nombre}</td>
                            <td class="text-center align-middle fw-bold text-primary">${formatearMoneda(p.precio)}</td>
                            <td class="text-center align-middle">
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-info" onclick="abrirTiposPrecio(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')"
                                        title="Tipos de precio">
                                        <i class="fas fa-tags"></i>
                                    </button>
                                    <button class="btn btn-warning" onclick="editarProducto(${p.id})" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger" onclick="eliminarProducto(${p.id})" title="Eliminar">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;

    // Paginación
    if (totalPaginas <= 1) {
        paginacion.innerHTML = `<small class="text-muted">Mostrando ${productosFiltrados.length} producto(s)</small>`;
        return;
    }

    let btnsPaginas = '';
    for (let i = 1; i <= totalPaginas; i++) {
        btnsPaginas += `<button class="btn btn-sm ${ i === paginaActualProductos ? 'btn-primary' : 'btn-outline-secondary'}" onclick="cambiarPaginaProductos(${i})">${i}</button>`;
    }

    paginacion.innerHTML = `
        <small class="text-muted">Mostrando ${inicio + 1}-${Math.min(fin, productosFiltrados.length)} de ${productosFiltrados.length}</small>
        <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" onclick="cambiarPaginaProductos(${paginaActualProductos - 1})" ${paginaActualProductos === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            ${btnsPaginas}
            <button class="btn btn-outline-secondary" onclick="cambiarPaginaProductos(${paginaActualProductos + 1})" ${paginaActualProductos === totalPaginas ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>`;
}

function cambiarPaginaProductos(pagina) {
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaActualProductos = pagina;
    renderTablaProductos();
}

function abrirModalProducto() {
    document.getElementById('formProducto').reset();
    document.getElementById('productoId').value = '';
    document.getElementById('tituloModalProducto').innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Producto';
    editandoProducto = false;
    new bootstrap.Modal(document.getElementById('modalProducto')).show();
}

// ===== VARIABLES DE PAGINACIÓN CLIENTES =====
let paginaActualClientes = 1;
const clientesPorPagina = 10;
let clientesFiltrados = [];

function mostrarClientes(clientes) {
    clientesFiltrados = clientes;
    paginaActualClientes = 1;
    renderTablaClientes();
}

function renderTablaClientes() {
    const lista = document.getElementById('listaClientes');
    const contador = document.getElementById('contadorClientes');
    const paginacion = document.getElementById('paginacionClientes');

    if (contador) contador.textContent = clientesFiltrados.length;

    if (clientesFiltrados.length === 0) {
        lista.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-users fa-3x mb-3 d-block"></i>
                <p class="mb-0">No hay clientes registrados</p>
                <small>Haz clic en "Nuevo Cliente" para agregar uno</small>
            </div>`;
        paginacion.innerHTML = '';
        return;
    }

    const totalPaginas = Math.ceil(clientesFiltrados.length / clientesPorPagina);
    const inicio = (paginaActualClientes - 1) * clientesPorPagina;
    const fin = inicio + clientesPorPagina;
    const paginaData = clientesFiltrados.slice(inicio, fin);

    lista.innerHTML = `
        <div class="table-responsive mobile-scroll">
            <table class="table table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th class="text-center">#</th>
                        <th class="text-center" style="min-width:150px;">Razón Social</th>
                        <th class="text-center" style="min-width:110px;">DNI/RUC</th>
                        <th class="text-center d-none d-md-table-cell" style="min-width:100px;">Distrito</th>
                        <th class="text-center d-none d-lg-table-cell" style="min-width:150px;">Dirección</th>
                        <th class="text-center d-none d-md-table-cell" style="min-width:100px;">Teléfono</th>
                        <th class="text-center" style="min-width:90px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginaData.map((c, i) => `
                        <tr>
                            <td class="text-center align-middle text-muted">${inicio + i + 1}</td>
                            <td class="text-center align-middle fw-semibold">${c.razon_social}</td>
                            <td class="text-center align-middle">${c.dni_ruc}</td>
                            <td class="text-center align-middle d-none d-md-table-cell">${c.distrito}</td>
                            <td class="text-center align-middle d-none d-lg-table-cell text-muted">${c.direccion}</td>
                            <td class="text-center align-middle d-none d-md-table-cell">${c.telefono}</td>
                            <td class="text-center align-middle">
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-info" onclick="abrirEtiquetas(${c.id}, '${c.razon_social.replace(/'/g, "\\'")}')"
                                        title="Etiquetas">
                                        <i class="fas fa-tags"></i>
                                    </button>
                                    <button class="btn btn-warning" onclick="editarCliente(${c.id})" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger" onclick="eliminarCliente(${c.id})" title="Eliminar">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;

    if (totalPaginas <= 1) {
        paginacion.innerHTML = `<small class="text-muted">Mostrando ${clientesFiltrados.length} cliente(s)</small>`;
        return;
    }

    let btnsPaginas = '';
    for (let i = 1; i <= totalPaginas; i++) {
        btnsPaginas += `<button class="btn btn-sm ${i === paginaActualClientes ? 'btn-primary' : 'btn-outline-secondary'}" onclick="cambiarPaginaClientes(${i})">${i}</button>`;
    }

    paginacion.innerHTML = `
        <small class="text-muted">Mostrando ${inicio + 1}-${Math.min(fin, clientesFiltrados.length)} de ${clientesFiltrados.length}</small>
        <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" onclick="cambiarPaginaClientes(${paginaActualClientes - 1})" ${paginaActualClientes === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            ${btnsPaginas}
            <button class="btn btn-outline-secondary" onclick="cambiarPaginaClientes(${paginaActualClientes + 1})" ${paginaActualClientes === totalPaginas ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>`;
}

function cambiarPaginaClientes(pagina) {
    const totalPaginas = Math.ceil(clientesFiltrados.length / clientesPorPagina);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaActualClientes = pagina;
    renderTablaClientes();
}

function abrirModalCliente() {
    document.getElementById('formCliente').reset();
    document.getElementById('clienteId').value = '';
    document.getElementById('tituloModalCliente').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Cliente';
    editandoCliente = false;
    new bootstrap.Modal(document.getElementById('modalCliente')).show();
}

function filtrarProductos(termino) {
    const filtrados = productosData.filter(producto => 
        producto.nombre.toLowerCase().includes(termino.toLowerCase())
    );
    mostrarProductos(filtrados);
}

function filtrarClientes(termino) {
    const filtrados = clientesData.filter(cliente => 
        cliente.razon_social.toLowerCase().includes(termino.toLowerCase()) ||
        cliente.dni_ruc.includes(termino) ||
        cliente.distrito.toLowerCase().includes(termino.toLowerCase())
    );
    mostrarClientes(filtrados);
}

function editarProducto(id) {
    const producto = productosData.find(p => p.id === id);
    if (producto) {
        document.getElementById('productoId').value = producto.id;
        document.getElementById('nombreProducto').value = producto.nombre;
        document.getElementById('precioProducto').value = producto.precio;
        document.getElementById('tituloModalProducto').innerHTML = '<i class="fas fa-edit"></i> Editar Producto';
        editandoProducto = true;
        new bootstrap.Modal(document.getElementById('modalProducto')).show();
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
        document.getElementById('tituloModalCliente').innerHTML = '<i class="fas fa-user-edit"></i> Editar Cliente';
        editandoCliente = true;
        new bootstrap.Modal(document.getElementById('modalCliente')).show();
    }
}

function cancelarEdicionProducto() {
    document.getElementById('formProducto').reset();
    editandoProducto = false;
}

function cancelarEdicionCliente() {
    document.getElementById('formCliente').reset();
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

    // Tipo de precio
    document.getElementById('selectTipoPrecio').addEventListener('change', function() {
        const selected = this.options[this.selectedIndex];
        if (selected && selected.dataset.precio) {
            document.getElementById('precioProductoSeleccionado').value = parseFloat(selected.dataset.precio).toFixed(2);
            calcularTotalProducto();
        }
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
    const esMobile = window.innerWidth <= 768;
    
    if (termino.length < 2) {
        select.style.display = 'none';
        if (esMobile) {
            ocultarListaMobile('listaClientesMobile');
        }
        return;
    }

    const clientesFiltrados = clientesData.filter(cliente => 
        cliente.razon_social.toLowerCase().includes(termino.toLowerCase()) ||
        cliente.dni_ruc.includes(termino)
    );

    if (clientesFiltrados.length > 0) {
        if (esMobile) {
            // Usar lista de botones para móviles
            mostrarListaMobileClientes(clientesFiltrados);
            select.style.display = 'none';
        } else {
            // Usar select tradicional para desktop
            mostrarSelectClientes(clientesFiltrados, select);
        }
    } else {
        select.style.display = 'none';
        if (esMobile) {
            ocultarListaMobile('listaClientesMobile');
        }
    }
}

function mostrarSelectClientes(clientesFiltrados, select) {
    select.innerHTML = '';
    
    clientesFiltrados.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = `${cliente.razon_social} - ${cliente.dni_ruc}`;
        option.dataset.cliente = JSON.stringify(cliente);
        select.appendChild(option);
    });
    
    // Remover eventos anteriores
    const newSelect = select.cloneNode(true);
    select.parentNode.replaceChild(newSelect, select);
    
    // Agregar eventos
    newSelect.addEventListener('change', function() {
        if (this.selectedIndex >= 0) {
            const clienteData = JSON.parse(this.options[this.selectedIndex].dataset.cliente);
            seleccionarCliente(clienteData);
        }
    });
    
    newSelect.style.display = 'block';
}

function mostrarListaMobileClientes(clientesFiltrados) {
    const container = document.getElementById('listaClientesMobile');
    if (!container) return;
    
    container.innerHTML = '';
    
    clientesFiltrados.forEach(cliente => {
        const item = document.createElement('div');
        item.className = 'mobile-list-item';
        item.textContent = `${cliente.razon_social} - ${cliente.dni_ruc}`;
        
        // Eventos táctiles
        item.addEventListener('click', function() {
            seleccionarCliente(cliente);
        });
        
        item.addEventListener('touchend', function(e) {
            e.preventDefault();
            seleccionarCliente(cliente);
        });
        
        container.appendChild(item);
    });
    
    container.style.display = 'block';
}

function ocultarListaMobile(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.style.display = 'none';
    }
}

function seleccionarCliente(cliente) {
    clienteSeleccionado = cliente;
    document.getElementById('buscarClienteCotizacion').value = `${cliente.razon_social} - ${cliente.dni_ruc}`;
    document.getElementById('selectCliente').style.display = 'none';
    
    // Ocultar lista móvil si existe
    ocultarListaMobile('listaClientesMobile');
    
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
    
    // Ocultar lista móvil si existe
    ocultarListaMobile('listaClientesMobile');
}

function buscarProductosCotizacion(termino) {
    const select = document.getElementById('selectProducto');
    const esMobile = window.innerWidth <= 768;
    
    if (termino.length < 2) {
        select.style.display = 'none';
        if (esMobile) {
            ocultarListaMobile('listaProductosMobile');
        }
        return;
    }

    const productosFiltrados = productosData.filter(producto => 
        producto.nombre.toLowerCase().includes(termino.toLowerCase())
    );

    if (productosFiltrados.length > 0) {
        if (esMobile) {
            // Usar lista de botones para móviles
            mostrarListaMobileProductos(productosFiltrados);
            select.style.display = 'none';
        } else {
            // Usar select tradicional para desktop
            mostrarSelectProductos(productosFiltrados, select);
        }
    } else {
        select.style.display = 'none';
        if (esMobile) {
            ocultarListaMobile('listaProductosMobile');
        }
    }
}

function mostrarSelectProductos(productosFiltrados, select) {
    select.innerHTML = '';
    
    productosFiltrados.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.id;
        option.textContent = `${producto.nombre} - ${formatearMoneda(producto.precio)}`;
        option.dataset.producto = JSON.stringify(producto);
        select.appendChild(option);
    });
    
    // Remover eventos anteriores
    const newSelect = select.cloneNode(true);
    select.parentNode.replaceChild(newSelect, select);
    
    // Agregar eventos
    newSelect.addEventListener('change', function() {
        if (this.selectedIndex >= 0) {
            const productoData = JSON.parse(this.options[this.selectedIndex].dataset.producto);
            seleccionarProducto(productoData);
        }
    });
    
    newSelect.style.display = 'block';
}

function mostrarListaMobileProductos(productosFiltrados) {
    const container = document.getElementById('listaProductosMobile');
    if (!container) return;
    
    container.innerHTML = '';
    
    productosFiltrados.forEach(producto => {
        const item = document.createElement('div');
        item.className = 'mobile-list-item';
        item.innerHTML = `
            <div><strong>${producto.nombre}</strong></div>
            <div class="text-muted small">${formatearMoneda(producto.precio)}</div>
        `;
        
        // Eventos táctiles
        item.addEventListener('click', function() {
            seleccionarProducto(producto);
        });
        
        item.addEventListener('touchend', function(e) {
            e.preventDefault();
            seleccionarProducto(producto);
        });
        
        container.appendChild(item);
    });
    
    container.style.display = 'block';
}

function seleccionarProducto(producto) {
    productoSeleccionado = producto;
    document.getElementById('buscarProductoCotizacion').value = producto.nombre;
    document.getElementById('precioProductoSeleccionado').value = parseFloat(producto.precio).toFixed(2);
    document.getElementById('selectProducto').style.display = 'none';
    
    // Ocultar lista móvil si existe
    ocultarListaMobile('listaProductosMobile');
    
    // Cargar tipos de precio
    cargarTiposPrecioEnCotizacion(producto.id, producto.precio);
    
    document.getElementById('cantidadProducto').focus();
    calcularTotalProducto();
}

function calcularTotalProducto() {
    if (!productoSeleccionado) return;
    
    const cantidad = parseFloat(document.getElementById('cantidadProducto').value) || 0;
    const precio = parseFloat(document.getElementById('precioProductoSeleccionado').value) || 0;
    const descuento = parseFloat(document.getElementById('descuentoProducto').value) || 0;
    const precioConDescuento = precio * (1 - descuento / 100);
    const total = cantidad * precioConDescuento;
    
    document.getElementById('totalProducto').value = formatearMoneda(total);
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
    const descuento = parseFloat(document.getElementById('descuentoProducto').value) || 0;
    const precioConDescuento = precio * (1 - descuento / 100);
    const total = cantidad * precioConDescuento;
    
    const item = {
        id: ++contadorItems,
        producto_id: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        precio: precio,
        descuento: descuento,
        precioConDescuento: precioConDescuento,
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
    
    const filas = tbody.querySelectorAll('tr:not(#noItems)');
    filas.forEach(fila => fila.remove());
    
    itemsCotizacion.forEach(item => {
        const fila = document.createElement('tr');
        fila.className = 'item-row';
        fila.innerHTML = `
            <td>${item.nombre}</td>
            <td class="text-center">${formatearMoneda(item.precio)}</td>
            <td class="text-center">${item.descuento > 0 ? `<span class="badge bg-warning text-dark">${item.descuento}%</span>` : '-'}</td>
            <td class="text-center">${formatearNumero(item.cantidad)}</td>
            <td class="text-center">${formatearMoneda(item.total)}</td>
            <td class="text-center">${formatearMoneda(item.total)}</td>
            <td class="text-center">
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
    document.getElementById('descuentoProducto').value = '0';
    document.getElementById('cantidadProducto').value = '';
    document.getElementById('totalProducto').value = '';
    document.getElementById('selectProducto').style.display = 'none';
    document.getElementById('colTipoPrecio').style.display = 'none';
    document.getElementById('selectTipoPrecio').innerHTML = '<option value="">-- Precio base --</option>';
    ocultarListaMobile('listaProductosMobile');
}

function calcularTotalCotizacion() {
    const total = itemsCotizacion.reduce((sum, item) => sum + item.total, 0);
    document.getElementById('totalAPagar').textContent = formatearMoneda(total);
    document.getElementById('totalPorFacturar').textContent = formatearMoneda(total);
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
    document.getElementById('saldo').textContent = formatearMoneda(saldo);
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
            <td class="text-center"><strong>${formatearMoneda(cotizacion.total)}</strong></td>
            <td class="text-center">${formatearMoneda(cotizacion.abono)}</td>
            <td class="text-center">${formatearMoneda(cotizacion.saldo)}</td>
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
                                    <button class="btn btn-danger" onclick="eliminarCotizacion(${cotizacion.id})" title="Eliminar cotización">
                                        <i class="fas fa-trash"></i>
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
            <div class="modal-dialog modal-xl">
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
                        <div class="table-responsive mobile-scroll">
                            <table class="table table-sm table-bordered">
                                <thead class="table-light">
                                    <tr>
                                        <th style="min-width: 200px;">Producto</th>
                                        <th class="text-center" style="min-width: 100px;">Precio Unit.</th>
                                        <th class="text-center" style="min-width: 80px;">Cantidad</th>
                                        <th class="text-center" style="min-width: 100px;">Total</th>
                                        <th class="text-center" style="min-width: 100px;">Por Facturar</th>
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
                        </div>
                        
                        <div class="row mt-3">
                            <div class="col-lg-6 offset-lg-6 col-md-8 offset-md-4">
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered">
                                        <tr class="table-light">
                                            <td><strong>Total:</strong></td>
                                            <td class="text-end"><strong>${formatearMoneda(cotizacion.total)}</strong></td>
                                        </tr>
                                        <tr class="table-light">
                                            <td><strong>Por Facturar:</strong></td>
                                            <td class="text-end"><strong>${formatearMoneda(cotizacion.total)}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Abono:</td>
                                            <td class="text-end">${formatearMoneda(cotizacion.abono)}</td>
                                        </tr>
                                        <tr class="table-primary">
                                            <td><strong>Saldo:</strong></td>
                                            <td class="text-end"><strong>${formatearMoneda(cotizacion.saldo)}</strong></td>
                                        </tr>
                                    </table>
                                </div>
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

async function eliminarCotizacion(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la Cotización #${id.toString().padStart(6, '0')}?\n\nEsta acción no se puede deshacer.`)) return;
    
    try {
        const response = await fetch(`/cotizaciones/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            cargarCotizaciones();
        } else {
            alert('Error al eliminar: ' + result.message);
        }
    } catch (error) {
        alert('Error de conexión al eliminar la cotización');
    }
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

// ===== FUNCIONES DE TIPOS DE PRECIO =====
let productoPreciosId = null;

async function abrirTiposPrecio(productoId, productoNombre) {
    productoPreciosId = productoId;
    document.getElementById('nombreProductoTipos').textContent = productoNombre;
    document.getElementById('inputTipoPrecio').value = '';
    document.getElementById('inputPrecioTipo').value = '';
    await cargarTiposPrecio();
    new bootstrap.Modal(document.getElementById('modalTiposPrecio')).show();
}

async function cargarTiposPrecio() {
    try {
        const response = await fetch(`/productos/${productoPreciosId}/tipos-precio`);
        const tipos = await response.json();
        renderTiposPrecio(tipos);
    } catch (error) {
        console.error('Error cargando tipos de precio:', error);
    }
}

function renderTiposPrecio(tipos) {
    const container = document.getElementById('listaTiposPrecio');

    if (tipos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-tag fa-2x mb-2 d-block"></i>
                <p class="mb-0">No hay tipos de precio registrados</p>
                <small>Agrega al menos uno usando el formulario</small>
            </div>`;
        return;
    }

    const filas = tipos.map(t => `
        <tr>
            <td class="align-middle fw-semibold">${t.tipo}</td>
            <td class="text-center align-middle fw-bold text-primary">${formatearMoneda(t.precio)}</td>
            <td class="text-center align-middle">
                <button class="btn btn-danger btn-sm" onclick="eliminarTipoPrecio(${t.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Tipo</th>
                        <th class="text-center">Precio</th>
                        <th class="text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>`;
}

async function agregarTipoPrecio() {
    const tipo = document.getElementById('inputTipoPrecio').value.trim();
    const precio = parseFloat(document.getElementById('inputPrecioTipo').value);

    if (!tipo || !precio || precio <= 0) {
        alert('Por favor completa el tipo y el precio');
        return;
    }

    try {
        const response = await fetch(`/productos/${productoPreciosId}/tipos-precio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, precio })
        });
        const result = await response.json();
        if (result.success) {
            document.getElementById('inputTipoPrecio').value = '';
            document.getElementById('inputPrecioTipo').value = '';
            await cargarTiposPrecio();
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('Error al agregar tipo de precio');
    }
}

async function eliminarTipoPrecio(id) {
    if (!confirm('\u00bfEliminar este tipo de precio?')) return;
    try {
        const response = await fetch(`/tipos-precio/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) await cargarTiposPrecio();
    } catch (error) {
        alert('Error al eliminar tipo de precio');
    }
}

// Cargar tipos de precio al seleccionar un producto en cotización
async function cargarTiposPrecioEnCotizacion(productoId, precioBase) {
    const colTipo = document.getElementById('colTipoPrecio');
    const selectTipo = document.getElementById('selectTipoPrecio');

    try {
        const response = await fetch(`/productos/${productoId}/tipos-precio`);
        const tipos = await response.json();

        selectTipo.innerHTML = `<option value="" data-precio="${precioBase}">-- Precio base (${formatearMoneda(precioBase)}) --</option>`;

        if (tipos.length > 0) {
            tipos.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.dataset.precio = t.precio;
                opt.textContent = `${t.tipo} (${formatearMoneda(t.precio)})`;
                selectTipo.appendChild(opt);
            });
            colTipo.style.display = 'block';
        } else {
            colTipo.style.display = 'none';
        }
    } catch (error) {
        colTipo.style.display = 'none';
    }
}

// ===== FUNCIONES DE ETIQUETAS =====
let clienteEtiquetasId = null;

async function abrirEtiquetas(clienteId, clienteNombre) {
    clienteEtiquetasId = clienteId;
    document.getElementById('nombreClienteEtiquetas').textContent = clienteNombre;
    document.getElementById('inputMarca').value = '';
    document.getElementById('inputNombreProductoEtiqueta').value = '';
    document.getElementById('inputFotoEtiqueta').value = '';
    await cargarEtiquetas();
    new bootstrap.Modal(document.getElementById('modalEtiquetas')).show();
}

async function cargarEtiquetas() {
    try {
        const response = await fetch(`/clientes/${clienteEtiquetasId}/etiquetas`);
        const etiquetas = await response.json();
        renderEtiquetas(etiquetas);
    } catch (error) {
        console.error('Error cargando etiquetas:', error);
    }
}

function renderEtiquetas(etiquetas) {
    const container = document.getElementById('listaEtiquetasCliente');

    if (etiquetas.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-tags fa-2x mb-2 d-block"></i>
                <p class="mb-0">No hay etiquetas registradas para este cliente</p>
            </div>`;
        return;
    }

    const filas = etiquetas.map(e => `
        <tr>
            <td class="text-center align-middle">
                ${e.foto
                    ? `<img src="${e.foto}" alt="${e.marca}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="ampliarFoto('${e.foto}')" title="Click para ampliar">`
                    : `<div style="width:50px;height:50px;background:#f0f0f0;border-radius:6px;display:flex;align-items:center;justify-content:center;margin:auto;"><i class="fas fa-image text-muted"></i></div>`
                }
            </td>
            <td class="text-center align-middle fw-semibold">${e.marca}</td>
            <td class="text-center align-middle">${e.nombre_producto}</td>
            <td class="text-center align-middle text-muted small">${new Date(e.created_at).toLocaleDateString('es-PE')}</td>
            <td class="text-center align-middle">
                <button class="btn btn-danger btn-sm" onclick="eliminarEtiqueta(${e.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th class="text-center" style="width:70px;">Foto</th>
                        <th class="text-center">Marca</th>
                        <th class="text-center">Nombre del Producto</th>
                        <th class="text-center">Fecha</th>
                        <th class="text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>

        <!-- Modal foto ampliada -->
        <div class="modal fade" id="modalFotoEtiqueta" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content bg-transparent border-0">
                    <div class="modal-body text-center p-0">
                        <img id="fotoAmpliada" src="" alt="Foto" style="max-width:100%;max-height:90vh;border-radius:8px;box-shadow:0 0 20px rgba(0,0,0,0.5);">
                    </div>
                </div>
            </div>
        </div>`;
}

async function agregarEtiqueta() {
    const marca = document.getElementById('inputMarca').value.trim();
    const nombre_producto = document.getElementById('inputNombreProductoEtiqueta').value.trim();
    const fotoInput = document.getElementById('inputFotoEtiqueta');

    if (!marca || !nombre_producto) {
        alert('Por favor completa Marca y Nombre del Producto');
        return;
    }

    const formData = new FormData();
    formData.append('marca', marca);
    formData.append('nombre_producto', nombre_producto);
    if (fotoInput.files[0]) formData.append('foto', fotoInput.files[0]);

    try {
        const response = await fetch(`/clientes/${clienteEtiquetasId}/etiquetas`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            document.getElementById('inputMarca').value = '';
            document.getElementById('inputNombreProductoEtiqueta').value = '';
            document.getElementById('inputFotoEtiqueta').value = '';
            await cargarEtiquetas();
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('Error al agregar etiqueta');
    }
}

function ampliarFoto(src) {
    document.getElementById('fotoAmpliada').src = src;
    new bootstrap.Modal(document.getElementById('modalFotoEtiqueta')).show();
}

async function eliminarEtiqueta(id) {
    if (!confirm('\u00bfEliminar esta etiqueta?')) return;
    try {
        const response = await fetch(`/etiquetas/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) await cargarEtiquetas();
    } catch (error) {
        alert('Error al eliminar etiqueta');
    }
}

function seleccionarColor(color) {
    document.getElementById('colorEtiqueta').value = color;
}

// Permitir agregar etiqueta con Enter
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('inputEtiqueta') && document.getElementById('inputEtiqueta').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            agregarEtiqueta();
        }
    });
});

// Función para descargar PDF
function descargarPDF(id) {
    const btn = event.target.closest('button');
    const iconoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    const url = `/cotizaciones/${id}/pdf`;
    const filename = `Cotizacion-${id.toString().padStart(6, '0')}.pdf`;
    
    fetch(url, { headers: { 'Accept': 'application/pdf' } })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/pdf')) {
                throw new Error('Respuesta no es PDF');
            }
            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        })
        .catch(error => {
            console.error('Error descargando PDF:', error);
            // Respaldo: abrir en nueva ventana
            window.open(url, '_blank');
        })
        .finally(() => {
            btn.innerHTML = iconoOriginal;
            btn.disabled = false;
        });
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

// ===== FUNCIONES MÓVILES =====

function inicializarMovil() {
    // Detectar si es dispositivo móvil
    const esMobile = window.innerWidth <= 768;
    
    if (esMobile) {
        // Ajustar tamaños de select para móviles
        const selects = document.querySelectorAll('#selectCliente, #selectProducto');
        selects.forEach(select => {
            select.size = 3;
            // Agregar clase para mejor estilo móvil
            select.classList.add('mobile-select');
        });
        
        // Mejorar experiencia táctil
        agregarEventosTactiles();
        
        // Configurar alternativa de botones para móviles
        configurarAlternativaMobile();
    }
    
    // Listener para cambios de orientación
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            ajustarVistaMobile();
        }, 100);
    });
    
    // Listener para redimensionamiento
    window.addEventListener('resize', function() {
        ajustarVistaMobile();
    });
}

function configurarAlternativaMobile() {
    // Crear contenedores alternativos para listas en móviles
    const selectCliente = document.getElementById('selectCliente');
    const selectProducto = document.getElementById('selectProducto');
    
    if (selectCliente && !document.getElementById('listaClientesMobile')) {
        const container = document.createElement('div');
        container.id = 'listaClientesMobile';
        container.className = 'mobile-list-container';
        container.style.display = 'none';
        selectCliente.parentNode.insertBefore(container, selectCliente.nextSibling);
    }
    
    if (selectProducto && !document.getElementById('listaProductosMobile')) {
        const container = document.createElement('div');
        container.id = 'listaProductosMobile';
        container.className = 'mobile-list-container';
        container.style.display = 'none';
        selectProducto.parentNode.insertBefore(container, selectProducto.nextSibling);
    }
}

function agregarEventosTactiles() {
    // Mejorar selección en listas desplegables
    const selectCliente = document.getElementById('selectCliente');
    const selectProducto = document.getElementById('selectProducto');
    
    // Configurar eventos táctiles para select de cliente
    if (selectCliente) {
        // Remover eventos anteriores para evitar duplicados
        selectCliente.removeEventListener('touchstart', handleTouchStart);
        selectCliente.removeEventListener('touchend', handleTouchEnd);
        
        selectCliente.addEventListener('touchstart', handleTouchStart, { passive: false });
        selectCliente.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Mejorar la selección con tap
        selectCliente.addEventListener('touchstart', function(e) {
            this.focus();
        }, { passive: true });
    }
    
    // Configurar eventos táctiles para select de producto
    if (selectProducto) {
        // Remover eventos anteriores para evitar duplicados
        selectProducto.removeEventListener('touchstart', handleTouchStart);
        selectProducto.removeEventListener('touchend', handleTouchEnd);
        
        selectProducto.addEventListener('touchstart', handleTouchStart, { passive: false });
        selectProducto.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Mejorar la selección con tap
        selectProducto.addEventListener('touchstart', function(e) {
            this.focus();
        }, { passive: true });
    }
    
    // Mejorar botones de acción
    const botones = document.querySelectorAll('.btn');
    botones.forEach(btn => {
        btn.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
            this.style.transition = 'transform 0.1s';
        }, { passive: true });
        
        btn.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        }, { passive: true });
    });
}

// Funciones auxiliares para manejo de eventos táctiles
function handleTouchStart(e) {
    e.stopPropagation();
}

function handleTouchEnd(e) {
    e.stopPropagation();
    
    // Forzar la selección en móviles
    if (this.selectedIndex >= 0) {
        const event = new Event('change', { bubbles: true });
        this.dispatchEvent(event);
    }
}

function ajustarVistaMobile() {
    const esMobile = window.innerWidth <= 768;
    
    // Ajustar tablas para móviles
    const tablas = document.querySelectorAll('.table-responsive');
    tablas.forEach(tabla => {
        if (esMobile) {
            tabla.classList.add('mobile-scroll');
        } else {
            tabla.classList.remove('mobile-scroll');
        }
    });
    
    // Ajustar modales para móviles
    const modales = document.querySelectorAll('.modal-dialog');
    modales.forEach(modal => {
        if (esMobile) {
            modal.style.margin = '10px';
            modal.style.maxWidth = 'calc(100% - 20px)';
        } else {
            modal.style.margin = '';
            modal.style.maxWidth = '';
        }
    });
}

// Función para optimizar scroll en móviles
function optimizarScrollMobile() {
    if ('scrollBehavior' in document.documentElement.style) {
        document.documentElement.style.scrollBehavior = 'smooth';
    }
}

// Llamar optimización al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizarScrollMobile);
} else {
    optimizarScrollMobile();
}