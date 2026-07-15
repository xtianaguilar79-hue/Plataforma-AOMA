"use strict";
(() => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitButton = document.getElementById("submitButton");
  const submitButtonText = document.getElementById("submitButtonText");
  const submitSpinner = document.getElementById("submitSpinner");
  const messageBox = document.getElementById("mensaje");
  const togglePasswordButton = document.getElementById("togglePassword");
  document.addEventListener("DOMContentLoaded", iniciarLogin);
  loginForm.addEventListener("submit", procesarLogin);
  togglePasswordButton.addEventListener("click", alternarPassword);
  async function iniciarLogin() {
    limpiarMensaje();
    try {
      const {
        data: { session },
        error
      } = await supabaseClient.auth.getSession();
      if (error) {
        console.error("No se pudo consultar la sesión:", error);
        return;
      }
      if (!(session == null ? void 0 : session.user)) {
        return;
      }
      await verificarPerfilYRedirigir(session.user.id);
    } catch (error) {
      console.error("Error al iniciar la pantalla de acceso:", error);
    }
  }
  async function procesarLogin(event) {
    event.preventDefault();
    limpiarMensaje();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    if (!email || !password) {
      mostrarMensaje(
        "Completá el correo electrónico y la contraseña.",
        "error"
      );
      return;
    }
    if (!esCorreoValido(email)) {
      mostrarMensaje(
        "Ingresá un correo electrónico válido.",
        "error"
      );
      return;
    }
    establecerCargando(true);
    try {
      const {
        data,
        error
      } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        mostrarMensaje(traducirErrorLogin(error.message), "error");
        return;
      }
      if (!(data == null ? void 0 : data.user)) {
        mostrarMensaje(
          "No fue posible iniciar sesión. Intentá nuevamente.",
          "error"
        );
        return;
      }
      await verificarPerfilYRedirigir(data.user.id);
    } catch (error) {
      console.error("Error inesperado durante el ingreso:", error);
      mostrarMensaje(
        "Ocurrió un error inesperado. Revisá tu conexión e intentá nuevamente.",
        "error"
      );
    } finally {
      establecerCargando(false);
    }
  }
  async function verificarPerfilYRedirigir(userId) {
    const {
      data: perfil,
      error
    } = await supabaseClient.from("usuarios").select(`
            id,
            nombre,
            apellido,
            rol,
            estado,
            activo
        `).eq("id", userId).maybeSingle();
    if (error) {
      console.error("Error al consultar el perfil:", error);
      await cerrarSesionSilenciosamente();
      mostrarMensaje(
        "No pudimos consultar tu perfil. Contactá al administrador.",
        "error"
      );
      return;
    }
    if (!perfil) {
      await cerrarSesionSilenciosamente();
      mostrarMensaje(
        "La cuenta existe, pero no tiene un perfil asociado. Contactá al administrador.",
        "error"
      );
      return;
    }
    const estado = normalizarTexto(perfil.estado);
    const rol = normalizarTexto(perfil.rol);
    if (perfil.activo === false || estado === "bloqueado") {
      await cerrarSesionSilenciosamente();
      mostrarMensaje(
        "Tu cuenta está bloqueada. Contactá al administrador de AOMA.",
        "error"
      );
      return;
    }
    if (estado === "pendiente") {
      await cerrarSesionSilenciosamente();
      mostrarMensaje(
        "Tu solicitud todavía está pendiente de aprobación.",
        "warning"
      );
      return;
    }
    if (estado === "rechazado") {
      await cerrarSesionSilenciosamente();
      mostrarMensaje(
        "La solicitud de acceso fue rechazada. Contactá al administrador.",
        "error"
      );
      return;
    }
    if (estado !== "aprobado") {
      await cerrarSesionSilenciosamente();
      mostrarMensaje(
        "Tu cuenta todavía no está habilitada para ingresar.",
        "warning"
      );
      return;
    }
    mostrarMensaje(
      `Bienvenido${perfil.nombre ? `, ${perfil.nombre}` : ""}.`,
      "success"
    );
    if (rol === "administrador" || rol === "admin") {
      window.location.replace("admin.html");
      return;
    }
    if (rol === "dirigente" || rol === "delegado") {
      window.location.replace("dashboard.html");
      return;
    }
    await cerrarSesionSilenciosamente();
    mostrarMensaje(
      "Tu cuenta no tiene un rol válido asignado. Contactá al administrador.",
      "error"
    );
  }
  async function cerrarSesionSilenciosamente() {
    try {
      await supabaseClient.auth.signOut();
    } catch (error) {
      console.error("No se pudo cerrar la sesión:", error);
    }
  }
  function alternarPassword() {
    const mostrar = passwordInput.type === "password";
    passwordInput.type = mostrar ? "text" : "password";
    togglePasswordButton.innerHTML = mostrar ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
    togglePasswordButton.setAttribute(
      "aria-label",
      mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
    );
    togglePasswordButton.setAttribute(
      "title",
      mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
    );
  }
  function establecerCargando(cargando) {
    submitButton.disabled = cargando;
    emailInput.disabled = cargando;
    passwordInput.disabled = cargando;
    submitButtonText.textContent = cargando ? "Verificando..." : "Ingresar";
    submitSpinner.classList.toggle("hidden", !cargando);
  }
  function mostrarMensaje(texto, tipo) {
    messageBox.textContent = texto;
    messageBox.className = `form-message ${tipo}`;
  }
  function limpiarMensaje() {
    messageBox.textContent = "";
    messageBox.className = "form-message hidden";
  }
  function esCorreoValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  function normalizarTexto(valor) {
    return String(valor != null ? valor : "").trim().toLowerCase();
  }
  function traducirErrorLogin(mensajeOriginal) {
    const mensaje = normalizarTexto(mensajeOriginal);
    if (mensaje.includes("invalid login credentials") || mensaje.includes("invalid credentials")) {
      return "El correo electrónico o la contraseña son incorrectos.";
    }
    if (mensaje.includes("email not confirmed")) {
      return "El correo electrónico todavía no fue confirmado.";
    }
    if (mensaje.includes("too many requests")) {
      return "Se realizaron demasiados intentos. Esperá unos minutos.";
    }
    if (mensaje.includes("user not found")) {
      return "No existe una cuenta registrada con ese correo.";
    }
    return "No fue posible iniciar sesión. Verificá tus datos e intentá nuevamente.";
  }
})();
