# Ruta Express

Sistema de Gestión de Viajes Terrestres para un proyecto universitario. Este primer avance permite buscar viajes, reservar un asiento y gestionar las reservas desde un panel administrativo.

El frontend usa **HTML, CSS y JavaScript puro**. El backend usa **PHP con PDO** y los datos se guardan en **MySQL o MariaDB**. No utiliza frameworks, Composer, npm ni librerías de componentes.

## Qué cambió

La rúbrica requiere una base de datos real, por eso MySQL reemplazó a localStorage. El diseño se mantiene y JavaScript sigue manejando la interacción. PHP recibe las solicitudes, valida y consulta o modifica la base de datos.

```text
Cliente / Administrador → JavaScript (fetch) → PHP → MySQL
```

Los arreglos en `shared/storage.js` son una copia temporal para dibujar la pantalla; no son persistencia. Al recargar se consulta nuevamente MySQL. Las reservas de la versión anterior con localStorage no se importan automáticamente ni se borran del navegador.

## Requisitos

- PHP con las extensiones `pdo_mysql` y `mbstring` (incluidas en XAMPP).
- MySQL o MariaDB iniciado.
- Navegador actual.

La implementación se comprobó con PHP 7.1 y MariaDB 10.4. No requiere Node.js para funcionar. No abras el proyecto con Live Server ni con doble clic: esos métodos no ejecutan PHP.

## Iniciar en Windows

1. Inicia **MySQL** desde el panel de XAMPP. Si ya tienes otro MySQL funcionando, puedes usarlo con sus propios datos de conexión.
2. Si la conexión no es la habitual de XAMPP (`127.0.0.1`, puerto `3306`, usuario `root`, contraseña vacía), copia `api/config.local.example.php` como **`api/config.local.php`** y completa los valores de tu servidor. No publiques ese archivo; está excluido de Git.
3. Abre una terminal de PowerShell en la carpeta del proyecto y ejecuta:

```powershell
.\iniciar.ps1
```

Si PowerShell bloquea los scripts, puedes iniciarlo en un proceso con permiso temporal:

```powershell
powershell -ExecutionPolicy Bypass -File .\iniciar.ps1
```

El script prepara las tablas, carga los viajes que faltan e inicia el servidor PHP. No elimina reservas. Cuando el proyecto está en OneDrive, copia los archivos de ejecución a `%LOCALAPPDATA%\RutaExpress\web`, porque algunas versiones antiguas de PHP no pueden leer correctamente las carpetas sincronizadas. Edita siempre la carpeta original y vuelve a ejecutar el script para actualizar la copia.

