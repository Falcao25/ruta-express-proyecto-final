import { getTrip, getReservations, getTripOptions, saveTrip, refreshData } from '../../shared/storage.js';
import { el, today, setMessage, showErrors, clearErrors } from '../../shared/utils.js';

const $ = selector => document.querySelector(selector);
let viajeActual = null;
let vehiculos = [];
let guardando = false;
let abriendo = false;
let alGuardar = () => {};
const camposProtegidos = ['rutaID', 'vehiculoID', 'fechaSalida', 'fechaLlegada', 'servicio'];

export const puedeEditarViaje = viaje => viaje?.estado === 'Programado' &&
  new Date(`${viaje.fecha}T${viaje.horaSalida}:00-05:00`).getTime() > Date.now();

export async function abrirFormularioViaje(id = null) {
  if (abriendo) return;
  abriendo = true;
  $('#new-trip').disabled = true;
  try {
    await refreshData();
    const opciones = await getTripOptions();
    viajeActual = id ? getTrip(id) : null;
    if (id && !puedeEditarViaje(viajeActual)) throw new Error('Solo puedes editar viajes programados que aún no hayan salido.');
    const form = $('#trip-form');
    form.reset();
    clearErrors(form);
    setMessage($('#trip-form-error'), '');
    vehiculos = opciones.vehiculos;
    form.elements.rutaID.replaceChildren(el('option', { value: '', text: 'Selecciona una ruta' }),
      ...opciones.rutas.map(ruta => el('option', { value: ruta.rutaID, text: `${ruta.origen} → ${ruta.destino}` })));
    form.elements.vehiculoID.replaceChildren(el('option', { value: '', text: 'Selecciona un vehículo' }),
      ...vehiculos.map(bus => el('option', { value: bus.vehiculoID, disabled: bus.estado !== 'Operativo',
        text: `${bus.placa} · ${bus.capacidad} asientos${bus.estado !== 'Operativo' ? ' · ' + bus.estado : ''}` })));
    if (viajeActual) {
      form.elements.rutaID.value = viajeActual.rutaID;
      form.elements.vehiculoID.value = viajeActual.vehiculoID;
      form.elements.fechaSalida.value = `${viajeActual.fecha}T${viajeActual.horaSalida}`;
      form.elements.fechaLlegada.value = `${viajeActual.fechaLlegada}T${viajeActual.horaLlegada}`;
      form.elements.servicio.value = viajeActual.servicio;
      form.elements.precio.value = viajeActual.precio.toFixed(2);
    }
    const tieneReservas = viajeActual && getReservations().some(reserva => reserva.viajeId === id && reserva.estado !== 'anulada');
    camposProtegidos.forEach(campo => { form.elements[campo].disabled = Boolean(tieneReservas); });
    $('#trip-protection-note').hidden = !tieneReservas;
    $('#trip-form-title').textContent = viajeActual ? `Editar viaje ${viajeActual.codigo}` : 'Programar un nuevo viaje';
    $('#trip-save').textContent = viajeActual ? 'Guardar cambios' : 'Crear viaje';
    form.elements.fechaSalida.min = `${today()}T00:00`;
    actualizarCapacidad();
    $('#trip-form-dialog').showModal();
    form.elements[tieneReservas ? 'precio' : 'rutaID'].focus();
  } finally {
    abriendo = false;
    $('#new-trip').disabled = false;
  }
}

function actualizarCapacidad() {
  const bus = vehiculos.find(bus => String(bus.vehiculoID) === $('#trip-vehicle').value);
  $('#trip-capacity').textContent = bus ? `Capacidad: ${bus.capacidad} asientos. La capacidad corresponde al vehículo.` : 'La capacidad se toma del vehículo seleccionado.';
}

export function prepararGestionViajes(callback) {
  alGuardar = callback;
  const form = $('#trip-form');
  const dialog = $('#trip-form-dialog');
  form.addEventListener('input', event => {
    event.target.removeAttribute('aria-invalid');
    const error = document.getElementById(`${event.target.id}-error`);
    if (error) error.textContent = '';
  });
  $('#new-trip').addEventListener('click', () => abrirFormularioViaje().catch(error => setMessage($('#admin-notice'), error.message)));
  $('#trip-vehicle').addEventListener('change', actualizarCapacidad);
  for (const id of ['trip-close', 'trip-cancel']) $(`#${id}`).addEventListener('click', () => { if (!guardando) dialog.close(); });
  dialog.addEventListener('cancel', event => { if (guardando) event.preventDefault(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (guardando) return;
    // Leer los valores directamente también conserva los campos deshabilitados por reservas activas.
    const datos = {};
    for (const campo of [...camposProtegidos, 'precio']) datos[campo] = form.elements[campo].value.trim();
    if (viajeActual) { datos.id = viajeActual.id; datos.version = viajeActual.version; }
    const errores = {};
    if (!datos.rutaID) errores.rutaID = 'Selecciona una ruta.';
    if (!datos.vehiculoID) errores.vehiculoID = 'Selecciona un vehículo.';
    const salida = new Date(`${datos.fechaSalida}:00-05:00`);
    const llegada = new Date(`${datos.fechaLlegada}:00-05:00`);
    if (!datos.fechaSalida || !Number.isFinite(salida.getTime()) || salida.getTime() <= Date.now()) errores.fechaSalida = 'Selecciona una salida futura.';
    if (!datos.fechaLlegada || !Number.isFinite(llegada.getTime()) || llegada <= salida) errores.fechaLlegada = 'La llegada debe ser posterior a la salida.';
    if (!['Semi cama', 'Cama ejecutivo'].includes(datos.servicio)) errores.servicio = 'Selecciona un servicio.';
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(datos.precio) || Number(datos.precio) <= 0) errores.precio = 'Ingresa un precio positivo con hasta dos decimales.';
    showErrors(form, errores);
    setMessage($('#trip-form-error'), '');
    if (Object.keys(errores).length) return;
    guardando = true;
    $('#trip-fields').disabled = true;
    $('#trip-save').disabled = true;
    $('#trip-save').textContent = 'Guardando…';
    try {
      const nuevo = !viajeActual;
      const viaje = await saveTrip(datos);
      dialog.close();
      alGuardar(viaje, nuevo);
    } catch (error) {
      setMessage($('#trip-form-error'), error.message);
      showErrors(form, error.campos || {});
    } finally {
      guardando = false;
      $('#trip-fields').disabled = false;
      $('#trip-save').disabled = false;
      $('#trip-save').textContent = viajeActual ? 'Guardar cambios' : 'Crear viaje';
      form.querySelector('[aria-invalid="true"]:not(:disabled)')?.focus();
    }
  });
}
