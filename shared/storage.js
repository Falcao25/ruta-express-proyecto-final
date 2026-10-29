import { generateTrips } from './data.js';
import { isUpcoming, validatePassenger } from './utils.js';

export const STORAGE_KEY = 'ruta-express:v1';
const VERSION = 1;
const STORAGE_SETTLE_MS = 50;

function validateState(state) {
  if (!state || state.version !== VERSION || !Array.isArray(state.viajes) || !Array.isArray(state.reservas)) throw new Error('Los datos locales no tienen un formato compatible. Conserva una copia antes de revisar el almacenamiento del navegador.');
  const tripsValid = state.viajes.every(t => typeof t.id === 'string' && typeof t.origen === 'string' && typeof t.destino === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.fecha) && Number.isFinite(t.precio) && Number.isInteger(t.capacidad) && Array.isArray(t.asientosOcupadosIniciales));
  const bookingsValid = state.reservas.every(r => typeof r.id === 'string' && typeof r.codigo === 'string' && state.viajes.some(t => t.id === r.viajeId) && Number.isInteger(r.asiento) && r.pasajero && typeof r.pasajero.nombres === 'string' && typeof r.pasajero.apellidos === 'string' && typeof r.pasajero.numeroDocumento === 'string' && ['pendiente', 'confirmada', 'cancelada'].includes(r.estado));
  if (!tripsValid || !bookingsValid) throw new Error('Los datos locales están dañados. No se sobrescribieron tus reservas.');
  return state;
}
function readState() {
  let raw;
  try { raw = localStorage.getItem(STORAGE_KEY); }
  catch { throw new Error('No se puede acceder al almacenamiento local. Habilítalo para usar la demostración.'); }
  if (raw === null) return { version: VERSION, viajes: [], reservas: [] };
  let state;
  try { state = JSON.parse(raw); }
  catch { throw new Error('No se pueden leer los datos locales. No se sobrescribieron tus reservas.'); }
  return validateState(state);
}
function writeState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { throw new Error('No se pudo guardar. Comprueba el espacio y los permisos de almacenamiento del navegador.'); }
  window.dispatchEvent(new CustomEvent('reservations-changed'));
}
export async function initializeStorage() {
  return withWriteLock(() => {
    const state = readState();
    const ids = new Set(state.viajes.map(trip => trip.id));
    const additions = generateTrips().filter(trip => !ids.has(trip.id));
    if (additions.length) { state.viajes.push(...additions); writeState(state); }
  });
}
export const getTrips = () => readState().viajes;
export const getReservations = () => readState().reservas;
export const getTrip = id => getTrips().find(trip => trip.id === id);
function occupiedIn(state, trip) {
  return new Set([...trip.asientosOcupadosIniciales, ...state.reservas.filter(r => r.viajeId === trip.id && r.estado !== 'cancelada').map(r => r.asiento)]);
}
export function getOccupiedSeats(tripId) {
  const state = readState();
  const trip = state.viajes.find(t => t.id === tripId);
  if (!trip) throw new Error('El viaje ya no está disponible.');
  return occupiedIn(state, trip);
}
export function getAvailability(tripId) {
  const state = readState();
  const trip = state.viajes.find(t => t.id === tripId);
  if (!trip) return 0;
  return trip.capacidad - occupiedIn(state, trip).size;
}
export function getTripOverview() {
  const state = readState();
  return state.viajes.map(trip => {
    const reservados = occupiedIn(state, trip).size;
    return { ...trip, reservados, disponibles: trip.capacidad - reservados };
  });
}
// Web Locks serialize writes across supporting same-origin browser tabs.
// The fallback still re-reads immediately before writing, but cannot guarantee concurrency.
function withWriteLock(operation) {
  if (navigator.locks?.request) return navigator.locks.request(STORAGE_KEY, async () => {
    const result = operation();
    // Browser tabs can retain stale localStorage caches briefly even with Web
    // Locks. Keep a short propagation window before releasing the lock.
    // This reduces collisions; it is not a transactional guarantee.
    await new Promise(resolve => setTimeout(resolve, STORAGE_SETTLE_MS));
    return result;
  });
  return Promise.resolve().then(operation);
}
export async function createReservation({ viajeId, asiento, pasajero }) {
  return withWriteLock(() => {
    const cleanPassenger = Object.fromEntries(['tipoDocumento', 'numeroDocumento', 'nombres', 'apellidos', 'telefono', 'correo'].map(key => [key, String(pasajero[key] || '').trim()]));
    if (Object.keys(validatePassenger(cleanPassenger)).length) throw new Error('Revisa los datos del pasajero antes de reservar.');
    const state = readState();
    const trip = state.viajes.find(t => t.id === viajeId);
    if (!trip || !isUpcoming(trip)) throw new Error('El viaje ya salió. Busca una nueva salida.');
    if (!Number.isInteger(asiento) || asiento < 1 || asiento > trip.capacidad) throw new Error('Selecciona un asiento válido.');
    if (occupiedIn(state, trip).has(asiento)) throw new Error('Este asiento acaba de ser reservado. Selecciona otro disponible.');
    const id = crypto.randomUUID();
    let codigo;
    do { codigo = `RES-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`; }
    while (state.reservas.some(r => r.codigo === codigo));
    const reservation = { id, codigo, viajeId, pasajero: { ...cleanPassenger, id: `P-${id}` }, asiento, precio: trip.precio, fechaReserva: new Date().toISOString(), estado: 'pendiente' };
    state.reservas.push(reservation);
    writeState(state);
    return reservation;
  });
}
export async function updateReservationStatus(id, status) {
  return withWriteLock(() => {
    const state = readState();
    const reservation = state.reservas.find(r => r.id === id);
    if (!reservation) throw new Error('La reserva ya no existe.');
    const allowed = { pendiente: ['confirmada', 'cancelada'], confirmada: ['cancelada'], cancelada: [] };
    if (!allowed[reservation.estado].includes(status)) throw new Error('El estado de la reserva cambió o la operación no está permitida. Actualiza la consulta.');
    reservation.estado = status;
    writeState(state);
    return reservation;
  });
}
export function findReservation(code, documentNumber) {
  const normalized = code.trim().toUpperCase();
  return getReservations().find(r => r.codigo === normalized && r.pasajero.numeroDocumento.toUpperCase() === documentNumber.trim().toUpperCase());
}
export function getStatistics() {
  const state = readState();
  const reservations = state.reservas;
  return {
    total: reservations.length,
    pendiente: reservations.filter(r => r.estado === 'pendiente').length,
    confirmada: reservations.filter(r => r.estado === 'confirmada').length,
    cancelada: reservations.filter(r => r.estado === 'cancelada').length,
    viajes: state.viajes.filter(t => isUpcoming(t) && occupiedIn(state, t).size < t.capacidad).length,
  };
}
export function subscribe(callback) {
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) callback(); });
  window.addEventListener('reservations-changed', callback);
}
