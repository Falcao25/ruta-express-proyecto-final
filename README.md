# Ruta Express · Sistema de Gestión de Viajes Terrestres

Prototipo funcional para una empresa ficticia de transporte interprovincial del Perú. Primer avance universitario, equivalente aproximadamente al **30 % del sistema**. Incluye dos interfaces que comparten reservas en el mismo navegador: web del cliente y panel administrativo.

## Objetivo y alcance

Facilitar la búsqueda de viajes, la reserva de un asiento y la consulta y administración de esas reservas, con una interfaz accesible, adaptable y una arquitectura sencilla de mantener. Toda reserva y confirmación es simulada: **no existe pago real ni comprobante de pago**.

El avance se limita al flujo de reservas. Los viajes se precargan y se consultan; no se programan ni editan desde administración. El panel no requiere contraseña porque no implementa autenticación.

## Tecnologías

HTML5 semántico, CSS3 puro, Flexbox, Grid para tarjetas y asientos, JavaScript Vanilla ES6+ con módulos y `localStorage`. Sin frameworks, paquetes de ejecución, backend, fuentes remotas ni APIs externas. Todos los recursos visuales se sirven localmente: SVG, fotografías optimizadas de destinos y un banner conceptual generado para Ruta Express.

La portada adapta patrones de sitios comerciales de transporte con identidad propia: banner panorámico, buscador destacado, tarjetas fotográficas, presentación de la experiencia de viaje, beneficios, guía y pie de página. Los acentos naranjas se centralizan en tokens compartidos; el azul conserva la identidad de ambas interfaces. La sección de consulta sustituye canales de compra o pagos que no forman parte del avance. Las fotografías tienen sus autores, fuentes y licencias en `assets/img/creditos.html`, enlazado desde el footer. El prompt del banner está en `assets/img/GENERACION.md`.

## Ejecutar

1. Abre esta carpeta en Visual Studio Code.
2. Inicia **Live Server desde la raíz del proyecto**, por ejemplo haciendo clic derecho en `cliente/index.html` → **Open with Live Server**.
3. Abre ambas interfaces con el mismo servidor, host y puerto:
   - Cliente: `http://127.0.0.1:5500/cliente/index.html`
   - Administrador: `http://127.0.0.1:5500/admin/index.html`
4. Mantén las dos pestañas abiertas para ver la actualización entre interfaces.

La página raíz redirige al cliente. Si Live Server asigna otro puerto, usa ese mismo puerto en las dos direcciones. No abras los archivos mediante `file://`: los módulos necesitan HTTP. `localhost` y `127.0.0.1` son orígenes distintos; sus datos no se comparten. No es necesario ejecutar npm, instalar dependencias ni compilar.

Alternativa si tienes Python: ejecuta `python -m http.server 5500` desde la raíz. Es solamente un servidor de archivos estáticos.

## Estructura

```text
.
├── index.html                 # Entrada a la web pública
├── cliente/
│   ├── index.html
│   ├── css/styles.css         # Layout y componentes públicos específicos
│   └── js/cliente.js          # Búsqueda, reserva, consulta y boleto
├── admin/
│   ├── index.html
│   ├── css/admin.css          # Layout administrativo
│   └── js/admin.js            # Dashboard, tablas y gestión de estados
├── shared/
│   ├── css/
│   │   ├── reset.css
│   │   ├── tokens.css         # Design System
│   │   ├── layout.css
│   │   ├── utilities.css
│   │   └── components.css
│   ├── data.js                # Generación de viajes ficticios
│   ├── storage.js             # Persistencia y reglas de negocio
│   └── utils.js               # Formato, DOM seguro y validaciones
├── assets/img/                # Ilustración y favicon SVG locales
├── tests/verify.mjs            # Verificaciones opcionales sin dependencias
└── README.md
```

Presentación en HTML/CSS, interacción de cada interfaz en su módulo, operaciones del dominio y persistencia en `storage.js`. Todas las vistas usan la misma lógica de ocupación y las mismas validaciones. El helper `el()` crea nodos con `textContent` y nodos de texto; no se interpola contenido del usuario en `innerHTML`.

## Web del cliente

- Inicio comercial con navegación, ilustración, buscador, destinos y beneficios.
- Búsqueda por origen, destino y fecha; una persona por reserva.
- Ciudades distintas, campos requeridos y fecha igual o posterior a hoy. Se excluyen salidas que ya ocurrieron.
- Tarjetas con empresa, ruta, servicio, precio en soles, horario, duración y disponibilidad. Las llegadas del día siguiente se identifican con `+1`.
- Mapa de 40 asientos, distribución 2 + 2 y pasillo. Asientos ocupados deshabilitados, selección única modificable y resumen en tiempo real.
- Validación de DNI de 8 dígitos, CE alfanumérico de 9 a 12 caracteres, nombres y apellidos de 2 a 70 caracteres, celular peruano de 9 dígitos que empieza en 9 y correo válido.
- Revisión de los datos, comprobación final del asiento, reserva pendiente y boleto imprimible mediante `window.print()`.
- Consulta usando conjuntamente código y documento; el código por sí solo no revela la reserva. Al editar los datos de consulta se oculta el resultado anterior.

