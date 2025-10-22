// Datos globales
let pagaresData = [];
let pagaresCalculados = [];
let currentSortColumn = null;
let currentSortDirection = 'asc';
let csvColumnas = [];
let csvDatosRaw = [];
let columnMapping = {
    monto: null,
    fecha: null
};
let filtrosActivos = {};
let archivoCSVActual = null;

// Elementos del DOM
const csvFileInput = document.getElementById('csvFile');
const fileNameSpan = document.getElementById('fileName');
const separadorCamposSelect = document.getElementById('separadorCampos');
const separadorMilesSelect = document.getElementById('separadorMiles');
const separadorDecimalesSelect = document.getElementById('separadorDecimales');
const ejemploNumeroSpan = document.getElementById('ejemploNumero');

const columnMappingSection = document.getElementById('columnMapping');
const columnaMontoSelect = document.getElementById('columnaMonto');
const columnaFechaSelect = document.getElementById('columnaFecha');
const confirmarMapeoBtn = document.getElementById('confirmarMapeoBtn');

const controlsSection = document.getElementById('controlsSection');
const tasaInteresInput = document.getElementById('tasaInteres');
const tipoDescuentoSelect = document.getElementById('tipoDescuento');
const baseDiasSelect = document.getElementById('baseDias');
const calcularBtn = document.getElementById('calcularBtn');
const formatoExportarSelect = document.getElementById('formatoExportar');
const exportarBtn = document.getElementById('exportarBtn');
const fechaActualSpan = document.getElementById('fechaActual');
const totalPagaresSpan = document.getElementById('totalPagares');
const totalMontoSpan = document.getElementById('totalMonto');
const totalInteresesSpan = document.getElementById('totalIntereses');
const totalValorEfectivoSpan = document.getElementById('totalValorEfectivo');

const filtersSection = document.getElementById('filtersSection');
const tableSection = document.getElementById('tableSection');
const pagaresHead = document.getElementById('pagaresHead');
const pagaresBody = document.getElementById('pagaresBody');

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
    // Guardar referencia al archivo
    archivoCSVActual = file;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const separadorCampos = separadorCamposSelect.value;

            // Parsear CSV
            const lineas = text.split('\n').filter(l => l.trim());
            if (lineas.length < 2) {
                throw new Error('El archivo CSV debe tener al menos encabezados y una fila de datos');
            }

            // Extraer encabezados
            csvColumnas = lineas[0].split(separadorCampos).map(col => col.trim());

            // Extraer datos (guardar raw para procesamiento posterior)
            csvDatosRaw = [];
            for (let i = 1; i < lineas.length; i++) {
                const linea = lineas[i].trim();
                if (!linea) continue;

                const campos = linea.split(separadorCampos);
                const fila = {};
                csvColumnas.forEach((col, idx) => {
                    fila[col] = campos[idx] ? campos[idx].trim() : '';
                });
                csvDatosRaw.push(fila);
            }

            console.log(`CSV cargado: ${csvColumnas.length} columnas, ${csvDatosRaw.length} filas`);

            // Actualizar UI
            fileNameSpan.textContent = `✓ ${file.name} (${csvDatosRaw.length} registros, ${csvColumnas.length} columnas)`;
            fileNameSpan.classList.add('loaded');

            // Mostrar sección de mapeo de columnas
            mostrarMapeoColumnas();

        } catch (error) {
            console.error('Error al procesar CSV:', error);
            fileNameSpan.textContent = `✗ Error: ${error.message}`;
            fileNameSpan.classList.remove('loaded');
        }
    };

    reader.onerror = function() {
        console.error('Error al leer el archivo');
        fileNameSpan.textContent = '✗ Error al leer el archivo';
        fileNameSpan.classList.remove('loaded');
    };

    reader.readAsText(file);
}

