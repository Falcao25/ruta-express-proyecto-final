import { localDate } from './utils.js';

export const cities = ['Piura', 'Chiclayo', 'Trujillo', 'Lima', 'Arequipa'];
export const routes = [
  { origen: 'Piura', destino: 'Chiclayo', duracion: '3h 30min', minutes: 210, precio: 35 },
  { origen: 'Piura', destino: 'Trujillo', duracion: '7h', minutes: 420, precio: 55 },
  { origen: 'Trujillo', destino: 'Lima', duracion: '10h', minutes: 600, precio: 65 },
  { origen: 'Lima', destino: 'Arequipa', duracion: '16h', minutes: 960, precio: 110 },
  { origen: 'Chiclayo', destino: 'Lima', duracion: '13h', minutes: 780, precio: 85 },
];

// IDs tied to dates keep reservations stable when the future schedule is extended.
export function generateTrips() {
  const trips = [];
  for (let day = 0; day < 21; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    const fecha = localDate(date);
    routes.forEach((route, index) => {
      for (const [departure, hour] of [9, 21].entries()) {
        const arrival = new Date(`${fecha}T${String(hour).padStart(2, '0')}:00:00`);
        arrival.setMinutes(arrival.getMinutes() + route.minutes);
        trips.push({
          id: `V-${fecha.replaceAll('-', '')}-${index + 1}${departure + 1}`,
          empresa: 'Ruta Express', origen: route.origen, destino: route.destino, fecha,
          horaSalida: `${String(hour).padStart(2, '0')}:00`,
          horaLlegada: `${String(arrival.getHours()).padStart(2, '0')}:${String(arrival.getMinutes()).padStart(2, '0')}`,
          fechaLlegada: localDate(arrival), duracion: route.duracion,
          servicio: departure ? 'Cama ejecutivo' : 'Semi cama',
          precio: route.precio + (departure ? 20 : 0), capacidad: 40,
          asientosOcupadosIniciales: departure ? [2, 5, 8, 14, 25, 32] : [3, 7, 12, 19],
        });
      }
    });
  }
  return trips;
}
