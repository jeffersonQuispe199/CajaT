// ===================================================
// CONTROL DE TAXI - UNIDAD 47 (LÓGICA JAVASCRIPT)
// ===================================================

let registros = JSON.parse(localStorage.getItem('taxi_registros_u47')) || [];
let gananciasChart = null;

// Elementos del DOM
const taxiForm = document.getElementById('taxiForm');
const editIdInput = document.getElementById('editId');
const fechaInput = document.getElementById('fecha');
const ingresoInput = document.getElementById('ingreso');
const gasolinaInput = document.getElementById('gasolina');
const otrosGastosInput = document.getElementById('otrosGastos');
const notaInput = document.getElementById('nota');

const formTitle = document.getElementById('formTitle');
const btnGuardar = document.getElementById('btnGuardar');
const btnCancelar = document.getElementById('btnCancelar');
const btnExportar = document.getElementById('btnExportar');

const resumenBruto = document.getElementById('resumenBruto');
const resumenGastos = document.getElementById('resumenGastos');
const resumenNeta = document.getElementById('resumenNeta');
const listaRegistros = document.getElementById('listaRegistros');

// Inicializar fecha por defecto a HOY
document.addEventListener('DOMContentLoaded', () => {
    fechaInput.value = new Date().toISOString().split('T')[0];
    inicializarGrafico();
    actualizarVista();
});

// ===================================================
// GESTIÓN DE REGISTROS Y FORMULARIO
// ===================================================

taxiForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const editId = editIdInput.value;
    const fecha = fechaInput.value;
    const ingreso = parseFloat(ingresoInput.value) || 0;
    const gasolina = parseFloat(gasolinaInput.value) || 0;
    const otrosGastos = parseFloat(otrosGastosInput.value) || 0;
    const nota = notaInput.value.trim();

    const totalGastos = gasolina + otrosGastos;
    const gananciaNeta = ingreso - totalGastos;

    if (editId) {
        // Editar registro existente
        registros = registros.map(r => {
            if (r.id === editId) {
                return { id: editId, fecha, ingreso, gasolina, otrosGastos, totalGastos, gananciaNeta, nota };
            }
            return r;
        });
        resetFormulario();
    } else {
        // Nuevo registro
        const nuevoRegistro = {
            id: Date.now().toString(),
            fecha,
            ingreso,
            gasolina,
            otrosGastos,
            totalGastos,
            gananciaNeta,
            nota
        };
        registros.push(nuevoRegistro);
    }

    // Ordenar registros por fecha (más recientes primero)
    registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    guardarEnLocalStorage();
    actualizarVista();
    taxiForm.reset();
    fechaInput.value = new Date().toISOString().split('T')[0];
});

btnCancelar.addEventListener('click', resetFormulario);

function resetFormulario() {
    editIdInput.value = '';
    formTitle.textContent = 'Registrar Día';
    btnGuardar.textContent = 'Guardar Registro';
    btnCancelar.classList.add('hidden');
    taxiForm.reset();
    fechaInput.value = new Date().toISOString().split('T')[0];
}

// ===================================================
// ACTUALIZAR INTERFAZ Y RESUMEN
// ===================================================

function actualizarVista() {
    renderizarHistorial();
    calcularResumenes();
    actualizarGrafico();
}

function calcularResumenes() {
    const totalBrutoVal = registros.reduce((acc, r) => acc + r.ingreso, 0);
    const totalGastosVal = registros.reduce((acc, r) => acc + r.totalGastos, 0);
    const totalNetaVal = totalBrutoVal - totalGastosVal;

    resumenBruto.textContent = `$${totalBrutoVal.toFixed(2)}`;
    resumenGastos.textContent = `$${totalGastosVal.toFixed(2)}`;
    resumenNeta.textContent = `$${totalNetaVal.toFixed(2)}`;
}