// Mostrar sección de mapeo de columnas
function mostrarMapeoColumnas() {
    // Poblar selectores con las columnas del CSV
    columnaMontoSelect.innerHTML = '<option value="">-- Seleccione --</option>';
    columnaFechaSelect.innerHTML = '<option value="">-- Seleccione --</option>';

    csvColumnas.forEach(col => {
        const optionMonto = document.createElement('option');
        optionMonto.value = col;
        optionMonto.textContent = col;
        columnaMontoSelect.appendChild(optionMonto);

        const optionFecha = document.createElement('option');
        optionFecha.value = col;
        optionFecha.textContent = col;
        columnaFechaSelect.appendChild(optionFecha);
    });

    // Mostrar la sección
    columnMappingSection.style.display = 'block';

    // Ocultar otras secciones
    controlsSection.style.display = 'none';
    filtersSection.style.display = 'none';
    tableSection.style.display = 'none';
}

// Validar mapeo de columnas
function validarMapeo() {
    const montoSeleccionado = columnaMontoSelect.value;
    const fechaSeleccionada = columnaFechaSelect.value;

    if (montoSeleccionado && fechaSeleccionada) {
        confirmarMapeoBtn.disabled = false;
    } else {
        confirmarMapeoBtn.disabled = true;
    }
}

// Confirmar mapeo y procesar datos
function confirmarMapeo() {
    columnMapping.monto = columnaMontoSelect.value;
    columnMapping.fecha = columnaFechaSelect.value;

    console.log('Mapeo confirmado:', columnMapping);

    // Procesar datos con el mapeo
    procesarDatosConMapeo();

    // Ocultar mapeo, mostrar controles
    columnMappingSection.style.display = 'none';
    controlsSection.style.display = 'block';
    filtersSection.style.display = 'block';
    tableSection.style.display = 'block';

    // Habilitar botón de calcular
    calcularBtn.disabled = false;
}

// Procesar datos con el mapeo seleccionado
function procesarDatosConMapeo() {
    pagaresData = csvDatosRaw.map((fila, index) => {
        const monto = parsearNumero(fila[columnMapping.monto]);

        // Validar que el monto sea un número válido
        if (isNaN(monto) || monto <= 0) {
            return null;
        }

        return {
            ...fila,
            _index: index + 1,
            _monto: monto,
            _fecha: fila[columnMapping.fecha]
        };
    }).filter(p => p !== null);

    console.log(`Procesados ${pagaresData.length} registros válidos`);

    // Generar filtros dinámicos
    generarFiltrosDinamicos();

    // Generar encabezados de tabla
    generarTablaEncabezados();

    // Calcular intereses
    calcularIntereses();
}

// Generar filtros dinámicos para las columnas no usadas en mapeo
function generarFiltrosDinamicos() {
    filtersSection.innerHTML = '';

    csvColumnas.forEach(col => {
        // Saltar las columnas ya mapeadas
        if (col === columnMapping.monto || col === columnMapping.fecha) {
            return;
        }

        // Obtener valores únicos para esta columna
        const valores = [...new Set(pagaresData.map(p => p[col]))].filter(v => v).sort();

        if (valores.length === 0 || valores.length > 100) {
            // Si no hay valores o hay demasiados, no crear filtro
            return;
        }

        // Crear filtro
        const filterGroup = document.createElement('div');
        filterGroup.className = 'filter-group';

        const label = document.createElement('label');
        label.textContent = `Filtrar por ${col}:`;
        label.setAttribute('for', `filtro_${col}`);

        const select = document.createElement('select');
        select.id = `filtro_${col}`;
        select.dataset.column = col;

        const optionTodos = document.createElement('option');
        optionTodos.value = '';
        optionTodos.textContent = `Todos`;
        select.appendChild(optionTodos);

        valores.forEach(val => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            filtrosActivos[col] = select.value;
            mostrarResultados();
        });

        filterGroup.appendChild(label);
        filterGroup.appendChild(select);
        filtersSection.appendChild(filterGroup);
    });
}

