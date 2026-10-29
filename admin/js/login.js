import { consultarSesion, iniciarSesion } from '../../shared/auth.js';
import { setMessage, showErrors } from '../../shared/utils.js';

const form = document.querySelector('#login-form');
const button = document.querySelector('#login-submit');
const message = document.querySelector('#login-message');
const password = document.querySelector('#password');
let enviando = false;

document.querySelector('#toggle-password').addEventListener('click', event => {
  const mostrar = password.type === 'password';
  password.type = mostrar ? 'text' : 'password';
  event.currentTarget.textContent = mostrar ? 'Ocultar' : 'Mostrar';
  event.currentTarget.setAttribute('aria-pressed', String(mostrar));
  event.currentTarget.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (enviando) return;
  const username = form.elements.username.value.trim();
  const clave = password.value;
  const errores = {};
  if (!username) errores.username = 'Ingresa tu usuario.';
  if (!clave) errores.password = 'Ingresa tu contraseña.';
  showErrors(form, errores);
  if (Object.keys(errores).length) return;
  enviando = true;
  button.disabled = true;
  button.textContent = 'Ingresando…';
  setMessage(message, '');
  try {
    await iniciarSesion(username, clave);
    password.value = '';
    location.replace('index.php');
  } catch (error) {
    setMessage(message, error.message);
    password.value = '';
    password.focus();
  } finally {
    enviando = false;
    button.disabled = false;
    button.textContent = 'Ingresar al panel →';
  }
});
try {
  const usuario = await consultarSesion();
  if (usuario) location.replace('index.php');
  else { button.disabled = false; form.elements.username.focus(); }
} catch (error) { setMessage(message, error.message); }
