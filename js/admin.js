"use strict";

const logoutButton = document.getElementById("logoutButton");
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");

const adminName = document.getElementById("adminName");
const adminAvatar = document.getElementById("adminAvatar");
const pageTitle = document.getElementById("pageTitle");
const pageMessage = document.getElementById("pageMessage");
const loadingOverlay = document.getElementById("loadingOverlay");

const pendingCount = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");
const blockedCount = document.getElementById("blockedCount");
const totalCount = document.getElementById("totalCount");
const sidebarPendingBadge = document.getElementById("sidebarPendingBadge");

const pendingView = document.getElementById("pendingView");
const usersView = document.getElementById("usersView");
const companiesView = document.getElementById("companiesView");
const agreementsView = document.getElementById("agreementsView");

const pendingUsersContainer = document.getElementById("pendingUsersContainer");
const pendingEmptyState = document.getElementById("pendingEmptyState");
const usersTableBody = document.getElementById("usersTableBody");
const usersEmptyState = document.getElementById("usersEmptyState");
const companiesContainer = document.getElementById("companiesContainer");
const agreementsContainer = document.getElementById("agreementsContainer");

const userSearch = document.getElementById("userSearch");
const statusFilter = document.getElementById("statusFilter");
const roleFilter = document.getElementById("roleFilter");