// Generar encabezados de tabla dinámicos
function generarTablaEncabezados() {
    const tr = document.createElement('tr');

    // Columna de número
    tr.innerHTML += `<th class="sortable" data-column="_index" data-type="number"># <span class="sort-indicator"></span></th>`;

    // Columnas del CSV (excepto la columna de monto)
    csvColumnas.forEach(col => {
        if (col !== columnMapping.monto) {
            tr.innerHTML += `<th class="sortable" data-column="${col}" data-type="string">${col} <span class="sort-indicator"></span></th>`;
        }
    });

    // Columnas calculadas (fechas y días)
    tr.innerHTML += `<th class="sortable" data-column="fechaVencimiento" data-type="date">Vencimiento Original <span class="sort-indicator"></span></th>`;
    tr.innerHTML += `<th class="sortable" data-column="fechaVencimientoAjustada" data-type="date">Vencimiento Ajustado <span class="sort-indicator"></span></th>`;
    tr.innerHTML += `<th class="sortable" data-column="dias" data-type="number">Días hasta Venc. <span class="sort-indicator"></span></th>`;

    // Últimas 3 columnas: Monto, Descuento, Valor Efectivo
    tr.innerHTML += `<th class="sortable" data-column="_monto" data-type="number">${columnMapping.monto} <span class="sort-indicator"></span></th>`;
    tr.innerHTML += `<th class="sortable" data-column="descuento" data-type="number">Descuento <span class="sort-indicator"></span></th>`;
    tr.innerHTML += `<th class="sortable" data-column="valorEfectivo" data-type="number">Valor Efectivo <span class="sort-indicator"></span></th>`;

    pagaresHead.innerHTML = '';
    pagaresHead.appendChild(tr);
}