## Panel administrativo

- Dashboard con total de reservas, pendientes, confirmadas, canceladas y viajes futuros con disponibilidad. Últimas cinco reservas ordenadas por creación.
- Viajes con búsqueda por ruta/código, fecha y próximos/todos; tabla con capacidad, ocupación y disponibles. Detalle con mapa de asientos en modo consulta.
- Reservas con búsqueda por código, pasajero, documento o ruta, y filtro de estado.
- Detalle de pasajero y viaje, confirmación y cancelación mediante diálogos. Cada transición se vuelve a validar al guardar, incluso si otro administrador la modificó.
- Indicadores, tablas, detalles abiertos y cliente se actualizan después de cambios locales o cambios detectados en otras pestañas.

## Datos de demostración

Rutas: Piura → Chiclayo, Piura → Trujillo, Trujillo → Lima, Lima → Arequipa y Chiclayo → Lima. Se generan salidas a las 09:00 y 21:00 para hoy y los próximos 20 días. Hay servicios Semi cama y Cama ejecutivo, precios de ejemplo y ocupación inicial. El buscador propone mañana para que sus dos salidas sigan disponibles.

Los viajes tienen identificadores estables basados en fecha, ruta y salida. Al iniciar se agregan solamente los viajes faltantes del horizonte de 21 días. Se conservan viajes anteriores y reservas existentes. Recargar no duplica viajes ni borra reservas. Las fechas utilizan el reloj y la zona horaria local del navegador; para la demostración peruana usa la fecha y hora correctas de Perú.

### Modelo

```javascript
// Viaje
{
  id: 'V-20261029-31', empresa: 'Ruta Express',
  origen: 'Trujillo', destino: 'Lima', fecha: '2026-10-29',
  horaSalida: '09:00', horaLlegada: '19:00', fechaLlegada: '2026-10-29',
  duracion: '10h', servicio: 'Semi cama', precio: 65, capacidad: 40,
  asientosOcupadosIniciales: [3, 7, 12, 19]
}

// Reserva (el pasajero es una instantánea dentro de la reserva)
{
  id: 'UUID', codigo: 'RES-XXXXXXXXXX', viajeId: 'V-20261029-31',
  pasajero: {
    id: 'P-UUID', tipoDocumento: 'DNI', numeroDocumento: '12345678',
    nombres: 'Juan', apellidos: 'Pérez', telefono: '987654321',
    correo: 'juan@example.com'
  },
  asiento: 1, precio: 65,
  fechaReserva: '2026-10-28T19:00:00.000Z', estado: 'pendiente'
}
```

La clave `ruta-express:v1` almacena un único objeto `{ version: 1, viajes: [], reservas: [] }`. Las fechas de salida son fechas locales `YYYY-MM-DD`; la fecha de creación se guarda como instante ISO UTC y se presenta en hora local. Los UUID y códigos se generan con Web Crypto en un contexto seguro (localhost es válido) y se comprueba la unicidad del código.

## Reglas de negocio

| Estado actual | Acciones permitidas | ¿Ocupa asiento? |
| --- | --- | --- |
| Pendiente | Confirmar, cancelar | Sí |
| Confirmada | Cancelar | Sí |
| Cancelada | Ninguna | No |

- Una reserva nueva siempre es pendiente y contiene un solo pasajero y asiento.
- Asientos ocupados = unión sin duplicados de asientos iniciales y reservas pendientes/confirmadas del viaje.
- Disponibilidad = capacidad menos tamaño de esa unión. No se almacenan contadores independientes.
- Un asiento inicial no puede reservarse ni liberarse mediante la gestión de reservas.
- Una reserva cancelada no puede reactivarse; se puede crear una reserva nueva para un asiento liberado.
- El precio se toma del viaje al guardar, no del formulario.
- Antes de reservar se vuelve a leer el almacenamiento y se comprueba asiento, pasajero y salida futura. Las transiciones administrativas también se validan en la capa de almacenamiento.

## Probar el flujo completo

