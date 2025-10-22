// Datos globales
let pagaresData = [];
let pagaresCalculados = [];
let currentSortColumn = null;
let currentSortDirection = 'asc';

// Elementos del DOM
const csvFileInput = document.getElementById('csvFile');
const fileNameSpan = document.getElementById('fileName');
const separadorCamposSelect = document.getElementById('separadorCampos');
const separadorMilesSelect = document.getElementById('separadorMiles');
const separadorDecimalesSelect = document.getElementById('separadorDecimales');
const ejemploNumeroSpan = document.getElementById('ejemploNumero');
const tasaInteresInput = document.getElementById('tasaInteres');
const tipoDescuentoSelect = document.getElementById('tipoDescuento');
const baseDiasSelect = document.getElementById('baseDias');
const calcularBtn = document.getElementById('calcularBtn');
const fechaActualSpan = document.getElementById('fechaActual');
const totalPagaresSpan = document.getElementById('totalPagares');
const totalMontoSpan = document.getElementById('totalMonto');
const totalInteresesSpan = document.getElementById('totalIntereses');
const totalValorEfectivoSpan = document.getElementById('totalValorEfectivo');
const pagaresBody = document.getElementById('pagaresBody');
const filtroCompradorSelect = document.getElementById('filtroComprador');
const filtroUnidadSelect = document.getElementById('filtroUnidad');

// Feriados fijos de Paraguay
const feriadosFijos = [
    { mes: 1, dia: 1 },    // Año Nuevo
    { mes: 3, dia: 1 },    // Día de los Héroes
    { mes: 5, dia: 1 },    // Día del Trabajador
    { mes: 5, dia: 14 },   // Independencia Nacional (día 1)
    { mes: 5, dia: 15 },   // Independencia Nacional (día 2)
    { mes: 6, dia: 12 },   // Día de la Paz del Chaco
    { mes: 8, dia: 15 },   // Fundación de Asunción
    { mes: 9, dia: 29 },   // Victoria de Boquerón
    { mes: 12, dia: 8 },   // Virgen de Caacupé
    { mes: 12, dia: 25 }   // Navidad
];

// Calcular Semana Santa (Jueves y Viernes Santo)
function calcularSemanaSanta(year) {
    // Algoritmo de Meeus/Jones/Butcher para calcular la Pascua
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    const pascua = new Date(year, month - 1, day);

    // Jueves Santo (3 días antes de Pascua)
    const juevesSanto = new Date(pascua);
    juevesSanto.setDate(pascua.getDate() - 3);

    // Viernes Santo (2 días antes de Pascua)
    const viernesSanto = new Date(pascua);
    viernesSanto.setDate(pascua.getDate() - 2);

    return [
        { mes: juevesSanto.getMonth() + 1, dia: juevesSanto.getDate() },
        { mes: viernesSanto.getMonth() + 1, dia: viernesSanto.getDate() }
    ];
}

// Obtener todos los feriados para un año específico
function obtenerFeriados(year) {
    const semanaSanta = calcularSemanaSanta(year);
    return [...feriadosFijos, ...semanaSanta];
}

// Verificar si una fecha es día no hábil
function esDiaNoHabil(fecha) {
    const diaSemana = fecha.getDay();

    // Verificar si es fin de semana
    if (diaSemana === 0 || diaSemana === 6) {
        return true;
    }

    // Verificar si es feriado
    const feriados = obtenerFeriados(fecha.getFullYear());
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();

    return feriados.some(f => f.mes === mes && f.dia === dia);
}

// Ajustar fecha al siguiente día hábil
function ajustarASiguienteDiaHabil(fecha) {
    const fechaAjustada = new Date(fecha);

    while (esDiaNoHabil(fechaAjustada)) {
        fechaAjustada.setDate(fechaAjustada.getDate() + 1);
    }

    return fechaAjustada;
}

// Parsear número con configuración personalizada
function parsearNumero(numeroStr) {
    const sepMiles = separadorMilesSelect.value;
    const sepDecimales = separadorDecimalesSelect.value;

    // Limpiar el string
    let numero = numeroStr.trim();

    // Remover el separador de miles
    if (sepMiles) {
        numero = numero.split(sepMiles).join('');
    }

    // Reemplazar el separador de decimales por punto (estándar JavaScript)
    if (sepDecimales && sepDecimales !== '.') {
        numero = numero.replace(sepDecimales, '.');
    }

    return parseFloat(numero);
}