Si existe una instalación de PHP en `%LOCALAPPDATA%\RutaExpress\php`, el script la utiliza antes que el PHP de XAMPP. Esto permite usar un PHP compatible con MySQL 8 sin modificar XAMPP ni el PATH del equipo. Los paquetes de Windows están disponibles en la [descarga oficial de PHP](https://www.php.net/downloads.php?os=windows); esa instalación necesita las extensiones `pdo_mysql` y `mbstring` activadas en su `php.ini`.

Abre:

- Cliente: **http://127.0.0.1:8000/cliente/index.html**
- Administrador: **http://127.0.0.1:8000/admin/index.html**

También puedes entrar por `/cliente` o `/admin`: `router.php` agrega la barra final para que sus estilos y módulos carguen desde la carpeta correcta. Los archivos inexistentes responden con 404, sin devolver la página principal como si fuera CSS o JavaScript.

Mantén ambas pestañas abiertas. La información se consulta cada 5 segundos y al volver a una pestaña. Para detener PHP presiona **Ctrl+C** en la terminal. MySQL se detiene desde su propio panel o servicio.

El iniciador comprueba que el puerto 8000 esté libre y detiene su proceso PHP al cerrar la ejecución con Ctrl+C. Esto evita que quede una instancia anterior atendiendo las peticiones después de cambiar el proyecto.

### Alternativa con Apache de XAMPP

Puedes copiar la carpeta del proyecto a `C:\xampp\htdocs\ruta-express`, configurar la conexión y ejecutar desde esa carpeta:

```powershell
C:\xampp\php\php.exe database\instalar.php
```

Después inicia Apache y abre `http://localhost/ruta-express/cliente/index.html` y `http://localhost/ruta-express/admin/index.html`. Si Apache usa otro puerto, inclúyelo en la dirección.

### Si falla la conexión

- **Puerto ocupado:** evita iniciar dos servidores MySQL en el mismo puerto. Usa el existente con sus credenciales o configura un puerto libre en MySQL y en `api/config.local.php`.
- **Access denied:** revisa usuario y contraseña en `config.local.php`.
- **Error de autenticación con MySQL 8 y PHP antiguo:** usa un PHP con soporte para ese servidor o MariaDB de XAMPP en otro puerto. No cambies las contraseñas ni la autenticación de otros proyectos para probar este.
- **Tabla inexistente:** ejecuta `php database/instalar.php` con la misma configuración del servidor web.
- **Archivo inexistente dentro de OneDrive:** utiliza `iniciar.ps1` o una carpeta fuera de OneDrive.
- **Puerto 8000 ocupado:** detén tu ejecución anterior o inicia manualmente `php -S 127.0.0.1:8002 router.php` desde una carpeta fuera de OneDrive y usa ese puerto.

## Organización

```text
api/
  config.php                 Valores de conexión por defecto
  config.local.example.php   Modelo para configurar tu servidor
  conexion.php               PDO, respuestas JSON y lectura de solicitudes
  funciones.php              Consultas de lectura y validación del pasajero
  viajes.php                 Lista de viajes y ocupación
  reservas.php               Lista administrativa de reservas
  consultar-reserva.php       Consulta con código y documento
  guardar-reserva.php         Creación de reserva
  estado-reserva.php          Confirmar o anular
database/
  esquema-original.sql       SQL proporcionado al inicio
  esquema.sql                Versión adaptada para la aplicación
  instalar.php               Crea campos faltantes y carga datos de prueba
  datos-demo.php             Cinco rutas y salidas durante 21 días
cliente/                     HTML, CSS y JavaScript de la web pública
admin/                       HTML, CSS y JavaScript del panel
shared/
  storage.js                 Comunicación con PHP y copia de datos en memoria
  data.js                    Opciones de ciudades
  utils.js                   Formatos, DOM y validaciones de frontend
  css/                       Reset, tokens, layout, utilidades y componentes
assets/img/                  Recursos locales y créditos de imágenes
tests/                       Verificaciones de frontend y API
iniciar.ps1                  Inicio local para Windows
router.php                   Corrige las rutas de carpetas del servidor local
```

## Base de datos

Se conservan las siete tablas del SQL recibido: **Usuarios, Clientes, Vehiculos, Rutas, Viajes, Reservas y Pagos**.

Campos agregados para mantener el flujo existente:

| Tabla | Campos | Motivo |
| --- | --- | --- |
| Clientes | `apellidos`, `tipoDocumento`, `correo` | Completar los datos del pasajero. `nombre` almacena sus nombres y `dni` su documento DNI o CE. |
| Viajes | `codigo`, `fechaLlegada`, `servicio`, `precio`, `asientosIniciales` | Mostrar horarios, tarifa, servicio y ocupación inicial de demostración. |
| Reservas | `codigo`, `asiento`, `precio` | Consultar una reserva, conocer el asiento exacto y conservar el precio reservado. |

`cantidadAsientos` se conserva y se registra como **1** en este avance. Los identificadores son los enteros autoincrementales de MySQL; JavaScript los recibe como cadenas para mantener un formato uniforme en la interfaz.

El instalador también puede ejecutarse después de importar el esquema original: agrega solo los campos faltantes. Si la base original ya tiene reservas sin número de asiento o código, informa de ello; esos datos deben completarse manualmente, ya que no se puede deducir qué asiento se había reservado. No inventa asientos para datos históricos.

Hay un usuario `demo_local` con contraseña aleatoria guardada como hash para cumplir la relación de `Viajes.usuarioID`. No es un inicio de sesión. Los vehículos y rutas de ejemplo solo se consultan; no se implementan sus CRUD.

Los datos de ejemplo se generan para hoy y los próximos 20 días, con salidas a las 09:00 y 21:00. Al volver a ejecutar el instalador agrega fechas faltantes sin duplicar los códigos de viaje. Las fechas del backend corresponden a **America/Lima**. `Pagos` queda creada para una etapa posterior y no recibe registros de la aplicación.

## Reglas de las reservas

- Una reserva nueva queda **Pendiente**.
- Una pendiente puede pasar a **Confirmada** o **Anulada**.
- Una confirmada puede anularse.
- Una anulada no puede reactivarse y libera el asiento.
- Pendientes y confirmadas ocupan asiento, además de la ocupación inicial ficticia del viaje.
- El precio se obtiene del viaje en PHP. Cambiarlo en la petición del navegador no altera el precio guardado.
- Se comprueba que el viaje esté programado, no haya salido y su vehículo esté operativo.
- Los clientes se reutilizan por documento. Una nueva reserva del mismo documento actualiza su ficha en `Clientes`; los datos personales mostrados en sus reservas provienen de esa ficha. El precio y el asiento pertenecen a cada reserva.
- PHP valida nuevamente DNI, CE, nombres, celular y correo, aunque JavaScript ya haya validado el formulario.

Para evitar dos reservas activas del mismo asiento, la creación usa una **transacción InnoDB** y bloquea el viaje con `SELECT ... FOR UPDATE` antes de comprobar y guardar. La anulación utiliza el mismo orden de bloqueo. Esto protege las operaciones realizadas mediante estos endpoints; editar directamente las tablas puede saltarse las reglas del sistema. Referencias: [transacciones con PDO](https://www.php.net/manual/en/pdo.transactions.php) y [lecturas con bloqueo de InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html).

## Probar la demostración

1. Inicia MySQL y ejecuta `iniciar.ps1`.
2. Busca **Piura → Chiclayo para mañana** en cliente y selecciona una salida.
3. Elige un asiento disponible. Los ocupados están bloqueados.
4. Usa datos ficticios: DNI `12345678`, Juan Pérez, celular `987654321`, correo `juan@example.com`.
5. Revisa y confirma la reserva. Guarda el código mostrado en el boleto.
6. Recarga y entra a **Mis reservas**. Consulta con código y DNI. Prueba también un DNI incorrecto.
7. En administrador, busca el código y confirma la reserva mediante el diálogo.
8. Comprueba que el cliente muestre Confirmada después de la actualización.
9. Anula la reserva. Comprueba el estado Anulada y vuelve a buscar el viaje: el asiento debe estar libre.
10. En phpMyAdmin o tu cliente SQL consulta `Reservas` y `Clientes` para verificar que los datos existen realmente en la base. `Pagos` debe seguir sin registros de estas operaciones.

Prueba también origen y destino iguales, datos incompletos, rutas sin salidas, recarga, filtros administrativos e impresión del boleto. Los colores, dimensiones y radios se centralizan en `shared/css/tokens.css`; el espaciado continúa usando `gap` y `padding`.

## Pruebas opcionales

Con Node.js, solo como herramienta de pruebas:

```powershell
node --experimental-vm-modules tests/verify.mjs
node tests/api.mjs http://127.0.0.1:8000
```

El primer comando comprueba validaciones y CSS sin conectarse a la base. El segundo requiere PHP y MySQL activos: crea reservas ficticias y las deja anuladas, por lo que conviene ejecutarlo sobre una base exclusiva de pruebas. Puede recibir una segunda dirección de servidor PHP conectado a esa misma base para probar concurrencia entre procesos.

Las variables `RUTA_DB_HOST`, `RUTA_DB_PORT`, `RUTA_DB_NAME`, `RUTA_DB_USER` y `RUTA_DB_PASSWORD` permiten que las pruebas utilicen una configuración distinta sin editar archivos. No hay instalación de paquetes ni uso de Node como backend.

## Alcance y limitaciones

Es un avance universitario **local**, sin autenticación ni roles operativos. Por eso la API restringe las solicitudes a la dirección local del equipo. El listado administrativo no debe publicarse en internet. La consulta pública solo devuelve una reserva cuando coinciden código y documento; el endpoint de viajes no expone pasajeros. No existe CORS abierto.

No hay pagos reales, envío de correos, facturación, RENIEC, geolocalización ni administración de empleados, buses o rutas. Tampoco hay expiración automática de reservas pendientes. Las consultas SQL usan parámetros y el frontend inserta datos de usuario como texto, sin `innerHTML`.

La base persiste al cerrar el navegador y no depende de un perfil. La actualización de las pantallas es periódica, no instantánea. Si MySQL o PHP se detienen, la aplicación muestra un error y no cambia a localStorage como respaldo silencioso.

Para etapas posteriores quedan autenticación, permisos, CRUD administrativos, programación de viajes, historial de cambios y datos de pasajeros, pagos, reportes, despliegue y medidas de seguridad para acceso remoto.

Las imágenes se sirven localmente. Sus fuentes y licencias están en `assets/img/creditos.html`; el banner generado y su prompt están documentados en `assets/img/GENERACION.md`.