1. Abre cliente y administrador con el mismo origen. El dashboard comienza sin reservas; la ocupación inicial no son reservas de pasajeros.
2. En cliente busca **Piura → Chiclayo para mañana**. Selecciona una salida y el asiento 1 (u otro disponible). Los asientos grises no se pueden elegir.
3. Prueba cambiar de asiento; solo uno debe quedar seleccionado y el resumen debe actualizarse.
4. Prueba un DNI incompleto, un celular inválido y un correo inválido. Corrige los errores cercanos a cada campo.
5. Datos ficticios de prueba: DNI `12345678`, Juan Pérez, celular `987654321`, correo `juan@example.com`.
6. Pulsa **Revisar mi reserva**, verifica los datos y **Confirmar reserva**. Guarda el código mostrado. El boleto debe indicar **Pendiente**, sin pago.
7. Pulsa **Imprimir boleto** y revisa la vista de impresión. Solo se imprime el boleto.
8. Recarga. En **Mis reservas**, consulta con código y DNI. Prueba un documento incorrecto: no debe mostrarse información del pasajero.
9. En administrador, verifica que aparezca la reserva y se actualicen los indicadores. Busca por nombre/código/documento y filtra Pendiente.
10. Confirma la reserva en el diálogo. Comprueba su nuevo estado en cliente sin recargar.
11. Cancélala en administrador. Comprueba que su estado cambie y el asiento vuelva a estar disponible en una búsqueda/selección nueva.
12. La reserva cancelada no debe ofrecer Confirmar. Puedes reservar el asiento liberado creando otra reserva.
13. Prueba origen y destino iguales, campos vacíos, una fecha anterior y una ruta sin servicio (por ejemplo Arequipa → Piura).
14. Abre el mismo viaje en dos pestañas de cliente: reserva un asiento desde una y verifica que deje de estar disponible en la otra. Si una operación llega con datos desactualizados, la comprobación final la debe rechazar.
15. Revisa ambos layouts a 1440, 768 y 390 px: navegación, campos, resumen y tablas. Las tablas amplias tienen desplazamiento interno; la página no debe desbordar horizontalmente.

### Verificación automática opcional

Si tienes Node.js 20 o superior, puedes ejecutar `node --experimental-vm-modules tests/verify.mjs`. Usa únicamente módulos integrados de Node y un almacenamiento aislado en memoria; no modifica las reservas del navegador. Node se utiliza solo como herramienta opcional de pruebas, **no como backend**. Comprueba las reglas de reserva, validaciones, duplicados, persistencia, estadísticas, transiciones y auditoría de CSS. No sustituye la revisión visual en un navegador.

## Design System y accesibilidad

Los colores, fuentes, radios, bordes, sombras, dimensiones y espaciados se centralizan en `tokens.css`. Los estilos de los componentes compartidos se definen una sola vez. La estructura usa Flexbox, `gap` para hermanos y `padding` para interiores; Grid se reserva para tarjetas, indicadores y asientos.

No se utilizan márgenes como espaciado de componentes: únicamente resets, `margin-inline: auto` para contenedores y margen de página impresa. Los diálogos conservan su centrado nativo. Las animaciones de hover no corrigen el layout. Hay labels visibles, descripciones de error asociadas, estados anunciados, foco visible, enlace de salto, navegación semántica, controles por teclado, diálogos nativos y respeto por `prefers-reduced-motion`.

## Limitaciones

- Demostración local: `localStorage` no sincroniza dispositivos, perfiles, navegadores ni orígenes distintos.
- No es una base de datos ni una arquitectura para producción. Los datos se pueden editar desde las herramientas del navegador, y el panel es público. La consulta por dos datos es una medida de interfaz, no una protección de seguridad real.
- Web Locks, cuando está disponible, serializa la inicialización y las escrituras de estas pestañas del mismo origen. Se conserva el bloqueo durante una breve ventana de propagación de 50 ms después de cada operación para reducir lecturas de caché desactualizadas entre pestañas. La relectura final y los códigos únicos también reducen duplicados. **Esta mitigación no garantiza reservas concurrentes seguras en producción** ni protege frente a otras aplicaciones o modificaciones manuales. Sin Web Locks, la relectura tampoco es atómica.
- El evento `storage` actualiza las otras pestañas; un evento local actualiza la pestaña que realizó la operación. No hay sincronización remota.
- La persistencia depende de permisos, cuota y conservación de los datos del navegador. La aplicación informa de errores de lectura/escritura y no sustituye automáticamente datos dañados.
- No hay retención automática ni expiración de pendientes. Los viajes históricos se conservan para no romper referencias de reservas. Un uso prolongado puede alcanzar la cuota del navegador.
- No uses datos personales reales: el almacenamiento local no está cifrado por la aplicación.
- No se verifican documentos con RENIEC, no se envían correos y no se realizan pagos.
- Para reiniciar **voluntariamente** una demostración, elimina solo `ruta-express:v1` desde DevTools → Application → Local Storage del origen. Esto elimina las reservas locales; no existe reinicio automático.

## Pendiente para el 70 % restante

Backend y base de datos transaccional, autenticación y roles, gestión de empleados y conductores, CRUD de buses/rutas, programación de viajes, mantenimiento, contabilidad, facturación electrónica, pagos e integraciones bancarias, notificaciones, integración documental, geolocalización y reportes avanzados. Requieren nuevas etapas y decisiones de arquitectura; no están simulados como funcionalidades operativas en este avance.