function renderizarHistorial() {
    listaRegistros.innerHTML = '';

    if (registros.length === 0) {
        listaRegistros.innerHTML = '<p class="empty-msg">No hay días registrados aún.</p>';
        return;
    }

    registros.forEach(r => {
        const item = document.createElement('div');
        item.className = 'history-item';

        // Formatear la fecha
        const partesFecha = r.fecha.split('-');
        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

        item.innerHTML = `
            <div>
                <span class="item-date">${fechaFormateada}</span>
                <div class="item-details">
                    Recaudado: $${r.ingreso.toFixed(2)} | Gas: $${r.gasolina.toFixed(2)} | Otros: $${r.otrosGastos.toFixed(2)}
                </div>
                ${r.nota ? `<div class="item-details item-note">Nota: ${r.nota}</div>` : ''}
            </div>
            <div class="item-right">
                <span class="item-net">$${r.gananciaNeta.toFixed(2)}</span>
                <div class="item-actions">
                    <button class="action-btn action-edit" onclick="cargarParaEditar('${r.id}')">Editar</button>
                    <button class="action-btn action-delete" onclick="eliminarRegistro('${r.id}')">Eliminar</button>
                </div>
            </div>
        `;
        listaRegistros.appendChild(item);
    });
}

// ===================================================
// EDITAR Y ELIMINAR
// ===================================================

window.cargarParaEditar = function(id) {
    const r = registros.find(item => item.id === id);
    if (!r) return;

    editIdInput.value = r.id;
    fechaInput.value = r.fecha;
    ingresoInput.value = r.ingreso;
    gasolinaInput.value = r.gasolina;
    otrosGastosInput.value = r.otrosGastos;
    notaInput.value = r.nota || '';

    formTitle.textContent = 'Editar Registro';
    btnGuardar.textContent = 'Actualizar Registro';
    btnCancelar.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.eliminarRegistro = function(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
        registros = registros.filter(r => r.id !== id);
        guardarEnLocalStorage();
        actualizarVista();
        if (editIdInput.value === id) {
            resetFormulario();
        }
    }
};

function guardarEnLocalStorage() {
    localStorage.setItem('taxi_registros_u47', JSON.stringify(registros));
}

// ===================================================
// INTEGRACIÓN DE CHART.JS (GRÁFICO)
// ===================================================

function inicializarGrafico() {
    const ctx = document.getElementById('gananciasChart').getContext('2d');
    gananciasChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Ganancia Neta ($)',
                data: [],
                borderColor: '#4ade80',
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: '#a0aec0', font: { size: 10 } },
                    grid: { color: 'rgba(59, 76, 104, 0.2)' }
                },
                y: {
                    ticks: { color: '#a0aec0', font: { size: 10 } },
                    grid: { color: 'rgba(59, 76, 104, 0.2)' }
                }
            }
        }
    });
}

function actualizarGrafico() {
    if (!gananciasChart) return;

    // Tomar los últimos 10 registros ordenados por fecha ascendente
    const ultimosRegistros = [...registros]
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        .slice(-10);

    const labels = ultimosRegistros.map(r => {
        const p = r.fecha.split('-');
        return `${p[2]}/${p[1]}`;
    });
    const data = ultimosRegistros.map(r => r.gananciaNeta);

    gananciasChart.data.labels = labels;
    gananciasChart.data.datasets[0].data = data;
    gananciasChart.update();
}

// ===================================================
// EXPORTAR A EXCEL (CSV)
// ===================================================

btnExportar.addEventListener('click', () => {
    if (registros.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Fecha,Total Recaudado ($),Gasolina ($),Otros Gastos ($),Total Gastos ($),Ganancia Neta ($),Detalle\n";

    registros.forEach(r => {
        const notaLimpia = (r.nota || '').replace(/"/g, '""');
        csvContent += `"${r.fecha}",${r.ingreso},${r.gasolina},${r.otrosGastos},${r.totalGastos},${r.gananciaNeta},"${notaLimpia}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Taxi_U47_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});