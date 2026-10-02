/* ==========================================================
   MINI FACTURADOR - VÍVERES DARIO
   Lógica JavaScript corregida
   ========================================================== */

// --- ESTADO Y DATOS DE LA APLICACIÓN ---
let listaProductos = JSON.parse(localStorage.getItem('inventarioDario')) || [
    { codigo: '101', nombre: 'Arroz Flor 1kg', precio: 1.25, costo: 0.95, stock: 50, conIva: false },
    { codigo: '102', nombre: 'Aceite Girasol 1L', precio: 3.50, costo: 2.80, stock: 20, conIva: true },
    { codigo: '103', nombre: 'Coca Cola 1.5L', precio: 1.50, costo: 1.10, stock: 30, conIva: true, esBebida: true }
];

let carritoFactura = [];
let ventasRegistradas = JSON.parse(localStorage.getItem('ventasDario')) || [];

const CREDANCIALES_CONTABILIDAD = { usuario: "admin", clave: "1234" };

let html5QrcodeScanner = null;
let productoTemperaturaPendiente = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    actualizarTablaInventario();
    actualizarTablaFactura();
    actualizarHistorialVentas();
    cargarTemaGuardado();

    // Eventos
    document.getElementById('inputCodigoBarras')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarYAgregarPorCodigo(this.value.trim());
            this.value = '';
        }
    });
});

// --- APARIENCIA / TEMA ---
function cambiarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('temaDario', tema);
}

function cargarTemaGuardado() {
    const temaGuardado = localStorage.getItem('temaDario') || 'oscuro';
    cambiarTema(temaGuardado);
}

// --- FACTURACIÓN Y CARRITO ---
function buscarYAgregarPorCodigo(codigo) {
    if (!codigo) return;
    const producto = listaProductos.find(p => p.codigo === codigo);
    
    if (producto) {
        if (producto.stock <= 0) {
            alert(`¡Atención! El producto "${producto.nombre}" está agotado en inventario.`);
            return;
        }
        
        if (producto.esBebida) {
            productoTemperaturaPendiente = producto;
            abrirModalTemperatura();
        } else {
            ejecutarAgregarAFactura(producto, false);
        }
    } else {
        alert('Producto no encontrado con el código: ' + codigo);
    }
}

function abrirModalTemperatura() {
    const modal = document.getElementById('modalTemperatura');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalTemperatura() {
    const modal = document.getElementById('modalTemperatura');
    if (modal) modal.style.display = 'none';
    productoTemperaturaPendiente = null;
}

function seleccionarTemperatura(esFria) {
    if (productoTemperaturaPendiente) {
        ejecutarAgregarAFactura(productoTemperaturaPendiente, esFria);
    }
    cerrarModalTemperatura();
}

function ejecutarAgregarAFactura(producto, esFria) {
    let precioFinal = Number(producto.precio);
    let nombreFinal = producto.nombre;

    if (esFria) {
        precioFinal += 0.10;
        nombreFinal += ' (Fría +$0.10)';
    }

    // Verificar stock disponible considerando lo que ya hay en el carrito
    const itemExistente = carritoFactura.find(item => item.codigo === producto.codigo && item.esFria === esFria);
    const cantidadEnCarrito = itemExistente ? itemExistente.cantidad : 0;

    if (cantidadEnCarrito + 1 > producto.stock) {
        alert(`No hay suficiente stock de "${producto.nombre}". Stock disponible: ${producto.stock}`);
        return;
    }

    if (itemExistente) {
        itemExistente.cantidad += 1;
        itemExistente.subtotal = itemExistente.cantidad * itemExistente.precioUnitario;
    } else {
        carritoFactura.push({
            codigo: producto.codigo,
            nombre: nombreFinal,
            precioUnitario: precioFinal,
            costoUnitario: Number(producto.costo),
            cantidad: 1,
            subtotal: precioFinal,
            conIva: producto.conIva,
            esFria: esFria
        });
    }

    actualizarTablaFactura();
}

function cambiarCantidadCarrito(index, cambio) {
    const item = carritoFactura[index];
    const productoProd = listaProductos.find(p => p.codigo === item.codigo);

    if (!item) return;

    const nuevaCantidad = item.cantidad + cambio;

    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(index);
        return;
    }

    if (productoProd && nuevaCantidad > productoProd.stock) {
        alert(`No puedes agregar más. El stock máximo disponible de "${productoProd.nombre}" es ${productoProd.stock}.`);
        return;
    }

    item.cantidad = nuevaCantidad;
    item.subtotal = item.cantidad * item.precioUnitario;
    actualizarTablaFactura();
}

