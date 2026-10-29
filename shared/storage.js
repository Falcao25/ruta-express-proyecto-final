import { isUpcoming, validatePassenger } from './utils.js';

// Estos arreglos son solo una copia para dibujar la interfaz. Los datos se guardan en MySQL.
let viajes = [];
let reservas = [];
let modoAdmin = false;
let actualizando = false;
let guardando = false;
const consultas = new Map();
const listeners = new Set();
const apiUrl = new URL('../api/', import.meta.url);

async function pedir(archivo, datos = null) {
  let respuesta;
  try {
    respuesta = await fetch(new URL(archivo, apiUrl), {
      method: datos === null ? 'GET' : 'POST',
      cache: 'no-store',
      headers: datos === null ? { Accept: 'application/json' } : { 'Content-Type': 'application/json' },
      body: datos === null ? undefined : JSON.stringify(datos),
    });
  } catch {
    throw new Error('No se pudo comunicar con el servidor. Revisa que PHP y MySQL estén iniciados.');
  }
  if (!respuesta.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Abre el proyecto con PHP o XAMPP. Live Server no ejecuta los archivos PHP.');
  }
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo completar la operación.');
  return resultado;
}

function avisar() { listeners.forEach(callback => callback()); }
function recordar(reserva) {
  reservas = reservas.filter(item => item.id !== reserva.id);
  reservas.push(reserva);
}

export async function initializeStorage(modo = 'cliente') {
  modoAdmin = modo === 'admin';
  viajes = (await pedir('viajes.php')).viajes;
  if (modoAdmin) reservas = (await pedir('reservas.php')).reservas;
}

export async function refreshData() {
  if (actualizando || guardando) return;
  actualizando = true;
  try {
    const anteriores = JSON.stringify([viajes, reservas]);
    const nuevosViajes = (await pedir('viajes.php')).viajes;
    let nuevasReservas = [];
    if (modoAdmin) {
      nuevasReservas = (await pedir('reservas.php')).reservas;
    } else {
      // El cliente solo recibe las reservas consultadas con código Y documento.
      for (const datos of consultas.values()) {
        const resultado = await pedir('consultar-reserva.php', datos);
        if (resultado.reserva) nuevasReservas.push(resultado.reserva);
      }
    }
    if (guardando) return;
    viajes = nuevosViajes;
    reservas = nuevasReservas;
    if (anteriores !== JSON.stringify([viajes, reservas])) avisar();
  } finally { actualizando = false; }
}

export const getTrips = () => [...viajes];
export const getReservations = () => [...reservas];
export const getTrip = id => viajes.find(viaje => viaje.id === id);
export const getOccupiedSeats = id => new Set(getTrip(id)?.asientosOcupados || []);
export function getAvailability(id) {
  const viaje = getTrip(id);
  return viaje ? viaje.capacidad - getOccupiedSeats(id).size : 0;
}
export function getTripOverview() {
  return viajes.map(viaje => ({ ...viaje, reservados: getOccupiedSeats(viaje.id).size, disponibles: getAvailability(viaje.id) }));
}

export async function createReservation({ viajeId, asiento, pasajero }) {
  const errores = validatePassenger(pasajero);
  if (Object.keys(errores).length) throw new Error('Revisa los datos del pasajero antes de reservar.');
  guardando = true;
  try {
    const { reserva } = await pedir('guardar-reserva.php', { viajeId, asiento, pasajero });
    recordar(reserva);
    consultas.set(reserva.codigo, { codigo: reserva.codigo, documento: reserva.pasajero.numeroDocumento });
    const viaje = getTrip(viajeId);
    if (viaje) viaje.asientosOcupados = [...new Set([...viaje.asientosOcupados, reserva.asiento])];
    avisar();
    return reserva;
  } finally { guardando = false; }
}

export async function updateReservationStatus(id, estado) {
  guardando = true;
  try {
    const { reserva } = await pedir('estado-reserva.php', { id, estado });
    recordar(reserva);
    const viaje = getTrip(reserva.viajeId);
    if (viaje && reserva.estado === 'anulada') {
      viaje.asientosOcupados = viaje.asientosOcupados.filter(numero => numero !== reserva.asiento);
    }
    avisar();
    return reserva;
  } finally { guardando = false; }
}

export async function findReservation(codigo, documento) {
  const datos = { codigo: codigo.trim().toUpperCase(), documento: documento.trim().toUpperCase() };
  const { reserva } = await pedir('consultar-reserva.php', datos);
  if (reserva) { recordar(reserva); consultas.set(reserva.codigo, datos); }
  return reserva;
}

export function getStatistics() {
  return {
    total: reservas.length,
    pendiente: reservas.filter(reserva => reserva.estado === 'pendiente').length,
    confirmada: reservas.filter(reserva => reserva.estado === 'confirmada').length,
    anulada: reservas.filter(reserva => reserva.estado === 'anulada').length,
    viajes: viajes.filter(viaje => isUpcoming(viaje) && getAvailability(viaje.id) > 0).length,
  };
}

export function subscribe(callback, mostrarError) {
  listeners.add(callback);
  // Consulta MySQL cada 5 segundos, también cuando se vuelve a la pestaña.
  const actualizar = () => refreshData().catch(error => mostrarError?.(error));
  const timer = setInterval(() => { if (!document.hidden) actualizar(); }, 5000);
  window.addEventListener('focus', actualizar);
  return () => { clearInterval(timer); listeners.delete(callback); window.removeEventListener('focus', actualizar); };
}
