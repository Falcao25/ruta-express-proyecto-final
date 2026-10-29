const apiUrl = new URL('../api/', import.meta.url);
const loginUrl = new URL('../admin/login.php', import.meta.url);
let csrf = '';
let usuario = null;

async function solicitar(archivo, datos = null, protegido = false, actividad = false) {
  const headers = { Accept: 'application/json' };
  if (datos !== null) {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = csrf;
  }
  if (actividad) headers['X-Actividad-Usuario'] = '1';
  let respuesta;
  try {
    respuesta = await fetch(new URL(archivo, apiUrl), {
      method: datos === null ? 'GET' : 'POST', credentials: 'same-origin',
      cache: 'no-store', headers, body: datos === null ? undefined : JSON.stringify(datos),
    });
  } catch { throw new Error('No se pudo comunicar con el servidor. Comprueba la conexión.'); }
  if (!respuesta.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Abre el sistema con PHP usando iniciar.ps1.');
  }
  const resultado = await respuesta.json();
  if (!respuesta.ok) {
    if (protegido && respuesta.status === 401) irAlLogin();
    const error = new Error(resultado.error || 'No se pudo completar la solicitud.');
    error.campos = resultado.campos || {};
    throw error;
  }
  return resultado;
}

export function irAlLogin() {
  document.querySelector('.admin-layout')?.setAttribute('hidden', '');
  location.replace(loginUrl.href);
}
export async function consultarSesion() {
  const resultado = await solicitar('sesion.php');
  csrf = resultado.csrf;
  usuario = resultado.usuario;
  return usuario;
}
export const getUsuario = () => usuario;
export const pedirAdmin = (archivo, datos = null) => solicitar(archivo, datos, true, datos !== null);
export async function iniciarSesion(username, password) {
  const resultado = await solicitar('login.php', { username, password });
  usuario = resultado.usuario;
  csrf = resultado.csrf;
  return usuario;
}
export async function cerrarSesion() {
  await solicitar('logout.php', {});
  usuario = null;
  csrf = '';
  irAlLogin();
}
export async function renovarActividad() {
  const resultado = await solicitar('sesion.php', null, true, true);
  if (!resultado.usuario) irAlLogin();
}