function eliminarDelCarrito(index) {
    carritoFactura.splice(index, 1);
    actualizarTablaFactura();
}

function vaciarCarrito() {
    carritoFactura = [];
    actualizarTablaFactura();
}

function actualizarTablaFactura() {
    const tbody = document.getElementById('tbodyFactura');
    if (!tbody) return;

    tbody.innerHTML = '';

    carritoFactura.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nombre}</td>
            <td>$${item.precioUnitario.toFixed(2)}</td>
            <td>
                <div class="control-cantidad">
                    <button type="button" onclick="cambiarCantidadCarrito(${index}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button type="button" onclick="cambiarCantidadCarrito(${index}, 1)">+</button>
                </div>
            </td>
            <td>$${item.subtotal.toFixed(2)}</td>
            <td><button class="btn-eliminar-item" onclick="eliminarDelCarrito(${index})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });

    calcularTotales();
}

// CORRECCIÓN CLAVE EN EL CÁLCULO DE TOTALES
function calcularTotales() {
    let subtotal0 = 0;
    let subtotal15Base = 0;
    let totalIva = 0;

    carritoFactura.forEach(item => {
        if (item.conIva) {
            // El precioUnitario ya incluye IVA, desglosamos la base y el impuesto de este item
            const baseItem = item.subtotal / 1.15;
            const ivaItem = item.subtotal - baseItem;
            subtotal15Base += baseItem;
            totalIva += ivaItem;
        } else {
            subtotal0 += item.subtotal;
        }
    });

    const subtotalGeneral = subtotal0 + subtotal15Base;
    const totalPagar = subtotalGeneral + totalIva;

    document.getElementById('lblSubtotal').innerText = `$${subtotalGeneral.toFixed(2)}`;
    document.getElementById('lblSubtotal0').innerText = `$${subtotal0.toFixed(2)}`;
    document.getElementById('lblSubtotal15').innerText = `$${subtotal15Base.toFixed(2)}`;
    document.getElementById('lblIva').innerText = `$${totalIva.toFixed(2)}`;
    document.getElementById('lblTotal').innerText = `$${totalPagar.toFixed(2)}`;

    calcularVuelto();
}

function calcularVuelto() {
    const inputPaga = document.getElementById('inputPagaCon');
    const lblVuelto = document.getElementById('lblVuelto');

    if (!inputPaga || !lblVuelto) return;

    const totalText = document.getElementById('lblTotal').innerText.replace('$', '');
    const total = parseFloat(totalText) || 0;
    const pagaCon = parseFloat(inputPaga.value) || 0;

    if (pagaCon >= total && total > 0) {
        lblVuelto.innerText = `$${(pagaCon - total).toFixed(2)}`;
        lblVuelto.style.color = 'var(--exito)';
    } else {
        lblVuelto.innerText = '$0.00';
        lblVuelto.style.color = 'var(--texto-mutado)';
    }
}

// --- COBRAR Y REGISTRAR VENTA ---
function procesarCobro() {
    if (carritoFactura.length === 0) {
        alert('El carrito está vacío.');
        return;
    }

    const totalText = document.getElementById('lblTotal').innerText.replace('$', '');
    const total = parseFloat(totalText) || 0;
    const pagaCon = parseFloat(document.getElementById('inputPagaCon')?.value) || total;

    if (pagaCon < total) {
        alert('El monto ingresado es menor al total a pagar.');
        return;
    }

    // Descontar inventario
    carritoFactura.forEach(item => {
        const prod = listaProductos.find(p => p.codigo === item.codigo);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - item.cantidad);
        }
    });

    // Guardar Venta
    const clienteNombre = document.getElementById('inputClienteNombre')?.value.trim() || 'Consumidor Final';
    const clienteCedula = document.getElementById('inputClienteCedula')?.value.trim() || '9999999999';

    const nuevaVenta = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        cliente: clienteNombre,
        cedula: clienteCedula,
        productos: [...carritoFactura],
        total: total,
        pagaCon: pagaCon,
        vuelto: pagaCon - total
    };

    ventasRegistradas.unshift(nuevaVenta);

    localStorage.setItem('inventarioDario', JSON.stringify(listaProductos));
    localStorage.setItem('ventasDario', JSON.stringify(ventasRegistradas));

    alert('¡Venta realizada con éxito!');

    actualizarTablaInventario();
    actualizarHistorialVentas();
    vaciarCarrito();
    
    if (document.getElementById('inputPagaCon')) document.getElementById('inputPagaCon').value = '';
}

