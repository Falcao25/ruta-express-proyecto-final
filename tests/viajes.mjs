// Ejecutar solo contra una base de pruebas: crea viajes y reservas ficticias.
// node tests/viajes.mjs http://127.0.0.1:8004
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const base = process.argv[2];
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error('Indica el servidor PHP local de pruebas.');
const cookies = new Map();
let csrf = '';
async function pedir(archivo, datos) {
  const headers = { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') };
  if (datos !== undefined) { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = csrf; }
  const respuesta = await fetch(`${base}/api/${archivo}`, { method: datos === undefined ? 'GET' : 'POST', headers, body: datos === undefined ? undefined : JSON.stringify(datos) });
  for (const cookie of respuesta.headers.getSetCookie()) {
    const pair = cookie.split(';')[0], index = pair.indexOf('=');
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return { status: respuesta.status, ...await respuesta.json() };
}
assert.equal((await pedir('opciones-viajes.php')).status, 401);
assert.equal((await pedir('guardar-viaje.php', {})).status, 401);
csrf = (await pedir('sesion.php')).csrf;
const acceso = await readFile(join(process.env.LOCALAPPDATA, 'RutaExpress/acceso-inicial.txt'), 'utf8');
const login = await pedir('login.php', { username: acceso.match(/^Usuario: (.+)$/m)[1].trim(), password: acceso.match(/^Contraseña: (.+)$/m)[1].trim() });
assert.equal(login.status, 200);
csrf = login.csrf;
const opciones = await pedir('opciones-viajes.php');
const bus = opciones.vehiculos.find(v => v.estado === 'Operativo');
const ruta = opciones.rutas[0];
const viajes = (await pedir('viajes.php')).viajes;
let dia = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
while (viajes.some(v => v.vehiculoID === String(bus.vehiculoID) && v.fecha === dia)) {
  dia = new Date(new Date(dia + 'T12:00:00Z').getTime() + 86400000).toISOString().slice(0, 10);
}
const datos = { rutaID: String(ruta.rutaID), vehiculoID: String(bus.vehiculoID), fechaSalida: `${dia}T09:00`, fechaLlegada: `${dia}T13:00`, servicio: 'Semi cama', precio: '65.50' };
for (const cambios of [{ precio: '0' }, { precio: '1.234' }, { rutaID: '99999999' }, { vehiculoID: '99999999' }, { fechaLlegada: `${dia}T08:00` }, { fechaSalida: '2000-01-01T09:00' }]) {
  assert.equal((await pedir('guardar-viaje.php', { ...datos, ...cambios })).status, 422);
}
console.log('✓ Autenticación y validaciones del viaje');
let respuesta = await pedir('guardar-viaje.php', datos);
assert.equal(respuesta.status, 201);
let viaje = respuesta.viaje;
assert.equal(viaje.estado, 'Programado');
assert.equal(viaje.capacidad, Number(bus.capacidad));
assert.equal(viaje.asientosOcupados.length, 0);
assert((await pedir('viajes.php')).viajes.some(v => v.id === viaje.id));
assert.equal((await pedir('guardar-viaje.php', datos)).status, 409);
const otra = await pedir('guardar-viaje.php', { ...datos, fechaSalida: `${dia}T13:00`, fechaLlegada: `${dia}T17:00` });
assert.equal(otra.status, 201);
console.log('✓ Crear viaje, publicar en la consulta y bloquear cruces del mismo bus');
const versionAnterior = viaje.version;
respuesta = await pedir('guardar-viaje.php', { ...datos, id: viaje.id, version: viaje.version, fechaSalida: `${dia}T08:00`, precio: '70.00' });
assert.equal(respuesta.status, 200);
viaje = respuesta.viaje;
assert.equal(viaje.horaSalida, '08:00');
assert.equal(viaje.precio, 70);
assert.equal((await pedir('guardar-viaje.php', { ...datos, id: viaje.id, version: versionAnterior })).status, 409);
console.log('✓ Editar viaje y rechazar una edición desactualizada');
const pasajero = { tipoDocumento: 'DNI', numeroDocumento: String(Math.floor(10000000 + Math.random() * 89999999)), nombres: 'Prueba', apellidos: 'Viajes', telefono: '987654321', correo: 'viajes@example.com' };
const reserva = await pedir('guardar-reserva.php', { viajeId: viaje.id, asiento: 1, pasajero, version: viaje.version });
assert.equal(reserva.status, 201);
try {
  assert.equal((await pedir('guardar-viaje.php', { ...datos, id: viaje.id, version: viaje.version })).status, 409);
  respuesta = await pedir('guardar-viaje.php', { ...datos, fechaSalida: `${dia}T08:00`, id: viaje.id, version: viaje.version, precio: '75.00' });
  assert.equal(respuesta.status, 200);
  const anterior = await pedir('consultar-reserva.php', { codigo: reserva.reserva.codigo, documento: pasajero.numeroDocumento });
  assert.equal(anterior.reserva.precio, 70);
  assert.equal((await pedir('guardar-reserva.php', { viajeId: viaje.id, asiento: 2, pasajero, version: viaje.version })).status, 409);
  console.log('✓ Protección de viajes con reservas y conservación de la tarifa reservada');
  console.log('✓ Rechazo de reservas revisadas antes de cambiar el viaje');
} finally {
  await pedir('estado-reserva.php', { id: reserva.reserva.id, estado: 'anulada' });
  await pedir('logout.php', {});
}
console.log('Pruebas de viajes correctas. Los viajes ficticios permanecen en la base de pruebas.');
