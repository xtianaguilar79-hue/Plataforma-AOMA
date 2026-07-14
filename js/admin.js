"use strict";

const logoutButton = document.getElementById("logoutButton");
const reloadButton = document.getElementById("reloadButton");

const adminName = document.getElementById("adminName");
const adminAvatar = document.getElementById("adminAvatar");

const pendingCount = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");
const totalCount = document.getElementById("totalCount");

const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const usersContainer = document.getElementById("usersContainer");
const pageMessage = document.getElementById("pageMessage");

document.addEventListener("DOMContentLoaded", iniciarPanel);
logoutButton.addEventListener("click", cerrarSesion);
reloadButton.addEventListener("click", cargarDatos);

async function iniciarPanel() {
    limpiarMensaje();

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session?.user) {
        window.location.replace("index.html");
        return;
    }

    const perfil = await obtenerPerfilAdministrador(session.user.id);

    if (!perfil) {
        await supabaseClient.auth.signOut();
        window.location.replace("index.html");
        return;
    }

    mostrarAdministrador(perfil);
    await cargarDatos();
}

async function obtenerPerfilAdministrador(userId) {
    const {
        data,
        error
    } = await supabaseClient
        .from("usuarios")
        .select("id, nombre, apellido, rol, estado, activo")
        .eq("id", userId)
        .maybeSingle();

    if (error || !data) {
        console.error("No se pudo consultar el perfil:", error);
        return null;
    }

    const rol = normalizar(data.rol);
    const estado = normalizar(data.estado);

    const esAdmin =
        rol === "administrador" ||
        rol === "admin";

    const estaHabilitado =
        estado === "aprobado" &&
        data.activo !== false;

    if (!esAdmin || !estaHabilitado) {
        return null;
    }

    return data;
}

function mostrarAdministrador(perfil) {
    const nombreCompleto = [
        perfil.nombre,
        perfil.apellido
    ]
        .filter(Boolean)
        .join(" ");

    adminName.textContent = nombreCompleto || "Administrador";

    adminAvatar.textContent = obtenerIniciales(
        nombreCompleto || "Administrador"
    );
}

async function cargarDatos() {
    limpiarMensaje();
    mostrarCarga(true);

    const {
        data,
        error
    } = await supabaseClient
        .from("usuarios")
        .select(`
            id,
            nombre,
            apellido,
            dni,
            telefono,
            mail,
            rol,
            empresa,
            convenio,
            estado,
            activo,
            created_at
        `)
        .order("created_at", {
            ascending: false
        });

    mostrarCarga(false);

    if (error) {
        console.error("No se pudieron cargar los usuarios:", error);

        mostrarMensaje(
            "No se pudieron cargar los usuarios. Revisá los permisos de Supabase.",
            "error"
        );

        return;
    }

    const usuarios = data || [];

    actualizarResumen(usuarios);

    const pendientes = usuarios.filter(
        usuario => normalizar(usuario.estado) === "pendiente"
    );

    renderizarPendientes(pendientes);
}

function actualizarResumen(usuarios) {
    const pendientes = usuarios.filter(
        usuario => normalizar(usuario.estado) === "pendiente"
    ).length;

    const aprobados = usuarios.filter(
        usuario => normalizar(usuario.estado) === "aprobado"
    ).length;

    pendingCount.textContent = pendientes;
    approvedCount.textContent = aprobados;
    totalCount.textContent = usuarios.length;
}

function renderizarPendientes(usuarios) {
    usersContainer.innerHTML = "";

    if (usuarios.length === 0) {
        emptyState.classList.remove("hidden");
        usersContainer.classList.add("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    usersContainer.classList.remove("hidden");

    usuarios.forEach(usuario => {
        const card = document.createElement("article");
        card.className = "user-card";

        card.innerHTML = `
            <div class="user-primary">
                <strong>${escaparHtml(obtenerNombreCompleto(usuario))}</strong>
                <span>${escaparHtml(usuario.mail || "Sin correo")}</span>
            </div>

            <div class="user-detail">
                <strong>DNI</strong>
                <span>${escaparHtml(usuario.dni || "Sin informar")}</span>
            </div>

            <div class="user-detail">
                <strong>Rol solicitado</strong>
                <span>${escaparHtml(usuario.rol || "Sin asignar")}</span>
            </div>

            <div class="user-detail">
                <strong>Empresa</strong>
                <span>${escaparHtml(usuario.empresa || "Sin asignar")}</span>
            </div>

            <div class="user-detail">
                <strong>Convenio</strong>
                <span>${escaparHtml(usuario.convenio || "Sin asignar")}</span>
            </div>

            <div class="user-actions">
                <button
                    type="button"
                    class="action-button approve"
                    data-action="aprobar"
                    data-user-id="${usuario.id}"
                >
                    <i class="fa-solid fa-check"></i>
                    Aprobar
                </button>

                <button
                    type="button"
                    class="action-button reject"
                    data-action="rechazar"
                    data-user-id="${usuario.id}"
                >
                    <i class="fa-solid fa-xmark"></i>
                    Rechazar
                </button>
            </div>
        `;

        usersContainer.appendChild(card);
    });

    usersContainer
        .querySelectorAll("[data-action]")
        .forEach(button => {
            button.addEventListener("click", procesarAccionUsuario);
        });
}

async function procesarAccionUsuario(event) {
    const button = event.currentTarget;
    const userId = button.dataset.userId;
    const accion = button.dataset.action;

    const nuevoEstado =
        accion === "aprobar"
            ? "Aprobado"
            : "Rechazado";

    const confirmar = window.confirm(
        accion === "aprobar"
            ? "¿Deseás aprobar esta solicitud?"
            : "¿Deseás rechazar esta solicitud?"
    );

    if (!confirmar) {
        return;
    }

    bloquearBotonesUsuario(userId, true);

    const {
        error
    } = await supabaseClient
        .from("usuarios")
        .update({
            estado: nuevoEstado,
            activo: accion === "aprobar",
            updated_at: new Date().toISOString()
        })
        .eq("id", userId);

    if (error) {
        console.error("No se pudo actualizar el usuario:", error);

        mostrarMensaje(
            "No se pudo actualizar la solicitud.",
            "error"
        );

        bloquearBotonesUsuario(userId, false);
        return;
    }

    mostrarMensaje(
        accion === "aprobar"
            ? "Usuario aprobado correctamente."
            : "Solicitud rechazada correctamente.",
        "success"
    );

    await cargarDatos();
}

function bloquearBotonesUsuario(userId, bloquear) {
    usersContainer
        .querySelectorAll(`[data-user-id="${userId}"]`)
        .forEach(button => {
            button.disabled = bloquear;
        });
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    window.location.replace("index.html");
}

function mostrarCarga(mostrar) {
    loadingState.classList.toggle("hidden", !mostrar);

    if (mostrar) {
        usersContainer.classList.add("hidden");
        emptyState.classList.add("hidden");
    }
}

function mostrarMensaje(texto, tipo) {
    pageMessage.textContent = texto;
    pageMessage.className = `page-message ${tipo}`;
}

function limpiarMensaje() {
    pageMessage.textContent = "";
    pageMessage.className = "page-message hidden";
}

function obtenerNombreCompleto(usuario) {
    return [
        usuario.nombre,
        usuario.apellido
    ]
        .filter(Boolean)
        .join(" ") || "Usuario sin nombre";
}

function obtenerIniciales(nombre) {
    return nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte.charAt(0).toUpperCase())
        .join("");
}

function normalizar(valor) {
    return String(valor ?? "")
        .trim()
        .toLowerCase();
}

function escaparHtml(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}