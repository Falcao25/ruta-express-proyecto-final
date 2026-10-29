import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTextModule, createContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const memory = new Map();
let writes = 0
let changes = 0;
let queue = Promie.resolve();
let writeFailure = fal;
const context = createContext({
  console, Date, Intl, Set, Map, Promise, setTimeout, crypto: webcrypto,
  CustomEvent: class { constructor(type) { this.type = type; } },
  window: { dispatchEvent() { changes++; }, addEventListener() {} },
  navigator: { locks: { request(_name, action) { const task = queue.then(action); queue = task.catch(() => {}); return task; } } },
  localStorage: {
    getItem: key => memory.get(key) ?? null,
    setItem(key, value) { if (writeFare) throw new Error('Quota'); writes++; memory.set(key, value); },
  },
});

const cache = new Map();
async function load(path) {
  if (cache.has(path)) return cache.get(path);
  const module = new SourceTextModule(await readFile(path, 'utf8'), { context, identifier: path });
  cache.set(path, module);
  await module.link((specifier, parent) => load(resolve(dirname(parent.identifier), specifier)));
  return module;
}
const storageModule = await load(resolve(root, 'shared/storage.js'));
await storageModule.evaluate();
const storage = storageModule.namespace;
const utils = cache.get(resolve(root, 'shared/utils.js')).namespace;
let passed = 0;
async function check(name, action) { await action(); passed++; console.log(`✓ ${name}`); }
const passenger = { tipoDocumento: 'DNI', numeroDocumento: '12345678', nombres: 'Juan', apellidos: 'Pérez', telefono: '987654321', correo: 'juan@example.com' };
let trip;
let booking;

