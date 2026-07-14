"use strict";

const logoutButton = document.getElementById("logoutButton");
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");

const pageTitle = document.getElementById("pageTitle");
const pageMessage = document.getElementById("pageMessage");
const loadingState = document.getElementById("loadingState");

const inicioSection = document.getElementById("inicioSection");
const perfilSection = document.getElementById("perfilSection");

const profileShortcut = document.getElementById("profileShortcut");
const navButtons = document.querySelectorAll("[data-section]");

const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const userAvatar = document.getElementById("userAvatar");

const welcomeTitle = document.getElementById("welcomeTitle");

const dashboardRole = document.getElementById("dashboardRole");
const dashboardCompany = document.getElementById("dashboardCompany");
const dashboardAgreement = document.getElementById("dashboardAgreement");

const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileRole = document.getElementById("profileRole");
const profileCompany = document.getElementById("profileCompany");
const profileAgreement = document.getElementById("profileAgreement");

const profileForm = document.getElementById("profileForm");
const passwordForm = document.getElementById("passwordForm");

const nombreInput = document.getElementById("nombre");
const apellidoInput = document.getElementById("apellido");
const dniInput = document.getElementById("dni");
const telefonoInput = document.getElementById("telefono");
const emailInput = document.getElementById("email");

const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");

const saveProfileButton = document.getElementById("saveProfileButton");
const savePasswordButton = document.getElementById("savePasswordButton");

let currentUser = null;
let currentProfile = null;

document.addEventListener("DOMContentLoaded", iniciarDashboard);

logoutButton.addEventListener("click", cerrarSesion);
menuButton.addEventListener("click", alternarMenu);
profileShortcut.addEventListener("click", () => mostrarSeccion("perfil"));

profileForm.addEventListener("submit", guardarPerfil);
passwordForm.addEventListener("submit", cambiarPassword);

navButtons.forEach(button => {
    button.addEventListener("click", () => {
        mostrarSeccion(button.dataset.section);
    });
});

async function iniciarDashboard() {
    limpiarMensaje();

    try {
        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError || !session?.user) {
            window.location.replace("index.html");
            return;
        }

        currentUser = session.user;

        const perfil = await obtenerPerfil(currentUser.id);

        if (!perfil) {
            await cerrarSesion();
            return;
        }

        const estado = normalizar(perfil.estado);
        const rol = normalizar(perfil.rol);

        if (
            estado !== "aprobado" ||
            perfil.activo === false
        ) {
            await supabaseClient.auth.signOut();
            window.location.replace("index.html");
            return;
        }

        if (
            rol !== "delegado" &&
            rol !== "dirigente"
        ) {
            if (rol === "administrador" || rol === "admin") {
                window.location.replace("admin.html");
                return;
            }

            await supabaseClient.auth.signOut();
            window.location.replace("index.html");
            return;
        }

        currentProfile = perfil;

        completarInterfaz();
        loadingState.classList.add("hidden");
        mostrarSeccion("inicio");
    } catch (error) {
        console.error("Error al iniciar el dashboard:", error);

        mostrarMensaje(
            "No se pudo cargar tu perfil. Intentá nuevamente.",
            "error"
        );
    }
}

