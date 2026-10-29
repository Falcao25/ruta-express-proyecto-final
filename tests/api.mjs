// Crea reservas ficticias y las deja anuladas; usar una base de pruebas.
// node tests/api.mjs http://127.0.0.1:8000 [segundo-servidor-para-concurrencia]
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const base = process.argv[2];
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) {
  throw new Error('Indica un servidor PHP local de pruebas: node tests/api.mjs http://127.0.0.1:8000');
}
const cookies = new Map();
let csrf = '';
const cookieHeader = () => [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
async function pedir(archivo, datos, servidor = base) {
  const headers = { Cookie: cookieHeader() };
  if (datos !== undefined) { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = csrf; }
  const respuesta = await fetch(`${servidor}/api/${archivo}`, {
    method: datos === undefined ? 'GET' : 'POST', headers, body: datos === undefined ? undefined : JSON.stringify(datos),
  });
  for (const header of respuesta.headers.getSetCookie()) {
    const pair = header.split(';')[0];
    const index = pair.indexOf('=');
    const name = pair.slice(0, index), value = pair.slice(index + 1);
    if (value) cookies.set(name, value); else cookies.delete(name);
  }
  return { status: respuesta.status, ...await respuesta.json() };
}
for (const pagina of ['admin', 'cliente']) {
  const respuesta = await fetch(`${base}/${pagina}`, { redirect: 'manual' });
  assert.equal(respuesta.headers.get('location'), `/${pagina}/`);
  assert.equal(respuesta.status, 302);
}
const estilos = await fetch(`${base}/admin/css/admin.css`);
assert(estilos.headers.get('content-type').includes('text/css'));
assert.equal((await fetch(`${base}/archivo-inexistente.css`)).status, 404);
console.log('✓ Rutas de carpetas, estilos y respuesta 404 de archivos inexistentes');
assert.equal((await pedir('reservas.php')).status, 401);
assert.equal((await pedir('estado-reserva.php', { id: '1', estado: 'confirmada' })).status, 401);
csrf = (await pedir('sesion.php')).csrf;
assert.equal((await pedir('login.php', { username: 'no_existe', password: 'incorrecta' })).status, 401);
let username = process.env.RUTA_TEST_USER;
let password = process.env.RUTA_TEST_PASSWORD;
if (!username || !password) {
  const acceso = await readFile(join(process.env.LOCALAPPDATA, 'RutaExpress/acceso-inicial.txt'), 'utf8');
  username = acceso.match(/^Usuario: (.+)$/m)?.[1].trim();
  password = acceso.match(/^Contraseña: (.+)$/m)?.[1].trim();
}
const login = await pedir('login.php', { username, password });
assert.equal(login.status, 200);
csrf = login.csrf;
console.log('✓ Login y rechazo de acceso administrativo sin sesión');
const { viajes } = await pedir('viajes.php');
assert(viajes.length >= 210);
const viaje = viajes.find(v => new Date(`${v.fecha}T${v.horaSalida}:00-05:00`) > Date.now() + 86400000);
assert(viaje);
const ocupados = new Set(viaje.asientosOcupados);
const asiento = Array.from({ length: viaje.capacidad }, (_, i) => i + 1).find(n => !ocupados.has(n));
const pasajero = { tipoDocumento: 'DNI', numeroDocumento: String(Math.floor(10000000 + Math.random() * 89999999)), nombres: 'Prueba', apellidos: 'Universitaria', telefono: '987654321', correo: 'prueba@example.com' };
const datos = { viajeId: viaje.id, asiento, pasajero, version: viaje.version };
const creadas = [];
try {
  assert.equal((await pedir('guardar-reserva.php', { ...datos, pasajero: { ...pasajero, numeroDocumento: '12' } })).status, 422);
  assert.equal((await pedir('guardar-reserva.php', { ...datos, asiento: 41 })).status, 422);
  assert.equal((await pedir('guardar-reserva.php', { ...datos, asiento: viaje.asientosOcupadosIniciales[0] })).status, 409);
  console.log('✓ Validación PHP y bloqueo de asientos iniciales');
  const resultados = await Promise.all([
    pedir('guardar-reserva.php', { ...datos, precio: 0 }),
    pedir('guardar-reserva.php', datos, process.argv[3] || base),
  ]);
  for (const resultado of resultados) if (resultado.reserva) creadas.push(resultado.reserva);
  assert.deepEqual(resultados.map(r => r.status).sort(), [201, 409]);
  const reserva = creadas[0];
  const sinToken = await fetch(`${base}/api/estado-reserva.php`, {
    method: 'POST', headers: { Cookie: cookieHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: reserva.id, estado: 'confirmada' }),
  });
  assert.equal(sinToken.status, 403);
  assert.equal(reserva.estado, 'pendiente');
  assert.equal(reserva.precio, viaje.precio);
  assert.match(reserva.codigo, /^RES-[A-F0-9]{10}$/);
  console.log('✓ Reserva en MySQL, precio del servidor y rechazo de duplicados');
  assert.equal((await pedir('consultar-reserva.php', { codigo: reserva.codigo })).status, 422);
  assert.equal((await pedir('consultar-reserva.php', { codigo: reserva.codigo, documento: '00000000' })).reserva, null);
  assert.equal((await pedir('consultar-reserva.php', { codigo: "' OR 1=1 --", documento: pasajero.numeroDocumento })).reserva, null);
  assert.equal((await pedir('consultar-reserva.php', { codigo: reserva.codigo, documento: pasajero.numeroDocumento })).reserva.id, reserva.id);
  assert((await pedir('reservas.php')).reservas.some(r => r.id === reserva.id));
  console.log('✓ Consulta por dos datos y listado administrativo');
  assert.equal((await pedir('estado-reserva.php', { id: reserva.id, estado: 'confirmada' })).reserva.estado, 'confirmada');
  assert.equal((await pedir('estado-reserva.php', { id: reserva.id, estado: 'pendiente' })).status, 422);
  assert.equal((await pedir('estado-reserva.php', { id: reserva.id, estado: 'anulada' })).reserva.estado, 'anulada');
  assert.equal((await pedir('estado-reserva.php', { id: reserva.id, estado: 'confirmada' })).status, 409);
  const actual = (await pedir('viajes.php')).viajes.find(v => v.id === viaje.id);
  assert(!actual.asientosOcupados.includes(asiento));
  const repetida = await pedir('guardar-reserva.php', datos);
  assert.equal(repetida.status, 201);
  creadas.push(repetida.reserva);
  console.log('✓ Confirmación, anulación y reutilización del asiento');
} finally {
  for (const reserva of creadas) {
    const consulta = await pedir('consultar-reserva.php', { codigo: reserva.codigo, documento: pasajero.numeroDocumento });
    if (consulta.reserva && consulta.reserva.estado !== 'anulada') await pedir('estado-reserva.php', { id: reserva.id, estado: 'anulada' });
  }
}
assert.equal((await pedir('logout.php', {})).status, 200);
assert.equal((await pedir('reservas.php')).status, 401);
console.log('Pruebas correctas. Las reservas de prueba quedaron anuladas.');