const editModal = document.getElementById("editModal");
const closeModalButton = document.getElementById("closeModalButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const editUserForm = document.getElementById("editUserForm");
const editUserId = document.getElementById("editUserId");
const editRole = document.getElementById("editRole");
const editStatus = document.getElementById("editStatus");
const editCompany = document.getElementById("editCompany");
const editAgreement = document.getElementById("editAgreement");
const editActive = document.getElementById("editActive");
const modalAvatar = document.getElementById("modalAvatar");
const modalUserName = document.getElementById("modalUserName");
const modalUserEmail = document.getElementById("modalUserEmail");
const saveUserButton = document.getElementById("saveUserButton");

let currentAdmin = null;
let users = [];
let companies = [];
let agreements = [];

function assertRequiredElements() {
    const required = {
        logoutButton,
        menuButton,
        sidebar,
        adminName,
        adminAvatar,
        pageTitle,
        pageMessage,
        loadingOverlay,
        pendingCount,
        approvedCount,
        blockedCount,
        totalCount,
        sidebarPendingBadge,
        pendingView,
        usersView,
        companiesView,
        agreementsView,
        pendingUsersContainer,
        pendingEmptyState,
        usersTableBody,
        usersEmptyState,
        companiesContainer,
        agreementsContainer,
        userSearch,
        statusFilter,
        roleFilter,
        editModal,
        closeModalButton,
        cancelEditButton,
        editUserForm,
        editUserId,
        editRole,
        editStatus,
        editCompany,
        editAgreement,
        editActive,
        modalAvatar,
        modalUserName,
        modalUserEmail,
        saveUserButton
    };

    const missing = Object.entries(required)
        .filter(([, value]) => !value)
        .map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(`Faltan elementos requeridos en admin.html: ${missing.join(", ")}`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    try {
        assertRequiredElements();
        configurarEventos();
        iniciarPanel();
    } catch (error) {
        console.error("No se pudo iniciar el panel administrativo:", error);
        document.body.innerHTML = `
            <main style="font-family:Arial,sans-serif;padding:32px;max-width:760px;margin:auto">
                <h1>Error de configuración</h1>
                <p>El panel administrativo no pudo iniciarse.</p>
                <pre style="white-space:pre-wrap;background:#f4f4f4;padding:16px;border-radius:8px">${escaparHtml(error.message)}</pre>
            </main>
        `;
    }
});

function configurarEventos() {
    logoutButton.addEventListener("click", cerrarSesion);
    menuButton.addEventListener("click", alternarMenu);

    document.querySelectorAll("[data-view]").forEach(button => {
        button.addEventListener("click", () => mostrarVista(button.dataset.view));
    });

    document.querySelectorAll("[data-reload]").forEach(button => {
        button.addEventListener("click", cargarDatos);
    });

    userSearch.addEventListener("input", renderizarTablaUsuarios);
    statusFilter.addEventListener("change", renderizarTablaUsuarios);
    roleFilter.addEventListener("change", renderizarTablaUsuarios);

    closeModalButton.addEventListener("click", cerrarModal);
    cancelEditButton.addEventListener("click", cerrarModal);
    editUserForm.addEventListener("submit", guardarUsuario);

    editModal.addEventListener("click", event => {
        if (event.target === editModal) cerrarModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") cerrarModal();
    });
}

async function iniciarPanel() {
    limpiarMensaje();
    mostrarCarga(true);

    try {
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

        currentAdmin = perfil;
        mostrarAdministrador(perfil);
        await cargarDatos();
        mostrarVista("pendientes");
    } catch (error) {
        console.error("Error al iniciar el panel:", error);
        mostrarMensaje("No se pudo iniciar el panel administrativo.", "error");
    } finally {
        mostrarCarga(false);
    }
}

async function obtenerPerfilAdministrador(userId) {
    const { data, error } = await supabaseClient
        .from("usuarios")
        .select("id, nombre, apellido, rol, estado, activo")
        .eq("id", userId)
        .maybeSingle();

    if (error || !data) {
        console.error("No se pudo consultar el administrador:", error);
        return null;
    }

    const rol = normalizar(data.rol);
    const estado = normalizar(data.estado);
    const autorizado =
        (rol === "administrador" || rol === "admin") &&
        estado === "aprobado" &&
        data.activo !== false;

    return autorizado ? data : null;
}

async function cargarDatos() {
    limpiarMensaje();
    mostrarCarga(true);

    try {
        const [usuariosResultado, empresasResultado, conveniosResultado] = await Promise.all([
            supabaseClient
                .from("usuarios")
                .select("id,nombre,apellido,dni,telefono,mail,rol,empresa,convenio,estado,activo,created_at,updated_at")
                .order("created_at", { ascending: false }),
            supabaseClient
                .from("empresas")
                .select("id,nombre,activa")
                .order("nombre"),
            supabaseClient
                .from("convenios")
                .select("id,nombre,activo")
                .order("nombre")
        ]);

        if (usuariosResultado.error) throw usuariosResultado.error;
        if (empresasResultado.error) throw empresasResultado.error;
        if (conveniosResultado.error) throw conveniosResultado.error;

        users = usuariosResultado.data || [];
        companies = empresasResultado.data || [];
        agreements = conveniosResultado.data || [];

        actualizarResumen();
        cargarSelectsEdicion();
        renderizarPendientes();
        renderizarTablaUsuarios();
        renderizarCatalogos();
    } catch (error) {
        console.error("No se pudo cargar el panel:", error);
        mostrarMensaje("No se pudo cargar la información del panel. Revisá las políticas de Supabase.", "error");
    } finally {
        mostrarCarga(false);
    }
}

function mostrarAdministrador(perfil) {
    const nombreCompleto = obtenerNombreCompleto(perfil);
    adminName.textContent = nombreCompleto || "Administrador";
    adminAvatar.textContent = obtenerIniciales(nombreCompleto);
}

function actualizarResumen() {
    const pendientes = users.filter(u => normalizar(u.estado) === "pendiente").length;
    const aprobados = users.filter(u => normalizar(u.estado) === "aprobado" && u.activo !== false).length;
    const bloqueados = users.filter(u => normalizar(u.estado) === "bloqueado" || u.activo === false).length;

    pendingCount.textContent = String(pendientes);
    approvedCount.textContent = String(aprobados);
    blockedCount.textContent = String(bloqueados);
    totalCount.textContent = String(users.length);
    sidebarPendingBadge.textContent = String(pendientes);
}

function renderizarPendientes() {
    pendingUsersContainer.innerHTML = "";
    const pendientes = users.filter(u => normalizar(u.estado) === "pendiente");

    pendingEmptyState.classList.toggle("hidden", pendientes.length !== 0);

    pendientes.forEach(usuario => {
        const card = document.createElement("article");
        card.className = "request-card";
        card.innerHTML = `
            <div class="request-user">
                <div class="request-avatar">${escaparHtml(obtenerIniciales(obtenerNombreCompleto(usuario)))}</div>
                <div>
                    <strong>${escaparHtml(obtenerNombreCompleto(usuario))}</strong>
                    <span>${escaparHtml(usuario.mail || "Sin correo")}</span>
                </div>
            </div>
            <div class="request-data">
                <div><span>DNI</span><strong>${escaparHtml(usuario.dni || "Sin informar")}</strong></div>
                <div><span>Rol solicitado</span><strong>${escaparHtml(usuario.rol || "Sin asignar")}</strong></div>
                <div><span>Empresa</span><strong>${escaparHtml(usuario.empresa || "Sin asignar")}</strong></div>
                <div><span>Convenio</span><strong>${escaparHtml(usuario.convenio || "Sin asignar")}</strong></div>
            </div>
            <div class="request-actions">
                <button type="button" class="action-button edit" data-edit-user="${usuario.id}">
                    <i class="fa-solid fa-pen"></i> Revisar
                </button>
                <button type="button" class="action-button approve" data-approve-user="${usuario.id}">
                    <i class="fa-solid fa-check"></i> Aprobar
                </button>
                <button type="button" class="action-button reject" data-reject-user="${usuario.id}">
                    <i class="fa-solid fa-xmark"></i> Rechazar
                </button>
            </div>
        `;
        pendingUsersContainer.appendChild(card);
    });

    conectarAccionesUsuarios();
}

function renderizarTablaUsuarios() {
    usersTableBody.innerHTML = "";

    const busqueda = normalizar(userSearch.value);
    const estadoSeleccionado = normalizar(statusFilter.value);
    const rolSeleccionado = normalizar(roleFilter.value);

    const filtrados = users.filter(usuario => {
        const textoUsuario = normalizar([
            usuario.nombre,
            usuario.apellido,
            usuario.dni,
            usuario.mail,
            usuario.empresa,
            usuario.convenio
        ].join(" "));

        return (
            (!busqueda || textoUsuario.includes(busqueda)) &&
            (estadoSeleccionado === "todos" || normalizar(usuario.estado) === estadoSeleccionado) &&
            (rolSeleccionado === "todos" || normalizar(usuario.rol) === rolSeleccionado)
        );
    });

    usersEmptyState.classList.toggle("hidden", filtrados.length !== 0);

    filtrados.forEach(usuario => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="table-user">
                    <div class="table-avatar">${escaparHtml(obtenerIniciales(obtenerNombreCompleto(usuario)))}</div>
                    <div>
                        <strong>${escaparHtml(obtenerNombreCompleto(usuario))}</strong>
                        <span>${escaparHtml(usuario.mail || "Sin correo")}</span>
                    </div>
                </div>
            </td>
            <td>${escaparHtml(usuario.dni || "Sin informar")}</td>
            <td>${escaparHtml(usuario.rol || "Sin asignar")}</td>
            <td>${escaparHtml(usuario.empresa || "Sin asignar")}</td>
            <td>${crearBadgeEstado(usuario)}</td>
            <td>
                <button type="button" class="table-action" data-edit-user="${usuario.id}" title="Editar usuario">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="table-action ${usuario.activo === false ? "activate" : "block"}" data-toggle-user="${usuario.id}" title="${usuario.activo === false ? "Reactivar usuario" : "Bloquear usuario"}">
                    <i class="fa-solid ${usuario.activo === false ? "fa-user-check" : "fa-user-lock"}"></i>
                </button>
            </td>
        `;
        usersTableBody.appendChild(row);
    });

    conectarAccionesUsuarios();
}

function renderizarCatalogos() {
    companiesContainer.innerHTML = "";
    agreementsContainer.innerHTML = "";

    companies.forEach(empresa => {
        companiesContainer.appendChild(crearCatalogCard(empresa.nombre, empresa.activa, "fa-building"));
    });

    agreements.forEach(convenio => {
        agreementsContainer.appendChild(crearCatalogCard(convenio.nombre, convenio.activo, "fa-file-contract"));
    });
}

function crearCatalogCard(nombre, activo, icono) {
    const card = document.createElement("article");
    card.className = "catalog-card";
    card.innerHTML = `
        <div class="catalog-icon"><i class="fa-solid ${icono}"></i></div>
        <div>
            <strong>${escaparHtml(nombre)}</strong>
            <span class="${activo ? "catalog-active" : "catalog-inactive"}">${activo ? "Disponible" : "Inactivo"}</span>
        </div>
    `;
    return card;
}

function conectarAccionesUsuarios() {
    document.querySelectorAll("[data-edit-user]").forEach(button => {
        button.onclick = () => abrirModal(button.dataset.editUser);
    });

    document.querySelectorAll("[data-approve-user]").forEach(button => {
        button.onclick = () => cambiarEstadoRapido(button.dataset.approveUser, "Aprobado", true);
    });

    document.querySelectorAll("[data-reject-user]").forEach(button => {
        button.onclick = () => cambiarEstadoRapido(button.dataset.rejectUser, "Rechazado", false);
    });

    document.querySelectorAll("[data-toggle-user]").forEach(button => {
        button.onclick = () => alternarEstadoUsuario(button.dataset.toggleUser);
    });
}

function abrirModal(userId) {
    const usuario = users.find(item => item.id === userId);
    if (!usuario) {
        mostrarMensaje("No se encontró el usuario seleccionado.", "error");
        return;
    }

    editUserId.value = usuario.id;
    editRole.value = normalizarValorRol(usuario.rol);
    editStatus.value = normalizarValorEstado(usuario.estado);
    seleccionarOAgregar(editCompany, usuario.empresa || "Sin asignar");
    seleccionarOAgregar(editAgreement, usuario.convenio || "Sin asignar");
    editActive.checked = usuario.activo !== false;

    const nombreCompleto = obtenerNombreCompleto(usuario);
    modalUserName.textContent = nombreCompleto;
    modalUserEmail.textContent = usuario.mail || "Sin correo";
    modalAvatar.textContent = obtenerIniciales(nombreCompleto);

    editModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
}

function cerrarModal() {
    if (!editModal) return;
    editModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    editUserForm.reset();
}

function cargarSelectsEdicion() {
    editCompany.innerHTML = "";
    editAgreement.innerHTML = "";

    companies.filter(e => e.activa).forEach(e => editCompany.appendChild(crearOption(e.nombre)));
    agreements.filter(c => c.activo).forEach(c => editAgreement.appendChild(crearOption(c.nombre)));
}

function crearOption(valor) {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    return option;
}

function seleccionarOAgregar(select, valor) {
    const existe = Array.from(select.options).some(option => option.value === valor);
    if (!existe) select.appendChild(crearOption(valor));
    select.value = valor;
}

async function guardarUsuario(event) {
    event.preventDefault();

    const usuario = users.find(item => item.id === editUserId.value);
    if (!usuario) {
        mostrarMensaje("No se encontró el usuario.", "error");
        return;
    }

    establecerBotonCargando(saveUserButton, true);

    try {
        await ejecutarAdministracionUsuario({
            usuarioId: usuario.id,
            rol: editRole.value,
            empresa: editCompany.value,
            convenio: editAgreement.value,
            estado: editStatus.value,
            activo: editActive.checked
        });

        cerrarModal();
        mostrarMensaje("Los datos del usuario fueron actualizados.", "success");
        await cargarDatos();
    } catch (error) {
        console.error("No se pudo actualizar el usuario:", error);
        mostrarMensaje(traducirErrorAdministracion(error.message), "error");
    } finally {
        establecerBotonCargando(saveUserButton, false);
    }
}

async function cambiarEstadoRapido(userId, estado, activo) {
    const usuario = users.find(item => item.id === userId);
    if (!usuario) return;

    const accion = estado === "Aprobado" ? "aprobar" : "rechazar";
    if (!window.confirm(`¿Deseás ${accion} la solicitud de ${obtenerNombreCompleto(usuario)}?`)) return;

    mostrarCarga(true);

    try {
        await ejecutarAdministracionUsuario({
            usuarioId: usuario.id,
            rol: normalizarValorRol(usuario.rol),
            empresa: usuario.empresa || "Sin asignar",
            convenio: usuario.convenio || "Sin asignar",
            estado,
            activo
        });

        mostrarMensaje(estado === "Aprobado" ? "Usuario aprobado correctamente." : "Solicitud rechazada correctamente.", "success");
        await cargarDatos();
    } catch (error) {
        console.error(error);
        mostrarMensaje(traducirErrorAdministracion(error.message), "error");
    } finally {
        mostrarCarga(false);
    }
}

async function alternarEstadoUsuario(userId) {
    const usuario = users.find(item => item.id === userId);
    if (!usuario) return;

    const reactivar = usuario.activo === false;
    const confirmar = window.confirm(
        reactivar
            ? `¿Deseás reactivar a ${obtenerNombreCompleto(usuario)}?`
            : `¿Deseás bloquear a ${obtenerNombreCompleto(usuario)}?`
    );
    if (!confirmar) return;

    mostrarCarga(true);

    try {
        await ejecutarAdministracionUsuario({
            usuarioId: usuario.id,
            rol: normalizarValorRol(usuario.rol),
            empresa: usuario.empresa || "Sin asignar",
            convenio: usuario.convenio || "Sin asignar",
            estado: reactivar ? "Aprobado" : "Bloqueado",
            activo: reactivar
        });

        mostrarMensaje(reactivar ? "La cuenta fue reactivada." : "La cuenta fue bloqueada.", "success");
        await cargarDatos();
    } catch (error) {
        console.error(error);
        mostrarMensaje(traducirErrorAdministracion(error.message), "error");
    } finally {
        mostrarCarga(false);
    }
}

async function ejecutarAdministracionUsuario({ usuarioId, rol, empresa, convenio, estado, activo }) {
    const { error } = await supabaseClient.rpc("administrar_usuario", {
        p_usuario_id: usuarioId,
        p_rol: rol,
        p_empresa: empresa,
        p_convenio: convenio,
        p_estado: estado,
        p_activo: activo
    });

    if (error) throw error;
}

function mostrarVista(vista) {
    [pendingView, usersView, companiesView, agreementsView].forEach(view => view.classList.add("hidden"));

    const titles = {
        pendientes: "Solicitudes",
        usuarios: "Usuarios",
        empresas: "Empresas",
        convenios: "Convenios"
    };

    if (vista === "usuarios") {
        usersView.classList.remove("hidden");
        renderizarTablaUsuarios();
    } else if (vista === "empresas") {
        companiesView.classList.remove("hidden");
    } else if (vista === "convenios") {
        agreementsView.classList.remove("hidden");
    } else {
        pendingView.classList.remove("hidden");
    }

    pageTitle.textContent = titles[vista] || "Administración";
    document.querySelectorAll("[data-view]").forEach(button => {
        button.classList.toggle("active", button.dataset.view === vista);
    });
    sidebar.classList.remove("open");
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    window.location.replace("index.html");
}

function alternarMenu() {
    sidebar.classList.toggle("open");
}

function mostrarCarga(mostrar) {
    loadingOverlay.classList.toggle("hidden", !mostrar);
}

function mostrarMensaje(texto, tipo) {
    pageMessage.textContent = texto;
    pageMessage.className = `page-message ${tipo}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function limpiarMensaje() {
    pageMessage.textContent = "";
    pageMessage.className = "page-message hidden";
}

function establecerBotonCargando(button, cargando) {
    if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
    button.disabled = cargando;
    button.innerHTML = cargando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'
        : button.dataset.originalHtml;
}

function crearBadgeEstado(usuario) {
    const estado = normalizar(usuario.estado);
    let clase = "pending";
    let texto = usuario.estado || "Pendiente";

    if (usuario.activo === false || estado === "bloqueado") {
        clase = "blocked";
        texto = "Bloqueado";
    } else if (estado === "aprobado") {
        clase = "approved";
    } else if (estado === "rechazado") {
        clase = "rejected";
    }

    return `<span class="status-badge ${clase}">${escaparHtml(texto)}</span>`;
}

function normalizarValorRol(rol) {
    const valor = normalizar(rol);
    if (valor === "administrador" || valor === "admin") return "Administrador";
    if (valor === "dirigente") return "Dirigente";
    return "Delegado";
}

function normalizarValorEstado(estado) {
    const valor = normalizar(estado);
    if (valor === "aprobado") return "Aprobado";
    if (valor === "rechazado") return "Rechazado";
    if (valor === "bloqueado") return "Bloqueado";
    return "Pendiente";
}

function obtenerNombreCompleto(usuario) {
    return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") || "Usuario sin nombre";
}

function obtenerIniciales(nombre) {
    return String(nombre || "Usuario")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte.charAt(0).toUpperCase())
        .join("");
}

function normalizar(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

function escaparHtml(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}

function traducirErrorAdministracion(mensajeOriginal) {
    const mensaje = normalizar(mensajeOriginal);
    if (mensaje.includes("no podés quitarte tus propios permisos")) {
        return "No podés bloquear ni quitar permisos a tu propia cuenta.";
    }
    if (mensaje.includes("acceso no autorizado")) {
        return "No tenés permisos para realizar esta acción.";
    }
    if (mensaje.includes("rol inválido")) {
        return "El rol seleccionado no es válido.";
    }
    if (mensaje.includes("estado inválido")) {
        return "El estado seleccionado no es válido.";
    }
    if (mensaje.includes("function") && mensaje.includes("does not exist")) {
        return "Falta ejecutar la migración SQL del panel administrativo en Supabase.";
    }
    return "No se pudieron guardar los cambios.";
}