// --- GESTIÓN DE INVENTARIO ---
function guardarProductoNuevo(e) {
    e?.preventDefault();

    const codigo = document.getElementById('prodCodigo').value.trim();
    const nombre = document.getElementById('prodNombre').value.trim();
    const precio = parseFloat(document.getElementById('prodPrecio').value);
    const costo = parseFloat(document.getElementById('prodCosto').value) || 0;
    const stock = parseInt(document.getElementById('prodStock').value) || 0;
    const conIva = document.getElementById('prodIva').checked;
    const esBebida = document.getElementById('prodBebida').checked;

    if (!codigo || !nombre || isNaN(precio)) {
        alert('Por favor complete los campos obligatorios (Código, Nombre, Precio).');
        return;
    }

    const index = listaProductos.findIndex(p => p.codigo === codigo);
    if (index >= 0) {
        listaProductos[index] = { codigo, nombre, precio, costo, stock, conIva, esBebida };
    } else {
        listaProductos.push({ codigo, nombre, precio, costo, stock, conIva, esBebida });
    }

    localStorage.setItem('inventarioDario', JSON.stringify(listaProductos));
    actualizarTablaInventario();
    document.getElementById('formProducto').reset();
}

function actualizarTablaInventario() {
    const tbody = document.getElementById('tbodyInventario');
    if (!tbody) return;

    tbody.innerHTML = '';

    listaProductos.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.codigo}</td>
            <td>${p.nombre}</td>
            <td>$${Number(p.precio).toFixed(2)}</td>
            <td>$${Number(p.costo).toFixed(2)}</td>
            <td>
                <span class="${p.stock <= 5 ? 'badge-stock-bajo' : 'badge-stock-ok'}">
                    ${p.stock}
                </span>
            </td>
            <td>${p.conIva ? '15%' : '0%'}</td>
            <td>
                <button class="btn-editar" onclick="cargarProductoFormulario(${index})">✏️</button>
                <button class="btn-eliminar" onclick="eliminarProductoLista(${index})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function cargarProductoFormulario(index) {
    const p = listaProductos[index];
    if (!p) return;

    document.getElementById('prodCodigo').value = p.codigo;
    document.getElementById('prodNombre').value = p.nombre;
    document.getElementById('prodPrecio').value = p.precio;
    document.getElementById('prodCosto').value = p.costo;
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodIva').checked = p.conIva;
    document.getElementById('prodBebida').checked = p.esBebida;
}

// CORRECCIÓN EN ELIMINACIÓN DE PRODUCTO POR ÍNDICE
function eliminarProductoLista(index) {
    if (confirm(`¿Desea eliminar el producto "${listaProductos[index]?.nombre}"?`)) {
        listaProductos.splice(index, 1);
        localStorage.setItem('inventarioDario', JSON.stringify(listaProductos));
        actualizarTablaInventario();
    }
}

// --- REABASTECIMIENTO ---
function buscarProductoReabastecer() {
    const codigo = document.getElementById('inputReabastecerCodigo').value.trim();
    const prod = listaProductos.find(p => p.codigo === codigo);

    if (prod) {
        document.getElementById('infoReabastecer').style.display = 'block';
        document.getElementById('lblReabastecerNombre').innerText = prod.nombre;
        document.getElementById('lblReabastecerStockActual').innerText = prod.stock;
    } else {
        alert('Producto no encontrado.');
        document.getElementById('infoReabastecer').style.display = 'none';
    }
}

function confirmarReabastecimiento() {
    const codigo = document.getElementById('inputReabastecerCodigo').value.trim();
    const sumaStock = parseInt(document.getElementById('inputReabastecerCantidad').value) || 0;
    const prod = listaProductos.find(p => p.codigo === codigo);

    if (prod && sumaStock > 0) {
        prod.stock += sumaStock;
        localStorage.setItem('inventarioDario', JSON.stringify(listaProductos));
        actualizarTablaInventario();
        alert(`Se han añadido ${sumaStock} unidades a "${prod.nombre}".`);
        document.getElementById('inputReabastecerCodigo').value = '';
        document.getElementById('inputReabastecerCantidad').value = '';
        document.getElementById('infoReabastecer').style.display = 'none';
    } else {
        alert('Ingrese una cantidad válida.');
    }
}

