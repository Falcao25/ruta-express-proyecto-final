<?php
require_once dirname(__DIR__) . '/api/autenticacion.php';
protegerPaginaAdmin();
?>
<!doctype html>
<html lang="es-PE">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="Panel de gestión de viajes y reservas de Ruta Express. Demostración universitaria local."
    />
    <title>Administración · Ruta Express</title>
    <link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="../shared/css/reset.css" />
    <link rel="stylesheet" href="../shared/css/tokens.css" />
    <link rel="stylesheet" href="../shared/css/layout.css" />
    <link rel="stylesheet" href="../shared/css/utilities.css" />
    <link rel="stylesheet" href="../shared/css/components.css" />
    <link rel="stylesheet" href="css/admin.css" />
    <script type="module" src="js/admin.js"></script>
  </head>
  <body>
    <a class="skip-link btn btn--primary" href="#admin-main"
      >Saltar al contenido</a
    >
    <div class="admin-layout">
      <aside class="admin-sidebar" aria-label="Panel de administración">
        <a href="#dashboard" class="brand"
          ><span class="brand__mark" aria-hidden="true">r↗</span
          ><span>ruta<span class="brand__suffix">express</span>.</span></a
        >
        <div class="sidebar-workspace">
          <span class="workspace-avatar" aria-hidden="true">RE</span>
          <div class="flex-col">
            <strong>Gestión de operaciones</strong
            ><span>Entorno de demostración</span>
          </div>
        </div>
        <div class="sidebar-navigation">
          <span class="eyebrow sidebar-label">Principal</span>
          <nav class="admin-nav" aria-label="Navegación administrativa">
            <a href="#dashboard" data-view="dashboard" aria-current="page"
              ><span aria-hidden="true">▦</span>Dashboard</a
            ><a href="#viajes" data-view="viajes"
              ><span aria-hidden="true">▤</span>Viajes</a
            ><a href="#reservas" data-view="reservas"
              ><span aria-hidden="true">▧</span>Reservas<span
                class="nav-count"
                id="sidebar-count"
                >0</span
              ></a
            >
          </nav>
        </div>
        <div class="sidebar-bottom">
          <a class="sidebar-public" href="../cliente/index.html"
            >Ir a la web del cliente <span aria-hidden="true">↗</span></a
          >
          <div class="sidebar-profile">
            <span class="profile-avatar" aria-hidden="true">AD</span>
            <div class="flex-col">
              <strong id="session-username">Administrador</strong
              ><span id="session-role">Sesión administrativa</span>
            </div>
          </div>
          <button id="logout-button" class="btn btn--secondary full-width" type="button">Cerrar sesión</button>
        </div>
      </aside>
      <div class="admin-workspace">
        <header class="admin-header">
          <div class="admin-breadcrumb">
            Operaciones <span aria-hidden="true">/</span>
            <strong id="breadcrumb-current">Dashboard</strong>
          </div>
          <div class="admin-header__right">
            <span id="header-date" class="small muted"></span
            ><span
              class="profile-avatar"
              aria-label="Usuario conectado"
              >AD</span
            >
          </div>
        </header>
        <main id="admin-main" class="admin-main">
          <div id="admin-notice" role="alert" hidden></div>
          <section
            id="dashboard-view"
            class="stack"
            aria-labelledby="dashboard-title"
          >
            <div class="section-heading">
              <div>
                <span class="eyebrow muted">Cada viaje cuenta</span>
                <h1 id="dashboard-title" tabindex="-1">
                  Una vista de tu operación
                </h1>
                <p class="muted small">
                  Tus reservas y próximas salidas, en un solo lugar.
                </p>
              </div>
              <a href="#reservas" class="btn btn--primary"
                >Gestionar reservas <span aria-hidden="true">→</span></a
              >
            </div>
            <div id="stats-grid" class="stats-grid" aria-live="polite"></div>
            <div class="dashboard-banner">
              <div class="stack gap-2">
                <span class="eyebrow">Todo listo para el próximo destino</span>
                <h2>Un buen viaje empieza con una reserva.</h2>
                <p>
                  Revisa las solicitudes pendientes y ayuda a tus pasajeros a
                  seguir su camino.
                </p>
              </div>
              <a href="#reservas" class="btn btn--accent"
                >Revisar pendientes →</a
              >
            </div>
            <section class="stack" aria-labelledby="recent-title">
              <div class="section-heading">
                <div>
                  <h2 id="recent-title">Últimas reservas</h2>
                  <p class="small muted">
                    Las 5 solicitudes más recientes de tus pasajeros.
                  </p>
                </div>
                <a href="#reservas" class="btn btn--text"
                  >Ver todas las reservas ↗</a
                >
              </div>
              <div id="recent-reservations"></div>
            </section>
            <div class="admin-footnote">
              <span aria-hidden="true">ⓘ</span>
              <p>
                Demostración local con PHP y MySQL. La información se actualiza
                cada 5 segundos. No se procesan pagos.
              </p>
            </div>
          </section>
          <section
            id="viajes-view"
            class="stack"
            aria-labelledby="trips-title"
            hidden
          >
            <div class="section-heading">
              <div>
                <span class="eyebrow muted">Conectamos el Perú</span>
                <h1 id="trips-title" tabindex="-1">Viajes programados</h1>
                <p class="muted small">
                  Programa salidas, actualiza sus datos y consulta la ocupación de cada bus.
                </p>
              </div>
              <button id="new-trip" type="button" class="btn btn--primary">+ Nuevo viaje</button>
            </div>
            <form
              id="trip-filters"
              class="filter-bar"
              role="search"
              aria-label="Filtrar viajes"
            >
              <div class="field filter-bar__search">
                <label for="trip-query">Buscar ruta o código</label
                ><input
                  type="search"
                  id="trip-query"
                  name="query"
                  placeholder="Ej. Piura, Lima o V-…"
                  maxlength="80"
                />
              </div>
              <div class="field">
                <label for="trip-date">Fecha de salida</label
                ><input type="date" id="trip-date" name="fecha" />
              </div>
              <div class="field">
                <label for="trip-period">Mostrar</label
                ><select id="trip-period" name="period">
                  <option value="future">Próximas salidas</option>
                  <option value="all">Todos los viajes</option>
                </select>
              </div>
              <button class="btn btn--secondary" type="reset">
                Limpiar filtros
              </button>
            </form>
            <p class="small muted" id="trip-count" role="status"></p>
            <div id="trips-table"></div>
          </section>
          <section
            id="reservas-view"
            class="stack"
            aria-labelledby="reservations-title"
            hidden
          >
            <div class="section-heading">
              <div>
                <span class="eyebrow muted">Acompaña cada viaje</span>
                <h1 id="reservations-title" tabindex="-1">
                  Gestión de reservas
                </h1>
                <p class="muted small">
                  Consulta, confirma o cancela las reservas de tus pasajeros.
                </p>
              </div>
              <a href="../cliente/index.html" class="btn btn--secondary"
                >Abrir web del cliente ↗</a
              >
            </div>
            <form
              id="reservation-filters"
              class="filter-bar"
              role="search"
              aria-label="Filtrar reservas"
            >
              <div class="field filter-bar__search">
                <label for="reservation-query">Buscar reserva</label
                ><input
                  type="search"
                  id="reservation-query"
                  name="query"
                  placeholder="Código, pasajero, documento o ruta"
                  maxlength="80"
                />
              </div>
              <div class="field">
                <label for="reservation-status">Estado</label
                ><select id="reservation-status" name="estado">
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="anulada">Anulada</option>
                </select>
              </div>
              <button class="btn btn--secondary" type="reset">
                Limpiar filtros
              </button>
            </form>
            <p id="reservation-count" class="small muted" role="status"></p>
            <div id="reservations-table"></div>
          </section>
        </main>
      </div>
    </div>
    <dialog id="trip-form-dialog" class="dialog trip-form-dialog" aria-labelledby="trip-form-title">
      <div class="dialog__body">
        <div class="dialog__header"><h2 id="trip-form-title">Programar un nuevo viaje</h2><button id="trip-close" class="btn btn--text" type="button" aria-label="Cerrar formulario de viaje">✕</button></div>
        <p class="muted small">Completa la salida con una ruta y un vehículo registrados. Los horarios corresponden a Perú. Todos los campos son obligatorios.</p>
        <p id="trip-protection-note" class="alert" hidden>Este viaje tiene reservas activas. Solo se puede cambiar el precio para nuevas reservas; las reservas existentes conservan su tarifa.</p>
        <div id="trip-form-error" role="alert" hidden></div>
        <form id="trip-form" class="stack" novalidate>
          <fieldset id="trip-fields" class="trip-form-fields">
            <legend class="sr-only">Datos del viaje</legend>
            <div class="field"><label for="trip-route">Ruta</label><select id="trip-route" name="rutaID" required aria-describedby="trip-route-error"><option value="">Selecciona una ruta</option></select><span id="trip-route-error" class="field-error"></span></div>
            <div class="field"><label for="trip-vehicle">Vehículo</label><select id="trip-vehicle" name="vehiculoID" required aria-describedby="trip-vehicle-error trip-capacity"><option value="">Selecciona un vehículo</option></select><span id="trip-vehicle-error" class="field-error"></span><span id="trip-capacity" class="small muted">La capacidad se toma del vehículo seleccionado.</span></div>
            <div class="form-row">
              <div class="field"><label for="trip-departure">Fecha y hora de salida</label><input id="trip-departure" name="fechaSalida" type="datetime-local" step="60" required aria-describedby="trip-departure-error"><span id="trip-departure-error" class="field-error"></span></div>
              <div class="field"><label for="trip-arrival">Llegada estimada</label><input id="trip-arrival" name="fechaLlegada" type="datetime-local" step="60" required aria-describedby="trip-arrival-error"><span id="trip-arrival-error" class="field-error"></span></div>
            </div>
            <div class="form-row">
              <div class="field"><label for="trip-service">Tipo de servicio</label><select id="trip-service" name="servicio" required aria-describedby="trip-service-error"><option value="Semi cama">Semi cama</option><option value="Cama ejecutivo">Cama ejecutivo</option></select><span id="trip-service-error" class="field-error"></span></div>
              <div class="field"><label for="trip-price">Precio por asiento (S/)</label><input id="trip-price" name="precio" type="number" min="0.01" max="999999.99" step="0.01" inputmode="decimal" placeholder="Ej. 65.00" required aria-describedby="trip-price-error"><span id="trip-price-error" class="field-error"></span></div>
            </div>
          </fieldset>
          <p class="muted small">El viaje se registra como Programado. El mismo bus no puede tener dos viajes con horarios superpuestos.</p>
          <div class="actions"><button id="trip-save" class="btn btn--primary" type="submit">Crear viaje</button><button id="trip-cancel" class="btn btn--secondary" type="button">Cancelar</button></div>
        </form>
      </div>
    </dialog>
    <dialog id="detail-dialog" class="dialog" aria-labelledby="detail-title">
      <div class="dialog__body">
        <div class="dialog__header">
          <h2 id="detail-title">Detalle</h2>
          <button
            type="button"
            class="btn btn--text"
            id="close-detail"
            aria-label="Cerrar detalle"
          >
            ✕
          </button>
        </div>
        <div id="detail-content" class="stack"></div>
        <div id="detail-actions" class="actions"></div>
      </div>
    </dialog>
    <dialog id="action-dialog" class="dialog" aria-labelledby="action-title">
      <div class="dialog__body">
        <h2 id="action-title">Confirmar acción</h2>
        <p id="action-description" class="muted"></p>
        <div id="action-summary"></div>
        <div id="action-error" role="alert" hidden></div>
        <div class="actions">
          <button type="button" id="apply-action" class="btn btn--primary">
            Confirmar</button
          ><button
            type="button"
            id="dismiss-action"
            class="btn btn--secondary"
            autofocus
          >
            Volver
          </button>
        </div>
      </div>
    </dialog>
    <noscript
      ><p class="alert alert--error">
        Activa JavaScript para consultar y gestionar reservas.
      </p></noscript
    >
  </body>
</html>
