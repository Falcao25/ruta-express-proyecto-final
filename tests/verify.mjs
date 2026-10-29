// Comprobaciones sin dependencias. Ejecutar: node --experimental-vm-modules tests/verify.mjs
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTextModule } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const module = new SourceTextModule(await readFile(resolve(root, 'shared/utils.js'), 'utf8'));
await module.link(() => { throw new Error('Importación inesperada'); });
await module.evaluate();
const utils = module.namespace;
const pasajero = { tipoDocumento: 'DNI', numeroDocumento: '12345678', nombres: 'Juan', apellidos: 'Pérez', telefono: '987654321', correo: 'juan@example.com' };
assert.equal(Object.keys(utils.validatePassenger(pasajero)).length, 0);
for (const [campo, valor] of [['numeroDocumento', '12'], ['nombres', '<script>'], ['apellidos', ''], ['telefono', '123'], ['correo', 'a@']]) {
  assert(utils.validatePassenger({ ...pasajero, [campo]: valor })[campo]);
}
assert.equal(Object.keys(utils.validatePassenger({ ...pasajero, tipoDocumento: 'CE', numeroDocumento: 'ABC123456' })).length, 0);
assert(utils.validateSearch({ origen: 'Piura', destino: 'Piura', fecha: utils.today() }).destino);
assert(utils.validateSearch({ origen: 'Piura', destino: 'Lima', fecha: '2000-01-01' }).fecha);
assert(utils.validateSearch({ origen: '', destino: '', fecha: '' }).origen);
assert(!utils.isUpcoming({ fecha: '2099-01-01', horaSalida: '09:00', estado: 'Cancelado' }));
assert(!utils.isUpcoming({ fecha: '2099-01-01', horaSalida: '09:00', estadoVehiculo: 'Mantenimiento' }));
console.log('✓ Validaciones de pasajero, búsqueda y viajes disponibles');

async function archivos(carpeta) {
  const entradas = await readdir(carpeta, { withFileTypes: true });
  const resultado = [];
  for (const entrada of entradas) {
    if (entrada.name.startsWith('.')) continue;
    const ruta = resolve(carpeta, entrada.name);
    if (entrada.isDirectory()) resultado.push(...await archivos(ruta));
    else resultado.push(ruta);
  }
  return resultado;
}
for (const ruta of await archivos(root)) {
  if (!['.html', '.css', '.js'].includes(extname(ruta))) continue;
  const texto = await readFile(ruta, 'utf8');
  if (extname(ruta) === '.css') {
    assert(!/(?:^|[;{\s])margin-(?:top|bottom|left|right)\s*:/.test(texto), ruta);
    if (!ruta.endsWith('tokens.css')) assert(!/#[\da-f]{3,8}\b/i.test(texto), ruta);
  }
  if (extname(ruta) === '.html') assert(!/\sstyle\s*=/.test(texto), ruta);
  if (extname(ruta) === '.js') {
    assert(!/\.innerHTML\s*=/.test(texto), ruta);
    assert(!/localStorage\.(getItem|setItem)/.test(texto), ruta);
  }
}
console.log('✓ Auditoría CSS y DOM; persistencia localStorage retirada');
