import { cities } from '../../shared/data.js';
import { initializeStorage, getTrips, getTrip, getReservations, getAvailability, getOccupiedSeats, createReservation, findReservation, subscribe } from '../../shared/storage.js';
import { el, money, formatDate, today, localDate, isUpcoming, badge, emptyState, definitionList, setMessage, showErrors, clearErrors, validateSearch, validatePassenger } from '../../shared/utils.js';

const $ = selector => document.querySelector(selector);
const searchForm = $('#search-form');
const passengerForm = $('#passenger-form');
const lookupForm = $('#lookup-form');
const reviewDialog = $('#review-dialog');
let lastSearch = null;
let activeTrip = null;
let selectedSeat = null;
let reviewPassenger = null;
let currentReservation = null;
let lookupCredentials = null;
let submitting = false;

function safely(action) {
  return (...args) => {
    try { return action(...args); }
    catch (error) { setMessage($('#app-notice'), error.message); }
  };
}
function route() {
  const hash = location.hash.slice(1) || 'inicio';
  const view = hash === 'mis-reservas' ? 'lookup-view' : hash === 'reserva' && activeTrip ? 'booking-view' : hash === 'boleto' && currentReservation ? 'ticket-view' : 'home-view';
  for (const id of ['home-view', 'booking-view', 'ticket-view', 'lookup-view']) $(`#${id}`).hidden = id !== view;
  document.querySelectorAll('[data-nav]').forEach(link => {
    const current = link.dataset.nav === hash || (hash === 'inicio' && link.dataset.nav === 'inicio');
    if (current) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  if (view === 'lookup-view') $('#lookup-title').focus();
  if (view === 'booking-view') $('#booking-title').focus();
  if (view === 'ticket-view') $('#confirmation-title').focus();
  if (view === 'home-view' && ['buscar', 'destinos', 'beneficios', 'como-reservar'].includes(hash)) $(`#${hash}`).scrollIntoView({ block: 'start' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}
function navigate(hash) {
  if (location.hash === `#${hash}`) route(); else location.hash = hash;
}
function renderResults(focus = false) {
  if (!lastSearch) return;
  const trips = getTrips().filter(t => t.origen === lastSearch.origen && t.destino === lastSearch.destino && t.fecha === lastSearch.fecha && isUpcoming(t)).sort((a, b) => a.horaSalida.localeCompare(b.horaSalida));
  $('#results-section').hidden = false;
  $('#results-title').textContent = `${lastSearch.origen} → ${lastSearch.destino}`;
  $('#results-count').textContent = `${formatDate(lastSearch.fecha)} · ${trips.length} ${trips.length === 1 ? 'salida disponible' : 'salidas disponibles'}`;
  $('#trip-results').replaceChildren(...trips.map(tripCard));
  if (!trips.length) $('#trip-results').append(emptyState('No encontramos salidas para esta búsqueda', 'Prueba otra fecha o una de las rutas disponibles. Hay salidas diarias durante los próximos 21 días.'));
  if (focus) { $('#results-title').focus(); $('#results-section').scrollIntoView({ block: 'start' }); }
}
function tripCard(trip) {
  const available = getAvailability(trip.id);
  const nextDay = trip.fechaLlegada > trip.fecha;
  return el('article', { className: 'trip-card' }, [
    el('div', { className: 'trip-card__company' }, [el('strong', { text: trip.empresa }), el('span', { className: 'badge', text: trip.servicio })]),
    el('div', { className: 'trip-card__route' }, [el('div', { className: 'trip-card__times' }, [
      el('div', { className: 'trip-card__time' }, [el('strong', { text: trip.horaSalida }), el('span', { className: 'small', text: trip.origen })]),
      el('div', { className: 'trip-card__duration' }, [el('span', { text: trip.duracion }), el('span', { className: 'trip-card__line', 'aria-hidden': 'true' }), el('span', { text: 'Directo' })]),
      el('div', { className: 'trip-card__time' }, [el('strong', { text: `${trip.horaLlegada}${nextDay ? ' +1' : ''}` }), el('span', { className: 'small', text: trip.destino })]),
    ]), el('p', { className: 'muted small', text: `${formatDate(trip.fecha)} · ${available} asientos disponibles${nextDay ? ' · Llegada al día siguiente' : ''}` })]),
    el('div', { className: 'trip-card__price' }, [el('strong', { text: money(trip.precio) }), el('button', { type: 'button', className: 'btn btn--primary', disabled: available === 0, 'aria-label': `Seleccionar salida de ${trip.horaSalida}, ${money(trip.precio)}`, onclick: safely(() => selectTrip(trip)) }, available ? 'Elegir viaje →' : 'Agotado')]),
  ]);
}
function selectTrip(trip) {
  activeTrip = trip;
  selectedSeat = null;
  reviewPassenger = null;
  passengerForm.reset();
  clearErrors(passengerForm);
  setMessage($('#booking-alert'), '');
  renderSeats();
  renderSummary();
  navigate('reserva');
}
function renderSeats() {
  if (!activeTrip) return;
  const occupied = getOccupiedSeats(activeTrip.id);
  if (selectedSeat && occupied.has(selectedSeat)) {
    selectedSeat = null;
    setMessage($('#booking-alert'), 'El asiento que elegiste acaba de ocuparse. Selecciona otro asiento disponible.');
  }
  $('#available-count').textContent = `${activeTrip.capacidad - occupied.size} disponibles`;
  $('#seat-grid').replaceChildren(...Array.from({ length: activeTrip.capacidad }, (_, index) => {
    const number = index + 1;
    return el('button', {
      type: 'button', className: 'seat', disabled: occupied.has(number),
      'aria-label': `Asiento ${number}${occupied.has(number) ? ', ocupado' : ', disponible'}`,
      'aria-pressed': String(selectedSeat === number),
      onclick: safely(() => {
        if (getOccupiedSeats(activeTrip.id).has(number)) { renderSeats(); setMessage($('#booking-alert'), 'Este asiento ya está ocupado. Elige otro.'); return; }
        selectedSeat = number;
        setMessage($('#booking-alert'), '');
        $('#seat-grid').querySelectorAll('.seat').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === String(number))));
        renderSummary();
      }),
    }, number);
  }));
}
function passengerValues() {
  return Object.fromEntries([...new FormData(passengerForm)].map(([key, value]) => [key, value.trim()]));
}
function renderSummary() {
  if (!activeTrip) return;
  const passenger = passengerValues();
  $('#booking-summary').replaceChildren(
    el('div', { className: 'summary-route' }, [el('strong', { text: activeTrip.origen }), el('span', { className: 'muted small', text: '↓ Directo' }), el('strong', { text: activeTrip.destino })]),
    definitionList([['Salida', formatDate(activeTrip.fecha)], ['Hora', activeTrip.horaSalida], ['Servicio', activeTrip.servicio], ['Asiento', selectedSeat ? String(selectedSeat).padStart(2, '0') : 'Por seleccionar'], ['Pasajero', `${passenger.nombres} ${passenger.apellidos}`.trim() || 'Por completar']]),
    el('div', { className: 'summary-total' }, [el('span', { text: 'Total por persona' }), el('strong', { text: money(activeTrip.precio) })]),
  );
}
function reviewBooking(event) {
  event.preventDefault();
  const passenger = passengerValues();
  const errors = validatePassenger(passenger);
  showErrors(passengerForm, errors);
  if (!selectedSeat) {
    setMessage($('#booking-alert'), 'Selecciona un asiento disponible para continuar.');
    $('#seat-grid').querySelector('button:not(:disabled)')?.focus();
    return;
  }
  if (Object.keys(errors).length) return;
  if (getOccupiedSeats(activeTrip.id).has(selectedSeat)) { renderSeats(); renderSummary(); return; }
  reviewPassenger = passenger;
  $('#review-content').replaceChildren(definitionList([
    ['Ruta', `${activeTrip.origen} → ${activeTrip.destino}`], ['Salida', `${formatDate(activeTrip.fecha)} · ${activeTrip.horaSalida}`],
    ['Pasajero', `${passenger.nombres} ${passenger.apellidos}`], [passenger.tipoDocumento, passenger.numeroDocumento], ['Celular', passenger.telefono], ['Correo', passenger.correo], ['Asiento', selectedSeat], ['Total', money(activeTrip.precio)],
  ]));
  setMessage($('#review-error'), '');
  reviewDialog.showModal();
}
async function confirmBooking() {
  if (submitting || !reviewPassenger) return;
  submitting = true;
  const button = $('#confirm-booking');
  button.disabled = true;
  button.textContent = 'Guardando…';
  try {
    // Copy selection before the shared change event refreshes seat availability.
    const seat = selectedSeat;
    currentReservation = await createReservation({ viajeId: activeTrip.id, asiento: seat, pasajero: reviewPassenger });
    reviewDialog.close();
    reviewPassenger = null;
    activeTrip = null;
    selectedSeat = null;
    renderTicket();
    navigate('boleto');
  } catch (error) {
    setMessage($('#review-error'), error.message);
    renderSeats();
    renderSummary();
  } finally {
    submitting = false;
    button.disabled = false;
    button.textContent = 'Confirmar reserva';
  }
}
function makeTicket(reservation) {
  const trip = getTrip(reservation.viajeId);
  return el('article', { className: 'card ticket', 'aria-label': `Boleto de reserva ${reservation.codigo}` }, [
    el('div', { className: 'ticket__header' }, [el('strong', { className: 'brand', text: 'rutaexpress.' }), el('span', { className: 'small', text: 'BOLETO DE RESERVA · DEMOSTRACIÓN' })]),
    el('div', { className: 'ticket__body' }, [
      el('div', { className: 'flex justify-between items-center gap-4' }, [el('span', { className: 'ticket__code', text: reservation.codigo }), badge(reservation.estado)]),
      el('div', { className: 'ticket__route' }, [trip.origen, el('span', { className: 'muted', 'aria-hidden': 'true', text: '→' }), trip.destino]),
      definitionList([['Pasajero', `${reservation.pasajero.nombres} ${reservation.pasajero.apellidos}`], [reservation.pasajero.tipoDocumento, reservation.pasajero.numeroDocumento], ['Salida', `${formatDate(trip.fecha)} · ${trip.horaSalida}`], ['Llegada estimada', `${formatDate(trip.fechaLlegada)} · ${trip.horaLlegada}`], ['Servicio', trip.servicio], ['Asiento', String(reservation.asiento).padStart(2, '0')], ['Precio', money(reservation.precio)]]),
      el('p', { className: 'ticket__footer', text: 'Conserva tu código y documento para consultar el estado. Esta es una reserva simulada, no un comprobante de pago. Empresa ficticia · Proyecto universitario.' }),
    ]),
  ]);
}
function renderTicket() {
  if (!currentReservation) return;
  currentReservation = getReservations().find(r => r.id === currentReservation.id) || null;
  if (!currentReservation) { $('#ticket-container').replaceChildren(emptyState('Reserva no disponible', 'Los datos locales cambiaron. Realiza una nueva consulta.')); return; }
  $('#ticket-container').replaceChildren(makeTicket(currentReservation));
  $('#confirmation-title').textContent = currentReservation.estado === 'cancelada' ? 'Tu reserva está cancelada' : '¡Tu reserva está lista!';
  $('.confirmation-heading > p').textContent = currentReservation.estado === 'pendiente' ? 'Está pendiente de confirmación por la empresa. No has realizado ningún pago.' : currentReservation.estado === 'confirmada' ? 'La empresa confirmó tu reserva. Esta demostración no registra pagos.' : 'El asiento ha sido liberado. Puedes realizar una nueva reserva.';
}
function renderLookup() {
  if (!lookupCredentials) return;
  const reservation = findReservation(lookupCredentials.codigo, lookupCredentials.documento);
  if (!reservation) { $('#lookup-result').replaceChildren(emptyState('No encontramos la reserva', 'Verifica el código y el documento del pasajero e inténtalo nuevamente.')); return; }
  $('#lookup-result').replaceChildren(makeTicket(reservation), el('div', { className: 'actions ticket-actions' }, [el('button', { className: 'btn btn--secondary', type: 'button', onclick: () => { currentReservation = reservation; renderTicket(); navigate('boleto'); } }, 'Ver boleto e imprimir ↗')]));
}

try {
  await initializeStorage();
  $('#current-year').textContent = String(new Date().getFullYear());
  for (const city of cities) {
    $('#origin').append(el('option', { value: city, text: city }));
    $('#destination').append(el('option', { value: city, text: city }));
  }
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  $('#departure-date').min = today();
  $('#departure-date').value = localDate(tomorrow);
  $('#origin').value = 'Piura';
  $('#destination').value = 'Chiclayo';
  searchForm.addEventListener('submit', safely(event => {
    event.preventDefault();
    $('#departure-date').min = today();
    const values = Object.fromEntries(new FormData(searchForm));
    const errors = validateSearch(values);
    showErrors(searchForm, errors);
    if (Object.keys(errors).length) { $('#results-section').hidden = true; return; }
    lastSearch = values;
    renderResults(true);
  }));
  $('#swap-cities').addEventListener('click', () => { const origin = $('#origin').value; $('#origin').value = $('#destination').value; $('#destination').value = origin; clearErrors(searchForm); });
  document.querySelectorAll('[data-destination]').forEach(button => button.addEventListener('click', () => {
    $('#origin').value = button.dataset.origin; $('#destination').value = button.dataset.destination;
    clearErrors(searchForm); navigate('buscar'); searchForm.requestSubmit();
  }));
  passengerForm.addEventListener('input', safely(renderSummary));
  $('#document-type').addEventListener('change', () => { $('#document-number').inputMode = $('#document-type').value === 'DNI' ? 'numeric' : 'text'; });
  passengerForm.addEventListener('submit', safely(reviewBooking));
  $('#confirm-booking').addEventListener('click', confirmBooking);
  for (const id of ['close-review', 'edit-booking']) $(`#${id}`).addEventListener('click', () => { if (!submitting) reviewDialog.close(); });
  reviewDialog.addEventListener('cancel', event => { if (submitting) event.preventDefault(); });
  $('#back-results').addEventListener('click', () => { navigate('buscar'); });
  $('#print-ticket').addEventListener('click', () => window.print());
  lookupForm.addEventListener('submit', safely(event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(lookupForm));
    const errors = {};
    if (!values.codigo.trim()) errors.codigo = 'Ingresa el código de tu reserva.';
    if (!values.documento.trim()) errors.documento = 'Ingresa el documento del pasajero.';
    showErrors(lookupForm, errors);
    if (Object.keys(errors).length) { lookupCredentials = null; $('#lookup-result').replaceChildren(); return; }
    lookupCredentials = values; renderLookup();
  }));
  // Remove stale results as soon as either lookup credential changes.
  lookupForm.addEventListener('input', () => { lookupCredentials = null; $('#lookup-result').replaceChildren(); });
  window.addEventListener('hashchange', safely(route));
  subscribe(safely(() => {
    renderResults();
    if (activeTrip && !submitting) { renderSeats(); renderSummary(); }
    renderTicket(); renderLookup();
  }));
  route();
} catch (error) {
  setMessage($('#app-notice'), error.message);
  document.querySelectorAll('button[type="submit"]').forEach(button => { button.disabled = true; });
}