// Actualizar ejemplo de número
function actualizarEjemploNumero() {
    const sepMiles = separadorMilesSelect.value;
    const sepDecimales = separadorDecimalesSelect.value;

    // Crear un ejemplo
    let ejemploOriginal;
    if (sepMiles === '.' && sepDecimales === ',') {
        ejemploOriginal = '1.200,50';
    } else if (sepMiles === ',' && sepDecimales === '.') {
        ejemploOriginal = '1,200.50';
    } else if (sepMiles === '' && sepDecimales === '.') {
        ejemploOriginal = '1200.50';
    } else if (sepMiles === '' && sepDecimales === ',') {
        ejemploOriginal = '1200,50';
    } else if (sepMiles === '.' && sepDecimales === '.') {
        ejemploOriginal = '1.200 (¡Ambiguo!)';
    } else {
        ejemploOriginal = '1,200 (¡Ambiguo!)';
    }

    const ejemploProcesado = parsearNumero(ejemploOriginal.split(' ')[0]);
    ejemploNumeroSpan.textContent = `${ejemploOriginal} → ${ejemploProcesado}`;
}

// Parsear fecha del CSV (formato: DD/M/YY o D/M/YY)
function parsearFecha(fechaStr) {
    const partes = fechaStr.trim().split('/');
    if (partes.length !== 3) return null;

    const dia = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1; // JavaScript usa meses 0-11
    let year = parseInt(partes[2]);

    // Ajustar el año (asumiendo 20XX para años de 2 dígitos)
    if (year < 100) {
        year += 2000;
    }

    return new Date(year, mes, dia);
}

// Formatear fecha para mostrar (DD/MM/YYYY)
function formatearFecha(fecha) {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const year = fecha.getFullYear();
    return `${dia}/${mes}/${year}`;
}

// Calcular días entre dos fechas
function calcularDias(fecha1, fecha2) {
    const unDia = 24 * 60 * 60 * 1000;
    return Math.round((fecha2 - fecha1) / unDia);
}

// Calcular descuento y valor efectivo
function calcularDescuento(monto, dias, tasaAnual, tipoDescuento, baseDias) {
    // Si no hay días positivos, no hay descuento
    if (dias <= 0) {
        return {
            descuento: 0,
            valorEfectivo: monto
        };
    }

    const tasaDecimal = tasaAnual / 100;
    const base = parseInt(baseDias);
    const tiempo = dias / base;

    let descuento, valorEfectivo;

    if (tipoDescuento === 'comercial') {
        // Descuento Comercial/Bancario
        // Descuento = Monto × Tasa × (Días/Base)
        // Valor Efectivo = Monto - Descuento
        descuento = monto * tasaDecimal * tiempo;
        valorEfectivo = monto - descuento;
    } else {
        // Descuento Racional/Matemático
        // Valor Efectivo = Monto / (1 + Tasa × (Días/Base))
        // Descuento = Monto - Valor Efectivo
        valorEfectivo = monto / (1 + tasaDecimal * tiempo);
        descuento = monto - valorEfectivo;
    }

    return {
        descuento: Math.max(0, descuento),
        valorEfectivo: Math.max(0, valorEfectivo)
    };
}

