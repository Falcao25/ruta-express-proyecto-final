import {
  initializeStorage,
  getTripOverview,
  getTrip,
  getReservations,
  getOccupiedSeats,
  getAvailability,
  getStatistics,
  updateReservationStatus,
  subscribe,
} from "../../shared/storage.js";
import {
  el,
  money,
  formatDate,
  isUpcoming,
  badge,
  emptyState,
  definitionList,
  setMessage,
} from "../../shared/utils.js";
import { getUsuario, consultarSesion, cerrarSesion, irAlLogin, renovarActividad } from '../../shared/auth.js';

const $ = (selector) => document.querySelector(selector);
let detail = null;
let pendingAction = null;
let applying = false;
const detailDialog = $("#detail-dialog");
const actionDialog = $("#action-dialog");

function safely(action) {
  return (...args) => {
    try {
      return action(...args);
    } catch (error) {
      setMessage($("#admin-notice"), error.message);
    }
  };
}
function route() {
  const selected = ["dashboard", "viajes", "reservas"].includes(
    location.hash.slice(1),
  )
    ? location.hash.slice(1)
    : "dashboard";
  for (const name of ["dashboard", "viajes", "reservas"])
    $(`#${name}-view`).hidden = name !== selected;
  document.querySelectorAll("[data-view]").forEach((link) => {
    if (link.dataset.view === selected)
      link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("#breadcrumb-current").textContent = {
    dashboard: "Dashboard",
    viajes: "Viajes",
    reservas: "Reservas",
  }[selected];
  $(
    `#${selected === "dashboard" ? "dashboard" : selected === "viajes" ? "trips" : "reservations"}-title`,
  ).focus();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function table(headers, rows, caption) {
  return el(
    "div",
    {
      className: "table-wrap",
      role: "region",
      tabindex: "0",
      "aria-label": `${caption}. Desplaza horizontalmente si es necesario.`,
    },
    [
      el("table", {}, [
        el("caption", { className: "sr-only", text: caption }),
        el("thead", {}, [
          el(
            "tr",
            {},
            headers.map((header) => el("th", { scope: "col", text: header })),
          ),
        ]),
        el("tbody", {}, rows),
      ]),
    ],
  );
}
function cell(content, className) {
  return el("td", { className }, content);
}
function reservationActions(reservation, includeDetail = true) {
  const buttons = [];
  if (includeDetail)
    buttons.push(
      el(
        "button",
        {
          type: "button",
          className: "btn btn--text",
          "aria-label": `Ver reserva ${reservation.codigo}`,
          onclick: safely(() => openReservation(reservation.id)),
        },
        "Ver detalle",
      ),
    );
  if (reservation.estado === "pendiente")
    buttons.push(
      el(
        "button",
        {
          type: "button",
          className: "btn btn--secondary",
          onclick: safely(() => askAction(reservation.id, "confirmada")),
        },
        "Confirmar",
      ),
    );
  if (reservation.estado !== "anulada")
    buttons.push(
      el(
        "button",
        {
          type: "button",
          className: "btn btn--text",
          onclick: safely(() => askAction(reservation.id, "anulada")),
        },
        "Anular",
      ),
    );
  return el("div", { className: "actions" }, buttons);
}
function renderReservationTable(reservations, recent = false) {
  if (!reservations.length)
    return emptyState(
      recent
        ? "Tu próxima reserva empieza en la web del cliente"
        : "No hay reservas para mostrar",
      recent
        ? "Crea una reserva de prueba y aparecerá aquí automáticamente."
        : "Prueba otros filtros o realiza una reserva desde la web pública.",
    );
  const headers = recent
    ? ["Código", "Pasajero", "Ruta", "Salida", "Estado", "Acciones"]
    : [
        "Código",
        "Pasajero / Documento",
        "Ruta",
        "Salida",
        "Asiento",
        "Precio",
        "Estado",
        "Acciones",
      ];
  return table(
    headers,
    reservations.map((reservation) => {
      const trip = getTrip(reservation.viajeId);
      const passenger = el("div", { className: "table-passenger" }, [
        el("strong", {
          text: `${reservation.pasajero.nombres} ${reservation.pasajero.apellidos}`,
        }),
        ...(!recent
          ? [
              el("span", {
                text: `${reservation.pasajero.tipoDocumento} ${reservation.pasajero.numeroDocumento}`,
              }),
            ]
          : []),
      ]);
      return el("tr", {}, [
        cell(reservation.codigo, "code"),
        cell(passenger),
        cell(`${trip.origen} → ${trip.destino}`),
        cell(
          el("div", { className: "table-passenger" }, [
            formatDate(trip.fecha),
            el("span", { text: trip.horaSalida }),
          ]),
        ),
        ...(!recent
          ? [
              cell(String(reservation.asiento).padStart(2, "0")),
              cell(money(reservation.precio)),
            ]
          : []),
        cell(badge(reservation.estado)),
        cell(reservationActions(reservation)),
      ]);
    }),
    recent ? "Últimas cinco reservas" : "Reservas y acciones administrativas",
  );
}
function renderDashboard() {
  const stats = getStatistics();
  const definitions = [
    ["Total de reservas", stats.total, "Todas las solicitudes", "▧", true],
    ["Pendientes", stats.pendiente, "Por revisar", "◷"],
    ["Confirmadas", stats.confirmada, "Listas para viajar", "✓"],
    ["Anuladas", stats.anulada, "Asientos liberados", "⊘"],
    ["Viajes disponibles", stats.viajes, "Futuros y con asientos", "↗"],
  ];
  $("#stats-grid").replaceChildren(
    ...definitions.map(([label, value, note, icon, primary]) =>
      el(
        "article",
        { className: `stat-card${primary ? " stat-card--primary" : ""}` },
        [
          el("div", { className: "stat-card__label" }, [
            label,
            el("span", {
              className: "stat-card__icon",
              "aria-hidden": "true",
              text: icon,
            }),
          ]),
          el("strong", { text: value, "data-stat": label }),
          el("span", { className: "stat-card__note", text: note }),
        ],
      ),
    ),
  );
  const reservations = getReservations().sort((a, b) =>
    b.fechaReserva.localeCompare(a.fechaReserva),
  );
  $("#sidebar-count").textContent = String(stats.pendiente);
  $("#recent-reservations").replaceChildren(
    renderReservationTable(reservations.slice(0, 5), true),
  );
}
function renderTrips() {
  const values = Object.fromEntries(new FormData($("#trip-filters")));
  const query = values.query.trim().toLocaleLowerCase("es-PE");
  const trips = getTripOverview()
    .filter(
      (trip) =>
        (!values.fecha || trip.fecha === values.fecha) &&
        (values.period === "all" || isUpcoming(trip)) &&
        `${trip.id} ${trip.origen} ${trip.destino}`
          .toLocaleLowerCase("es-PE")
          .includes(query),
    )
    .sort((a, b) =>
      `${a.fecha}${a.horaSalida}`.localeCompare(`${b.fecha}${b.horaSalida}`),
    );
  $("#trip-count").textContent =
    `${trips.length} ${trips.length === 1 ? "viaje encontrado" : "viajes encontrados"}`;
  if (!trips.length) {
    $("#trips-table").replaceChildren(
      emptyState(
        "No encontramos viajes",
        "Prueba otra ruta o fecha, o limpia los filtros.",
      ),
    );
    return;
  }
  $("#trips-table").replaceChildren(
    table(
      [
        "Código",
        "Origen",
        "Destino",
        "Fecha",
        "Hora",
        "Precio",
        "Capacidad",
        "Reservados",
        "Disponibles",
        "Acciones",
      ],
      trips.map((trip) => {
        const occupied = trip.reservados;
        return el("tr", {}, [
          cell(trip.codigo || trip.id, "code"),
          cell(trip.origen),
          cell(trip.destino),
          cell(formatDate(trip.fecha)),
          cell(trip.horaSalida),
          cell(money(trip.precio)),
          cell(trip.capacidad),
          cell(
            el("div", { className: "occupation" }, [
              el("progress", {
                max: trip.capacidad,
                value: occupied,
                "aria-label": `${occupied} de ${trip.capacidad} asientos ocupados`,
              }),
              `${occupied}`,
            ]),
          ),
          cell(trip.capacidad - occupied),
          cell(
            el(
              "button",
              {
                type: "button",
                className: "btn btn--text",
                "aria-label": `Ver ocupación del viaje ${trip.id}`,
                onclick: safely(() => openTrip(trip.id)),
              },
              "Ver ocupación ↗",
            ),
          ),
        ]);
      }),
      "Viajes precargados y disponibilidad de asientos",
    ),
  );
}
function renderReservations() {
  const values = Object.fromEntries(new FormData($("#reservation-filters")));
  const query = values.query.trim().toLocaleLowerCase("es-PE");
  const reservations = getReservations()
    .filter((reservation) => {
      const trip = getTrip(reservation.viajeId);
      return (
        (!values.estado || reservation.estado === values.estado) &&
        `${reservation.codigo} ${reservation.pasajero.nombres} ${reservation.pasajero.apellidos} ${reservation.pasajero.numeroDocumento} ${trip.origen} ${trip.destino}`
          .toLocaleLowerCase("es-PE")
          .includes(query)
      );
    })
    .sort((a, b) => b.fechaReserva.localeCompare(a.fechaReserva));
  $("#reservation-count").textContent =
    `${reservations.length} ${reservations.length === 1 ? "reserva encontrada" : "reservas encontradas"}`;
  $("#reservations-table").replaceChildren(
    renderReservationTable(reservations),
  );
}
function renderTripDetail(id) {
  const trip = getTrip(id);
  if (!trip) {
    $("#detail-content").replaceChildren(
      emptyState("Viaje no disponible", "La información del servidor cambió."),
    );
    return;
  }
  const occupied = getOccupiedSeats(id);
  $("#detail-title").textContent = "Detalle del viaje";
  detailDialog.classList.add("detail-dialog--trip");
  const grid = el(
    "div",
    {
      className: "seat-grid",
      role: "group",
      "aria-label": "Ocupación del bus, solo lectura",
    },
    Array.from({ length: trip.capacidad }, (_, index) =>
      el(
        "button",
        {
          type: "button",
          className: "seat",
          disabled: occupied.has(index + 1),
          "aria-label": `Asiento ${index + 1}, ${occupied.has(index + 1) ? "ocupado" : "disponible"}, solo lectura`,
          tabindex: "-1",
        },
        index + 1,
      ),
    ),
  );
  $("#detail-content").replaceChildren(
    definitionList([
      ["Código", trip.id],
      ["Ruta", `${trip.origen} → ${trip.destino}`],
      ["Salida", `${formatDate(trip.fecha)} · ${trip.horaSalida}`],
      ["Llegada", `${formatDate(trip.fechaLlegada)} · ${trip.horaLlegada}`],
      ["Servicio", trip.servicio],
      ["Precio", money(trip.precio)],
      [
        "Ocupación",
        `${occupied.size} ocupados · ${getAvailability(id)} disponibles`,
      ],
    ]),
    el("p", {
      className: "small muted",
      text: "La ocupación incluye los asientos iniciales de demostración y las reservas pendientes o confirmadas.",
    }),
    el("div", { className: "seat-selector" }, [
      el("span", {
        className: "small muted",
        text: "Frente del bus · Conductor ↗",
      }),
      grid,
      el("div", { className: "seat-legend" }, [
        el("span", {}, [
          el("i", { className: "swatch", "aria-hidden": "true" }),
          "Disponible",
        ]),
        el("span", {}, [
          el("i", {
            className: "swatch swatch--occupied",
            "aria-hidden": "true",
          }),
          "Ocupado",
        ]),
      ]),
    ]),
  );
  $("#detail-actions").replaceChildren();
}
function renderReservationDetail(id) {
  const reservation = getReservations().find((r) => r.id === id);
  detailDialog.classList.remove("detail-dialog--trip");
  if (!reservation) {
    $("#detail-content").replaceChildren(
      emptyState("Reserva no disponible", "La información del servidor cambió."),
    );
    $("#detail-actions").replaceChildren();
    return;
  }
  const trip = getTrip(reservation.viajeId);
  $("#detail-title").textContent = "Detalle de la reserva";
  $("#detail-content").replaceChildren(
    badge(reservation.estado),
    definitionList([
      ["Código", reservation.codigo],
      [
        "Pasajero",
        `${reservation.pasajero.nombres} ${reservation.pasajero.apellidos}`,
      ],
      [
        reservation.pasajero.tipoDocumento,
        reservation.pasajero.numeroDocumento,
      ],
      ["Celular", reservation.pasajero.telefono],
      ["Correo", reservation.pasajero.correo],
      ["Ruta", `${trip.origen} → ${trip.destino}`],
      ["Salida", `${formatDate(trip.fecha)} · ${trip.horaSalida}`],
      ["Asiento", reservation.asiento],
      ["Precio", money(reservation.precio)],
      [
        "Registrada",
        new Intl.DateTimeFormat("es-PE", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(reservation.fechaReserva)),
      ],
    ]),
  );
  $("#detail-actions").replaceChildren(reservationActions(reservation, false));
}
function openTrip(id) {
  detail = { type: "trip", id };
  renderTripDetail(id);
  detailDialog.showModal();
}
function openReservation(id) {
  detail = { type: "reservation", id };
  renderReservationDetail(id);
  detailDialog.showModal();
}
function askAction(id, status) {
  const reservation = getReservations().find((r) => r.id === id);
  if (!reservation) throw new Error("La reserva ya no existe.");
  pendingAction = { id, status };
  const cancel = status === "anulada";
  $("#action-title").textContent = cancel
    ? "¿Anular esta reserva?"
    : "¿Confirmar esta reserva?";
  $("#action-description").textContent = cancel
    ? "El asiento se liberará para nuevas reservas. Una reserva anulada no puede volver a confirmarse."
    : "La reserva pasará a confirmada y conservará su asiento. Esta acción no registra un pago.";
  $("#action-summary").replaceChildren(
    definitionList([
      ["Código", reservation.codigo],
      [
        "Pasajero",
        `${reservation.pasajero.nombres} ${reservation.pasajero.apellidos}`,
      ],
      ["Asiento", reservation.asiento],
      ["Estado actual", badge(reservation.estado)],
    ]),
  );
  $("#apply-action").className =
    `btn ${cancel ? "btn--danger" : "btn--primary"}`;
  $("#apply-action").textContent = cancel
    ? "Sí, anular reserva"
    : "Sí, confirmar reserva";
  setMessage($("#action-error"), "");
  actionDialog.showModal();
}
async function applyAction() {
  if (applying || !pendingAction) return;
  applying = true;
  $("#apply-action").disabled = true;
  try {
    const { id, status } = pendingAction;
    const reservation = await updateReservationStatus(id, status);
    actionDialog.close();
    pendingAction = null;
    setMessage(
      $("#admin-notice"),
      `Reserva ${reservation.codigo} ${status}. ${status === "anulada" ? "El asiento fue liberado." : "El asiento se mantiene reservado."}`,
      "success",
    );
  } catch (error) {
    setMessage($("#action-error"), error.message);
  } finally {
    applying = false;
    $("#apply-action").disabled = false;
  }
}
function refresh() {
  renderDashboard();
  renderTrips();
  renderReservations();
  if (detail && detailDialog.open) {
    if (detail.type === "trip") renderTripDetail(detail.id);
    else renderReservationDetail(detail.id);
  }
}
try {
  await initializeStorage('admin');
  const usuario = getUsuario();
  $('#session-username').textContent = usuario.username;
  $('#session-role').textContent = usuario.rol;
  document.querySelectorAll('.profile-avatar').forEach(avatar => {
    avatar.textContent = usuario.username.slice(0, 2).toUpperCase();
    avatar.setAttribute('aria-label', usuario.username);
  });
  $('#logout-button').addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try { await cerrarSesion(); }
    catch (error) { setMessage($('#admin-notice'), error.message); $('#logout-button').disabled = false; }
  });
  let ultimaActividad = 0;
  const registrarActividad = () => {
    if (Date.now() - ultimaActividad < 60000) return;
    ultimaActividad = Date.now();
    renovarActividad().catch(error => setMessage($('#admin-notice'), error.message));
  };
  window.addEventListener('pointerdown', registrarActividad);
  window.addEventListener('keydown', registrarActividad);
  window.addEventListener('pageshow', async event => {
    if (!event.persisted) return;
    $('.admin-layout').hidden = true;
    try {
      if (await consultarSesion()) $('.admin-layout').hidden = false;
      else irAlLogin();
    } catch { irAlLogin(); }
  });
  $("#header-date").textContent = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  refresh();
  route();
  window.addEventListener("hashchange", safely(route));
  subscribe(safely(refresh), error => setMessage($('#admin-notice'), error.message));
  $(".dashboard-banner a").addEventListener(
    "click",
    safely(() => {
      $("#reservation-query").value = "";
      $("#reservation-status").value = "pendiente";
      renderReservations();
    }),
  );
  for (const [id, render] of [
    ["trip-filters", renderTrips],
    ["reservation-filters", renderReservations],
  ]) {
    const form = $(`#${id}`);
    form.addEventListener("submit", (event) => event.preventDefault());
    form.addEventListener("input", safely(render));
    form.addEventListener("reset", () => requestAnimationFrame(safely(render)));
  }
  $("#close-detail").addEventListener("click", () => detailDialog.close());
  detailDialog.addEventListener("close", () => {
    detail = null;
  });
  $("#dismiss-action").addEventListener("click", () => {
    if (!applying) actionDialog.close();
  });
  actionDialog.addEventListener("cancel", (event) => {
    if (applying) event.preventDefault();
  });
  $("#apply-action").addEventListener("click", applyAction);
} catch (error) {
  setMessage($("#admin-notice"), error.message);
}