// --- ESCÁNER DE CÁMARA ---
function iniciarEscanerCamara() {
    const contenedor = document.getElementById('reader');
    if (!contenedor) return;

    contenedor.style.display = 'block';

    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 150 } });
        html5QrcodeScanner.render((decodedText) => {
            buscarYAgregarPorCodigo(decodedText);
            detenerEscanerCamara();
        }, (error) => {
            // Error continuo de escaneo ignorado
        });
    }
}

function detenerEscanerCamara() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(() => {
            html5QrcodeScanner = null;
            document.getElementById('reader').style.display = 'none';
        }).catch(err => console.error(err));
    }
}

// --- CONTABILIDAD Y REPORTE ---
function autenticarContabilidad() {
    const u = document.getElementById('usuarioContable').value;
    const c = document.getElementById('claveContable').value;

    // SE MANTIENE LA CREDENCIAL TEMPORAL SOLICITADA PARA TRABAJARLA DESPUÉS
    if (u === CREDANCIALES_CONTABILIDAD.usuario && c === CREDANCIALES_CONTABILIDAD.clave) {
        document.getElementById('loginContable').style.display = 'none';
        document.getElementById('panelContable').style.display = 'block';
        actualizarHistorialVentas();
    } else {
        alert('Credenciales incorrectas.');
    }
}

function actualizarHistorialVentas() {
    const tbody = document.getElementById('tbodyHistorialVentas');
    if (!tbody) return;

    tbody.innerHTML = '';
    let ingresosTotales = 0;
    let gananciaBruta = 0;

    ventasRegistradas.forEach(v => {
        ingresosTotales += v.total;

        let costoVentaTotal = 0;
        let prodsTexto = v.productos.map(p => {
            costoVentaTotal += (p.costoUnitario || 0) * p.cantidad;
            return `${p.nombre} (x${p.cantidad})`;
        }).join(', ');

        gananciaBruta += (v.total - costoVentaTotal);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${v.fecha}</td>
            <td>${v.cliente} (${v.cedula})</td>
            <td>${prodsTexto}</td>
            <td>$${v.total.toFixed(2)}</td>
            <td>$${(v.pagaCon || v.total).toFixed(2)}</td>
            <td>$${(v.vuelto || 0).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    if (document.getElementById('lblTotalIngresos')) {
        document.getElementById('lblTotalIngresos').innerText = `$${ingresosTotales.toFixed(2)}`;
    }
    if (document.getElementById('lblGananciaEstimada')) {
        document.getElementById('lblGananciaEstimada').innerText = `$${gananciaBruta.toFixed(2)}`;
    }
}

// CORRECCIÓN EN EXPORTACIÓN A EXCEL (COINCIDENCIA DE DATOS)
function exportarContabilidadExcel() {
    if (ventasRegistradas.length === 0) {
        alert('No hay ventas registradas para exportar.');
        return;
    }

    let tablaHtml = `
        <table border="1">
            <thead>
                <tr style="background-color: #008080; color: white;">
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Cédula</th>
                    <th>Productos</th>
                    <th>Total ($)</th>
                    <th>Paga con ($)</th>
                    <th>Vuelto ($)</th>
                </tr>
            </thead>
            <tbody>
    `;

    ventasRegistradas.forEach(v => {
        let prodsTexto = v.productos.map(p => `${p.nombre} (x${p.cantidad})`).join('; ');
        tablaHtml += `
            <tr>
                <td>${v.fecha}</td>
                <td>${v.cliente}</td>
                <td>${v.cedula}</td>
                <td>${prodsTexto}</td>
                <td>${v.total.toFixed(2)}</td>
                <td>${(v.pagaCon || v.total).toFixed(2)}</td>
                <td>${(v.vuelto || 0).toFixed(2)}</td>
            </tr>
        `;
    });

    tablaHtml += '</tbody></table>';

    const blob = new Blob(['\ufeff' + tablaHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Contable_Viveres_DARIO_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- QUIZ INTERACTIVO ---
function evaluarQuiz() {
    const respuestasCorrectas = { q1: 'b', q2: 'a', q3: 'b' };
    let puntaje = 0;
    const form = document.getElementById('formQuiz');
    if (!form) return;

    const data = new FormData(form);

    for (let [pregunta, respuesta] of data.entries()) {
        if (respuestasCorrectas[pregunta] === respuesta) {
            puntaje++;
        }
    }

    const resultado = document.getElementById('resultadoQuiz');
    if (resultado) {
        resultado.innerText = `Obtuviste ${puntaje} de 3 respuestas correctas.`;
        resultado.style.color = puntaje === 3 ? 'var(--exito)' : 'var(--acento)';
    }
}