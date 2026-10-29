export const today = () => localDate(new Date());
export function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
export const formatDate = value => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
export const titleCase = value => value.charAt(0).toUpperCase() + value.slice(1);
export const isUpcoming = trip => new Date(`${trip.fecha}T${trip.horaSalida}:00`).getTime() > Date.now();

// User values always enter the DOM as text nodes, never parsed HTML.
export function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child !== null && child !== undefined) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
export const badge = state => el('span', { className: `badge badge--${state}`, text: titleCase(state) });
export function emptyState(title, description) {
  return el('div', { className: 'empty-state' }, [el('span', { className: 'empty-state__icon', 'aria-hidden': 'true', text: '↗' }), el('h3', { text: title }), el('p', { className: 'muted small', text: description })]);
}
export function definitionList(entries) {
  return el('dl', { className: 'definition-list' }, entries.map(([label, value]) => el('div', {}, [el('dt', { text: label }), el('dd', {}, value)])));
}
export function setMessage(target, message, type = 'error') {
  target.textContent = message;
  target.className = `alert alert--${type}`;
  target.hidden = !message;
}
export function clearErrors(form) {
  form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
}
export function showErrors(form, errors) {
  clearErrors(form);
  for (const [name, message] of Object.entries(errors)) {
    const field = form.elements.namedItem(name);
    if (!field) continue;
    field.setAttribute('aria-invalid', 'true');
    const error = document.getElementById(`${field.id}-error`);
    if (error) error.textContent = message;
  }
  form.querySelector('[aria-invalid="true"]')?.focus();
}
export function validateSearch(values) {
  const errors = {};
  if (!values.origen) errors.origen = 'Selecciona una ciudad de origen.';
  if (!values.destino) errors.destino = 'Selecciona una ciudad de destino.';
  if (values.origen && values.origen === values.destino) errors.destino = 'El destino debe ser diferente al origen.';
  const parsedDate = new Date(`${values.fecha}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.fecha || '') || Number.isNaN(parsedDate.getTime()) || localDate(parsedDate) !== values.fecha) errors.fecha = 'Selecciona una fecha válida.';
  else if (values.fecha < today()) errors.fecha = 'La fecha no puede ser anterior a hoy.';
  return errors;
}
export function validatePassenger(values) {
  const errors = {};
  if (!['DNI', 'CE'].includes(values.tipoDocumento)) errors.tipoDocumento = 'Selecciona DNI o carné de extranjería.';
  if (values.tipoDocumento === 'DNI' && !/^\d{8}$/.test(values.numeroDocumento || '')) errors.numeroDocumento = 'El DNI debe tener exactamente 8 dígitos.';
  if (values.tipoDocumento === 'CE' && !/^[a-zA-Z0-9]{9,12}$/.test(values.numeroDocumento || '')) errors.numeroDocumento = 'El CE debe tener entre 9 y 12 caracteres alfanuméricos.';
  for (const field of ['nombres', 'apellidos']) {
    if (!values[field]?.trim() || values[field].trim().length < 2 || values[field].trim().length > 70 || !/^[\p{L}\p{M} '\u2019-]+$/u.test(values[field])) errors[field] = 'Ingresa un nombre válido de 2 a 70 caracteres.';
  }
  if (!/^9\d{8}$/.test(values.telefono || '')) errors.telefono = 'Ingresa un celular peruano de 9 dígitos que empiece en 9.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo || '') || values.correo.length > 120) errors.correo = 'Ingresa un correo electrónico válido.';
  return errors;
}