async function obtenerPerfil(userId) {
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
            activo
        `)
        .eq("id", userId)
        .maybeSingle();

    if (error || !data) {
        console.error("No se pudo consultar el perfil:", error);
        return null;
    }

    return data;
}

function completarInterfaz() {
    const nombreCompleto = [
        currentProfile.nombre,
        currentProfile.apellido
    ]
        .filter(Boolean)
        .join(" ");

    const iniciales = obtenerIniciales(nombreCompleto);

    userName.textContent = nombreCompleto;
    userRole.textContent = currentProfile.rol || "Usuario";
    userAvatar.textContent = iniciales;

    welcomeTitle.textContent =
        `Bienvenido, ${currentProfile.nombre || "usuario"}`;

    dashboardRole.textContent =
        currentProfile.rol || "Sin asignar";

    dashboardCompany.textContent =
        currentProfile.empresa || "Sin asignar";

    dashboardAgreement.textContent =
        currentProfile.convenio || "Sin asignar";

    profileAvatar.textContent = iniciales;
    profileName.textContent = nombreCompleto;
    profileRole.textContent = currentProfile.rol || "Usuario";

    profileCompany.textContent =
        currentProfile.empresa || "Sin empresa";

    profileAgreement.textContent =
        currentProfile.convenio || "Sin convenio";

    nombreInput.value = currentProfile.nombre || "";
    apellidoInput.value = currentProfile.apellido || "";
    dniInput.value = currentProfile.dni || "";
    telefonoInput.value = currentProfile.telefono || "";
    emailInput.value =
        currentUser?.email ||
        currentProfile.mail ||
        "";
}

function mostrarSeccion(nombreSeccion) {
    limpiarMensaje();

    inicioSection.classList.add("hidden");
    perfilSection.classList.add("hidden");

    navButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === nombreSeccion
        );
    });

    if (nombreSeccion === "perfil") {
        perfilSection.classList.remove("hidden");
        pageTitle.textContent = "Mi perfil";
    } else {
        inicioSection.classList.remove("hidden");
        pageTitle.textContent = "Mi espacio";
    }

    sidebar.classList.remove("open");
}

async function guardarPerfil(event) {
    event.preventDefault();
    limpiarMensaje();

    const telefono = telefonoInput.value.trim();
    const nuevoEmail = emailInput.value.trim().toLowerCase();
    const emailActual = String(currentUser.email || "").toLowerCase();

    if (!nuevoEmail || !esCorreoValido(nuevoEmail)) {
        mostrarMensaje(
            "Ingresá un correo electrónico válido.",
            "error"
        );
        return;
    }

    establecerBotonCargando(saveProfileButton, true);

    try {
        const {
            error: telefonoError
        } = await supabaseClient.rpc(
            "actualizar_mi_perfil",
            {
                p_telefono: telefono
            }
        );

        if (telefonoError) {
            throw telefonoError;
        }

        currentProfile.telefono = telefono;

        if (nuevoEmail !== emailActual) {
            const {
                data,
                error: emailError
            } = await supabaseClient.auth.updateUser({
                email: nuevoEmail
            });

            if (emailError) {
                throw emailError;
            }

            currentUser = data.user || currentUser;

            mostrarMensaje(
                "El teléfono fue actualizado. Revisá tu correo para confirmar el cambio de email, si Supabase lo solicita.",
                "warning"
            );
        } else {
            mostrarMensaje(
                "Tus datos fueron actualizados correctamente.",
                "success"
            );
        }
    } catch (error) {
        console.error("No se pudo actualizar el perfil:", error);

        mostrarMensaje(
            traducirErrorPerfil(error.message),
            "error"
        );
    } finally {
        establecerBotonCargando(saveProfileButton, false);
    }
}

async function cambiarPassword(event) {
    event.preventDefault();
    limpiarMensaje();

    const password = newPasswordInput.value;
    const confirmar = confirmPasswordInput.value;

    if (password.length < 8) {
        mostrarMensaje(
            "La contraseña debe tener al menos 8 caracteres.",
            "error"
        );
        return;
    }

    if (password !== confirmar) {
        mostrarMensaje(
            "Las contraseñas no coinciden.",
            "error"
        );
        return;
    }

    establecerBotonCargando(savePasswordButton, true);

    try {
        const {
            error
        } = await supabaseClient.auth.updateUser({
            password
        });

        if (error) {
            throw error;
        }

        passwordForm.reset();

        mostrarMensaje(
            "La contraseña fue actualizada correctamente.",
            "success"
        );
    } catch (error) {
        console.error("No se pudo actualizar la contraseña:", error);

        mostrarMensaje(
            "No se pudo actualizar la contraseña. Intentá nuevamente.",
            "error"
        );
    } finally {
        establecerBotonCargando(savePasswordButton, false);
    }
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    window.location.replace("index.html");
}

function alternarMenu() {
    sidebar.classList.toggle("open");
}

function establecerBotonCargando(button, cargando) {
    button.disabled = cargando;

    if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
    }

    button.innerHTML = cargando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'
        : button.dataset.originalText;
}

function mostrarMensaje(texto, tipo) {
    pageMessage.textContent = texto;
    pageMessage.className = `page-message ${tipo}`;
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function limpiarMensaje() {
    pageMessage.textContent = "";
    pageMessage.className = "page-message hidden";
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
    return String(valor ?? "")
        .trim()
        .toLowerCase();
}

function esCorreoValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function traducirErrorPerfil(mensajeOriginal) {
    const mensaje = normalizar(mensajeOriginal);

    if (mensaje.includes("email address") && mensaje.includes("invalid")) {
        return "El correo electrónico ingresado no es válido.";
    }

    if (mensaje.includes("already registered")) {
        return "Ese correo electrónico ya pertenece a otra cuenta.";
    }

    if (mensaje.includes("rate limit")) {
        return "Se realizaron demasiados intentos. Esperá unos minutos.";
    }

    return "No se pudieron guardar los cambios.";
}