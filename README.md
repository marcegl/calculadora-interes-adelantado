# Calculadora de Interés Adelantado

Aplicación web para calcular el descuento de pagarés y cheques con interés adelantado.

## 🌐 Demo en Vivo

**[Ver Aplicación](https://marcegl.github.io/calculadora-interes-adelantado/)**

## ✨ Características

### Cálculo de Descuento
- **Descuento Comercial/Bancario**: `Descuento = Monto × Tasa × (Días/Base)`
- **Descuento Racional/Matemático**: `Valor Efectivo = Monto / (1 + Tasa × (Días/Base))`

### Configuración Flexible
- Tasa de interés anual ajustable
- Selección de tipo de descuento (Comercial o Racional)
- Base de días configurable (360 o 365 días)
- Importación de CSV con separadores personalizables
- Configuración de formato de números (separadores de miles y decimales)

### Funcionalidades Avanzadas
- **Ajuste de días no hábiles**: Detecta automáticamente fines de semana y feriados de Paraguay
- **Ordenamiento**: Click en cualquier encabezado para ordenar ascendente/descendente
- **Filtros**: Por comprador y unidad
- **Totales automáticos**: Monto total, descuento total y valor efectivo total
- **Diseño responsive**: Funciona en desktop, tablet y móvil

### Feriados de Paraguay Incluidos
- Feriados fijos nacionales
- Semana Santa (Jueves y Viernes Santo - cálculo automático)

## 🚀 Uso

1. **Cargar archivo CSV**
   - Click en "Seleccionar archivo CSV"
   - Configurar separadores si es necesario
   - El archivo debe tener columnas: Proyecto, Comprador, Unidad, Vencimiento, Monto

2. **Configurar parámetros**
   - Ajustar tasa de interés anual
   - Seleccionar tipo de descuento
   - Elegir base de días (360 o 365)

3. **Calcular**
   - Click en "Calcular Intereses"
   - Ver resultados en la tabla
   - Usar filtros y ordenamiento según necesidad

## 📋 Formato del CSV

```csv
Proyecto;Comprador;Unidad;Vencimiento Pagares;Monto
Proyecto 1;Juan Pérez;604;20/10/26;1.200
Proyecto 1;María González;804;30/11/26;2.500
```

**Nota**: Los separadores son configurables desde la interfaz.

## 🛠️ Tecnologías

- HTML5
- CSS3 (Diseño moderno con gradientes)
- JavaScript Vanilla (Sin dependencias)
- GitHub Pages para hosting

## 📱 Compatibilidad

- ✅ Chrome, Firefox, Safari, Edge (últimas versiones)
- ✅ Dispositivos móviles (iOS/Android)
- ✅ Tablets

## 🔒 Privacidad

- **Todos los cálculos se realizan en el navegador**
- No se envían datos a ningún servidor
- Los archivos CSV se procesan localmente
- No se almacena ninguna información

## 📄 Licencia

Proyecto de código abierto disponible para uso general.

## 🤖 Desarrollado con

Este proyecto fue generado con [Claude Code](https://claude.com/claude-code)

---

**Repositorio**: [github.com/marcegl/calculadora-interes-adelantado](https://github.com/marcegl/calculadora-interes-adelantado)