// Cargar CSV desde archivo
function cargarCSV(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const separadorCampos = separadorCamposSelect.value;

            // Parsear CSV
            const lineas = text.split('\n');
            pagaresData = [];

            // Saltar la primera línea (encabezados)
            for (let i = 1; i < lineas.length; i++) {
                const linea = lineas[i].trim();
                if (!linea) continue;

                const campos = linea.split(separadorCampos);
                if (campos.length >= 5) {
                    const pagare = {
                        proyecto: campos[0],
                        comprador: campos[1],
                        unidad: campos[2],
                        vencimiento: campos[3],
                        monto: parsearNumero(campos[4])
                    };

                    // Validar que el monto sea un número válido
                    if (!isNaN(pagare.monto) && pagare.monto > 0) {
                        pagaresData.push(pagare);
                    }
                }
            }

            console.log(`Cargados ${pagaresData.length} pagarés`);

            // Habilitar botón de calcular
            calcularBtn.disabled = false;

            // Actualizar UI
            fileNameSpan.textContent = `✓ ${file.name} (${pagaresData.length} pagarés cargados)`;
            fileNameSpan.classList.add('loaded');

            poblarFiltros();
            calcularIntereses();

        } catch (error) {
            console.error('Error al procesar CSV:', error);
            pagaresBody.innerHTML = '<tr><td colspan="10" class="loading">Error al procesar el archivo CSV</td></tr>';
            fileNameSpan.textContent = '✗ Error al cargar el archivo';
            fileNameSpan.classList.remove('loaded');
        }
    };

    reader.onerror = function() {
        console.error('Error al leer el archivo');
        pagaresBody.innerHTML = '<tr><td colspan="10" class="loading">Error al leer el archivo</td></tr>';
        fileNameSpan.textContent = '✗ Error al leer el archivo';
        fileNameSpan.classList.remove('loaded');
    };

    reader.readAsText(file);
}

// Poblar filtros
function poblarFiltros() {
    const compradores = [...new Set(pagaresData.map(p => p.comprador))].sort();
    const unidades = [...new Set(pagaresData.map(p => p.unidad))].sort();

    filtroCompradorSelect.innerHTML = '<option value="">Todos los compradores</option>';
    compradores.forEach(comprador => {
        const option = document.createElement('option');
        option.value = comprador;
        option.textContent = comprador;
        filtroCompradorSelect.appendChild(option);
    });

    filtroUnidadSelect.innerHTML = '<option value="">Todas las unidades</option>';
    unidades.forEach(unidad => {
        const option = document.createElement('option');
        option.value = unidad;
        option.textContent = unidad;
        filtroUnidadSelect.appendChild(option);
    });
}

// Calcular intereses
function calcularIntereses() {
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);

    const tasaAnual = parseFloat(tasaInteresInput.value) || 0;
    const tipoDescuento = tipoDescuentoSelect.value;
    const baseDias = baseDiasSelect.value;

    pagaresCalculados = pagaresData.map((pagare, index) => {
        const fechaVencimiento = parsearFecha(pagare.vencimiento);
        if (!fechaVencimiento) {
            return null;
        }

        const fechaVencimientoAjustada = ajustarASiguienteDiaHabil(fechaVencimiento);
        const dias = calcularDias(fechaActual, fechaVencimientoAjustada);
        const { descuento, valorEfectivo } = calcularDescuento(pagare.monto, dias, tasaAnual, tipoDescuento, baseDias);

        return {
            ...pagare,
            index: index + 1,
            fechaVencimiento,
            fechaVencimientoAjustada,
            fechaAjustada: fechaVencimiento.getTime() !== fechaVencimientoAjustada.getTime(),
            dias,
            descuento,
            valorEfectivo
        };
    }).filter(p => p !== null);

    mostrarResultados();
}

// Ordenar pagarés
function ordenarPagares(pagares, columna, direccion) {
    return [...pagares].sort((a, b) => {
        let valorA = a[columna];
        let valorB = b[columna];

        // Manejar valores nulos o undefined
        if (valorA === null || valorA === undefined) return 1;
        if (valorB === null || valorB === undefined) return -1;

        // Comparar según el tipo
        if (valorA instanceof Date && valorB instanceof Date) {
            return direccion === 'asc'
                ? valorA.getTime() - valorB.getTime()
                : valorB.getTime() - valorA.getTime();
        }

        if (typeof valorA === 'number' && typeof valorB === 'number') {
            return direccion === 'asc' ? valorA - valorB : valorB - valorA;
        }

        // String comparison
        const strA = String(valorA).toLowerCase();
        const strB = String(valorB).toLowerCase();

        if (direccion === 'asc') {
            return strA.localeCompare(strB);
        } else {
            return strB.localeCompare(strA);
        }
    });
}