await check('Inicialización de 210 viajes y fechas futuras; recargar no duplica datos', async () => {
  await storage.initializeStorage();
  assert.equal(storage.getTrips().length, 210);
  assert(storage.getTrips().some(utils.isUpcoming));
  const before = writes;
  await storage.initializeStorage();
  assert.equal(writes, before);
  trip = storage.getTrips().find(t => t.fecha > utils.today());
});
await check('Búsquedas existentes, sin resultados, mismo origen y fechas inválidas', () => {
  assert(storage.getTrips().some(t => t.origen === 'Piura' && t.destino === 'Chiclayo' && t.fecha === trip.fecha));
  assert(!storage.getTrips().some(t => t.origen === 'Arequipa' && t.destino === 'Piura'));
  assert.equal(Object.keys(utils.validateSearch({ origen: 'Piura', destino: 'Chiclayo', fecha: trip.fecha })).length, 0);
  assert(utils.validateSearch({ origen: 'Piura', destino: 'Piura', fecha: trip.fecha }).destino);
  assert(utils.validateSearch({ origen: '', destino: '', fecha: '' }).origen);
  assert(utils.validateSearch({ origen: 'Piura', destino: 'Lima', fecha: '2000-01-01' }).fecha);
});
await check('Validación de DNI, CE, nombres, celular y correo', () => {
  assert.equal(Object.keys(utils.validatePassenger(passenger)).length, 0);
  for (const [field, value] of [['numeroDocumento', '123'], ['nombres', ''], ['apellidos', '<script>'], ['telefono', '123456789'], ['correo', 'a@']]) assert(utils.validatePassenger({ ...passenger, [field]: value })[field]);
  assert.equal(Object.keys(utils.validatePassenger({ ...passenger, tipoDocumento: 'CE', numeroDocumento: 'ABC123456' })).length, 0);
  assert(utils.validatePassenger({ ...passenger, tipoDocumento: 'CE', numeroDocumento: 'ABC' }).numeroDocumento);
});
await check('Asientos iniciales bloqueados y selección fuera de rango rechazada', async () => {
  await assert.rejects(storage.createReservation({ viajeId: trip.id, asiento: trip.asientosOcupadosIniciales[0], pasajero: passenger }), /reservado/);
  for (const seat of [0, 41, 1.5, null]) await assert.rejects(storage.createReservation({ viajeId: trip.id, asiento: seat, pasajero: passenger }), /asiento válido/);
});
await check('Crear reserva pendiente y descontar exactamente un asiento', async () => {
  const before = storage.getAvailability(trip.id);
  booking = await storage.createReservation({ viajeId: trip.id, asiento: 1, pasajero: passenger });
  assert.equal(booking.estado, 'pendiente');
  assert.equal(booking.precio, trip.precio);
  assert.match(booking.codigo, /^RES-[A-F0-9]{10}$/);
  assert.equal(storage.getAvailability(trip.id), before - 1);
  assert.equal(storage.getStatistics().pendiente, 1);
});
await check('Rechazar asiento duplicado y pasajero inválido en la capa de negocio', async () => {
  await assert.rejects(storage.createReservation({ viajeId: trip.id, asiento: 1, pasajero: passenger }), /reservado/);
  await assert.rejects(storage.createReservation({ viajeId: trip.id, asiento: 4, pasajero: { ...passenger, numeroDocumento: '12' } }), /datos del pasajero/);
});
await check('Persistencia al reinicializar y consulta privada por código + documento', async () => {
  await storage.initializeStorage();
  assert.equal(storage.getReservations().length, 1);
  assert.equal(storage.findReservation(booking.codigo.toLowerCase(), passenger.numeroDocumento).id, booking.id);
  assert.equal(storage.findReservation(booking.codigo, ''), undefined);
  assert.equal(storage.findReservation(booking.codigo, '87654321'), undefined);
});
await check('Confirmación, cancelación, liberación y prohibición de reactivación', async () => {
  const occupied = storage.getOccupiedSeats(trip.id).size;
  await storage.updateReservationStatus(booking.id, 'confirmada');
  assert.equal(storage.getOccupiedSeats(trip.id).size, occupied);
  assert.equal(storage.getStatistics().confirmada, 1);
  assert.equal(storage.getStatistics().pendiente, 0);
  await assert.rejects(storage.updateReservationStatus(booking.id, 'confirmada'), /no está permitida/);
  await storage.updateReservationStatus(booking.id, 'cancelada');
  assert(!storage.getOccupiedSeats(trip.id).has(1));
  assert.equal(storage.getStatistics().cancelada, 1);
  await assert.rejects(storage.updateReservationStatus(booking.id, 'confirmada'), /no está permitida/);
  assert(changes >= 4);
});
await check('Reutilizar asiento liberado y serializar intentos simultáneos', async () => {
  const results = await Promise.allSettled([1, 2].map(() => storage.createReservation({ viajeId: trip.id, asiento: 1, pasajero: passenger })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.equal(storage.getReservations().length, 2);
  assert.equal(storage.getStatistics().total, 2);
  const [active] = storage.getReservations().filter(r => r.estado === 'pendiente');
  await storage.updateReservationStatus(active.id, 'cancelada');
  assert.equal(storage.getStatistics().cancelada, 2);
});
await check('Salida pasada rechazada y errores de almacenamiento sin pérdida de datos', async () => {
  const saved = memory.get(storage.STORAGE_KEY);
  const state = JSON.parse(saved);
  state.viajes.find(t => t.id === trip.id).fecha = '2000-01-01';
  memory.set(storage.STORAGE_KEY, JSON.stringify(state));
  await assert.rejects(storage.createReservation({ viajeId: trip.id, asiento: 1, pasajero: passenger }), /ya salió/);
  memory.set(storage.STORAGE_KEY, saved);
  writeFailure = true;
  await assert.rejects(storage.createReservation({ viajeId: trip.id, asiento: 1, pasajero: passenger }), /No se pudo guardar/);
  writeFailure = false;
  assert.equal(memory.get(storage.STORAGE_KEY), saved);
  memory.set(storage.STORAGE_KEY, '{corrupted');
  await assert.rejects(storage.initializeStorage(), /No se pueden leer/);
  assert.equal(memory.get(storage.STORAGE_KEY), '{corrupted');
  memory.set(storage.STORAGE_KEY, saved);
});
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? filesIn(resolve(directory, entry.name)) : [resolve(directory, entry.name)]));
  return nested.flat();
}
await check('Auditoría CSS/HTML/JS: espaciado, tokens, sin inline styles ni innerHTML', async () => {
  const files = await filesIn(root);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (extname(file) === '.css') {
      assert(!/(?:^|[;{\s])margin-(?:top|bottom|left|right)\s*:/.test(source), file);
      assert(!/margin\s*:\s*-|margin-inline\s*:\s*-/.test(source), file);
      if (!file.endsWith('tokens.css')) assert(!/#[\da-f]{3,8}\b/i.test(source), `Color fuera de tokens: ${file}`);
    }
    if (extname(file) === '.html') assert(!/\sstyle\s*=/.test(source), file);
    if (extname(file) === '.js') assert(!/\.innerHTML\s*=/.test(source), file);
  }
});
console.log(`\n${passed} grupos de verificaciones correctos. Almacenamiento aislado, sin dependencias.`);