// Calcular intereses
function calcularIntereses() {
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);

    const tasaAnual = parseFloat(tasaInteresInput.value) || 0;
    const tipoDescuento = tipoDescuentoSelect.value;
    const baseDias = baseDiasSelect.value;

    pagaresCalculados = pagaresData.map((pagare) => {
        // Usar las columnas mapeadas
        const fechaVencimiento = parsearFecha(pagare._fecha);
        if (!fechaVencimiento) {
            return null;
        }

        const fechaVencimientoAjustada = ajustarASiguienteDiaHabil(fechaVencimiento);
        const dias = calcularDias(fechaActual, fechaVencimientoAjustada);
        const { descuento, valorEfectivo } = calcularDescuento(pagare._monto, dias, tasaAnual, tipoDescuento, baseDias);

        return {
            ...pagare,
            fechaVencimiento,
            fechaVencimientoAjustada,
            fechaAjustada: fechaVencimiento.getTime() !== fechaVencimientoAjustada.getTime(),
            dias,
            descuento,
            valorEfectivo
        };
    }).filter(p => p !== null);

    // Habilitar botón de exportar
    exportarBtn.disabled = false;

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

    // Aplicar filtros dinámicos
    let pagaresFiltrados = pagaresCalculados.filter(p => {
        for (const [columna, valor] of Object.entries(filtrosActivos)) {
            if (valor && p[columna] !== valor) {
                return false;
            }
        }
        return true;
    });

    // Aplicar ordenamiento si hay una columna seleccionada
    if (currentSortColumn) {
        pagaresFiltrados = ordenarPagares(pagaresFiltrados, currentSortColumn, currentSortDirection);
    }

    // Actualizar totales
    totalPagaresSpan.textContent = pagaresFiltrados.length;
    const totalMonto = pagaresFiltrados.reduce((sum, p) => sum + p._monto, 0);
    const totalDescuento = pagaresFiltrados.reduce((sum, p) => sum + p.descuento, 0);
    const totalValorEfectivo = pagaresFiltrados.reduce((sum, p) => sum + p.valorEfectivo, 0);

    totalMontoSpan.textContent = `$${totalMonto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalInteresesSpan.textContent = `$${totalDescuento.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalValorEfectivoSpan.textContent = `$${totalValorEfectivo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Mostrar tabla
    // Total columnas: # + (CSV excepto monto) + Venc.Original + Venc.Ajustado + Días + Monto + Descuento + Valor Efectivo
    const totalColumnas = 1 + (csvColumnas.length - 1) + 3 + 3;
    if (pagaresFiltrados.length === 0) {
        pagaresBody.innerHTML = `<tr><td colspan="${totalColumnas}" class="loading">No hay pagarés que coincidan con los filtros</td></tr>`;
        return;
    }

    pagaresBody.innerHTML = pagaresFiltrados.map(p => {
        const vencido = p.dias < 0;
        const rowClass = vencido ? 'vencido' : '';
        const diasClass = vencido ? 'dias-negativo' : '';
        const descuentoClass = p.descuento >= 0 ? 'monto-positivo' : 'monto-negativo';
        const valorEfectivoClass = 'monto-positivo';

        // Construir celdas dinámicamente
        let celdas = `<td>${p._index}</td>`;

        // Agregar todas las columnas del CSV (excepto la columna de monto)
        csvColumnas.forEach(col => {
            if (col !== columnMapping.monto) {
                const valor = p[col] || '';
                celdas += `<td>${valor}</td>`;
            }
        });

        // Agregar columnas calculadas (fechas y días)
        celdas += `
            <td>${formatearFecha(p.fechaVencimiento)}</td>
            <td class="${p.fechaAjustada ? 'fecha-ajustada' : ''}">
                ${formatearFecha(p.fechaVencimientoAjustada)}
                ${p.fechaAjustada ? '*' : ''}
            </td>
            <td class="${diasClass}">${p.dias}</td>
        `;

        // Últimas 3 columnas: Monto, Descuento, Valor Efectivo
        celdas += `
            <td>$${p._monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="${descuentoClass}">$${p.descuento.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="${valorEfectivoClass}">$${p.valorEfectivo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;

        return `<tr class="${rowClass}">${celdas}</tr>`;
    }).join('');
}

// Exportar tabla a CSV
function exportarACSV() {
    const fechaActual = new Date();
    const timestamp = formatearFecha(fechaActual).replace(/\//g, '-');

    // Aplicar filtros dinámicos
    let pagaresFiltrados = pagaresCalculados.filter(p => {
        for (const [columna, valor] of Object.entries(filtrosActivos)) {
            if (valor && p[columna] !== valor) {
                return false;
            }
        }
        return true;
    });

    // Aplicar ordenamiento si hay una columna seleccionada
    if (currentSortColumn) {
        pagaresFiltrados = ordenarPagares(pagaresFiltrados, currentSortColumn, currentSortDirection);
    }

    // Crear encabezados
    const encabezados = ['#'];
    // Columnas del CSV excepto la de monto
    csvColumnas.forEach(col => {
        if (col !== columnMapping.monto) {
            encabezados.push(col);
        }
    });
    // Columnas calculadas y las 3 últimas
    encabezados.push('Vencimiento Original', 'Vencimiento Ajustado', 'Días hasta Venc.', columnMapping.monto, 'Descuento', 'Valor Efectivo');

    // Crear filas
    const filas = pagaresFiltrados.map(p => {
        const fila = [p._index];

        // Agregar columnas del CSV (excepto la de monto)
        csvColumnas.forEach(col => {
            if (col !== columnMapping.monto) {
                const valor = p[col] || '';
                // Si el valor contiene comas o saltos de línea, envolverlo en comillas
                const valorStr = String(valor);
                if (valorStr.includes(',') || valorStr.includes('\n') || valorStr.includes('"')) {
                    fila.push(`"${valorStr.replace(/"/g, '""')}"`);
                } else {
                    fila.push(valorStr);
                }
            }
        });

        // Agregar columnas calculadas (con 2 decimales)
        fila.push(
            formatearFecha(p.fechaVencimiento),
            formatearFecha(p.fechaVencimientoAjustada) + (p.fechaAjustada ? '*' : ''),
            p.dias,
            p._monto.toFixed(2),
            p.descuento.toFixed(2),
            p.valorEfectivo.toFixed(2)
        );

        return fila;
    });

    // Combinar todo
    const csvContent = [encabezados, ...filas]
        .map(fila => fila.join(','))
        .join('\n');

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `pagares_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Exportar tabla a XLSX
function exportarAXLSX() {
    const fechaActual = new Date();
    const timestamp = formatearFecha(fechaActual).replace(/\//g, '-');

    // Aplicar filtros dinámicos
    let pagaresFiltrados = pagaresCalculados.filter(p => {
        for (const [columna, valor] of Object.entries(filtrosActivos)) {
            if (valor && p[columna] !== valor) {
                return false;
            }
        }
        return true;
    });

    // Aplicar ordenamiento si hay una columna seleccionada
    if (currentSortColumn) {
        pagaresFiltrados = ordenarPagares(pagaresFiltrados, currentSortColumn, currentSortDirection);
    }

    // Crear encabezados
    const encabezados = ['#'];
    // Columnas del CSV excepto la de monto
    csvColumnas.forEach(col => {
        if (col !== columnMapping.monto) {
            encabezados.push(col);
        }
    });
    // Columnas calculadas y las 3 últimas
    encabezados.push('Vencimiento Original', 'Vencimiento Ajustado', 'Días hasta Venc.', columnMapping.monto, 'Descuento', 'Valor Efectivo');

    // Crear datos
    const datos = pagaresFiltrados.map(p => {
        const fila = [p._index];

        // Agregar columnas del CSV (excepto la de monto)
        csvColumnas.forEach(col => {
            if (col !== columnMapping.monto) {
                fila.push(p[col] || '');
            }
        });

        // Agregar columnas calculadas (redondear a 2 decimales)
        fila.push(
            formatearFecha(p.fechaVencimiento),
            formatearFecha(p.fechaVencimientoAjustada) + (p.fechaAjustada ? '*' : ''),
            p.dias,
            parseFloat(p._monto.toFixed(2)),
            parseFloat(p.descuento.toFixed(2)),
            parseFloat(p.valorEfectivo.toFixed(2))
        );

        return fila;
    });

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([encabezados, ...datos]);

    // Ajustar anchos de columna
    const colWidths = encabezados.map((_, i) => {
        const maxLength = Math.max(
            encabezados[i].length,
            ...datos.map(row => String(row[i] || '').length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
    });
    ws['!cols'] = colWidths;

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Pagarés');

    // Descargar archivo
    XLSX.writeFile(wb, `pagares_${timestamp}.xlsx`);
}

// Exportar tabla según formato seleccionado
function exportarTabla() {
    const formato = formatoExportarSelect.value;

    if (pagaresCalculados.length === 0) {
        alert('No hay datos para exportar. Por favor, cargue un archivo CSV y calcule los intereses primero.');
        return;
    }

    if (formato === 'csv') {
        exportarACSV();
    } else if (formato === 'xlsx') {
        exportarAXLSX();
    }
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

separadorCamposSelect.addEventListener('change', function() {
    actualizarEjemploNumero();
    // Reprocesar CSV si hay un archivo cargado
    if (archivoCSVActual) {
        cargarCSV(archivoCSVActual);
    }
});

separadorMilesSelect.addEventListener('change', function() {
    actualizarEjemploNumero();
    // Reprocesar CSV si hay un archivo cargado y ya fue mapeado
    if (archivoCSVActual && columnMapping.monto && columnMapping.fecha) {
        cargarCSV(archivoCSVActual);
    }
});

separadorDecimalesSelect.addEventListener('change', function() {
    actualizarEjemploNumero();
    // Reprocesar CSV si hay un archivo cargado y ya fue mapeado
    if (archivoCSVActual && columnMapping.monto && columnMapping.fecha) {
        cargarCSV(archivoCSVActual);
    }
});

// Event listeners para mapeo de columnas
columnaMontoSelect.addEventListener('change', validarMapeo);
columnaFechaSelect.addEventListener('change', validarMapeo);
confirmarMapeoBtn.addEventListener('click', confirmarMapeo);

calcularBtn.addEventListener('click', calcularIntereses);
exportarBtn.addEventListener('click', exportarTabla);

// Event listener para ordenamiento de columnas
pagaresHead.addEventListener('click', handleColumnHeaderClick);

// Inicializar ejemplo de número
actualizarEjemploNumero();