// Manejar click en encabezado de columna
function handleColumnHeaderClick(e) {
    const th = e.target.closest('th.sortable');
    if (!th) return;

    const columna = th.dataset.column;

    // Alternar dirección si es la misma columna
    if (currentSortColumn === columna) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = columna;
        currentSortDirection = 'asc';
    }

    // Actualizar indicadores visuales
    document.querySelectorAll('th.sortable').forEach(header => {
        header.classList.remove('asc', 'desc');
    });
    th.classList.add(currentSortDirection);

    // Mostrar resultados ordenados
    mostrarResultados();
}

// Mostrar resultados
function mostrarResultados() {
    const fechaActual = new Date();
    fechaActualSpan.textContent = formatearFecha(fechaActual);

    // Aplicar filtros
    const filtroComprador = filtroCompradorSelect.value;
    const filtroUnidad = filtroUnidadSelect.value;

    let pagaresFiltrados = pagaresCalculados.filter(p => {
        if (filtroComprador && p.comprador !== filtroComprador) return false;
        if (filtroUnidad && p.unidad !== filtroUnidad) return false;
        return true;
    });

    // Aplicar ordenamiento si hay una columna seleccionada
    if (currentSortColumn) {
        pagaresFiltrados = ordenarPagares(pagaresFiltrados, currentSortColumn, currentSortDirection);
    }

    // Actualizar totales
    totalPagaresSpan.textContent = pagaresFiltrados.length;
    const totalMonto = pagaresFiltrados.reduce((sum, p) => sum + p.monto, 0);
    const totalDescuento = pagaresFiltrados.reduce((sum, p) => sum + p.descuento, 0);
    const totalValorEfectivo = pagaresFiltrados.reduce((sum, p) => sum + p.valorEfectivo, 0);

    totalMontoSpan.textContent = `$${totalMonto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalInteresesSpan.textContent = `$${totalDescuento.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalValorEfectivoSpan.textContent = `$${totalValorEfectivo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Mostrar tabla
    if (pagaresFiltrados.length === 0) {
        pagaresBody.innerHTML = '<tr><td colspan="10" class="loading">No hay pagarés que coincidan con los filtros</td></tr>';
        return;
    }

    pagaresBody.innerHTML = pagaresFiltrados.map(p => {
        const vencido = p.dias < 0;
        const rowClass = vencido ? 'vencido' : '';
        const diasClass = vencido ? 'dias-negativo' : '';
        const descuentoClass = p.descuento >= 0 ? 'monto-positivo' : 'monto-negativo';
        const valorEfectivoClass = 'monto-positivo';

        return `
            <tr class="${rowClass}">
                <td>${p.index}</td>
                <td>${p.proyecto}</td>
                <td>${p.comprador}</td>
                <td>${p.unidad}</td>
                <td>${formatearFecha(p.fechaVencimiento)}</td>
                <td class="${p.fechaAjustada ? 'fecha-ajustada' : ''}">
                    ${formatearFecha(p.fechaVencimientoAjustada)}
                    ${p.fechaAjustada ? '*' : ''}
                </td>
                <td class="${diasClass}">${p.dias}</td>
                <td>$${p.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="${descuentoClass}">$${p.descuento.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="${valorEfectivoClass}">$${p.valorEfectivo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `;
    }).join('');
}

// Event listeners
csvFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.name.endsWith('.csv')) {
            cargarCSV(file);
        } else {
            alert('Por favor, seleccione un archivo CSV válido');
            fileNameSpan.textContent = 'Ningún archivo seleccionado';
            fileNameSpan.classList.remove('loaded');
        }
    }
});

separadorCamposSelect.addEventListener('change', actualizarEjemploNumero);
separadorMilesSelect.addEventListener('change', actualizarEjemploNumero);
separadorDecimalesSelect.addEventListener('change', actualizarEjemploNumero);

calcularBtn.addEventListener('click', calcularIntereses);
filtroCompradorSelect.addEventListener('change', mostrarResultados);
filtroUnidadSelect.addEventListener('change', mostrarResultados);

// Event listener para ordenamiento de columnas
document.querySelector('thead').addEventListener('click', handleColumnHeaderClick);

// Inicializar ejemplo de número
actualizarEjemploNumero();
