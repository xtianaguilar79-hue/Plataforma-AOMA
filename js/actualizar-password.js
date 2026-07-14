"use strict";
(() => {
  const validatingState = document.getElementById("validatingState");
  const passwordForm = document.getElementById("passwordForm");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const submitButton = document.getElementById("submitButton");
  const submitButtonText = document.getElementById("submitButtonText");
  const submitSpinner = document.getElementById("submitSpinner");
  const messageBox = document.getElementById("mensaje");
  document.addEventListener(
    "DOMContentLoaded",
    iniciarRecuperacion
  );
  passwordForm.addEventListener(
    "submit",
    actualizarPassword
  );
  async function iniciarRecuperacion() {
    limpiarMensaje();
    try {
      const {
        data: { session },
        error
      } = await supabaseClient.auth.getSession();
      if (error) {
        throw error;
      }
      if (session == null ? void 0 : session.user) {
        habilitarFormulario();
        return;
      }
      const timeoutId = window.setTimeout(() => {
        mostrarEnlaceInvalido();
      }, 5e3);
      const {
        data: listener
      } = supabaseClient.auth.onAuthStateChange(
        (event, sessionActual) => {
          if (event === "PASSWORD_RECOVERY" || (sessionActual == null ? void 0 : sessionActual.user)) {
            window.clearTimeout(timeoutId);
            habilitarFormulario();
          }
        }
      );
      window.addEventListener("beforeunload", () => {
        listener.subscription.unsubscribe();
      });
    } catch (error) {
      console.error(
        "No se pudo validar el enlace:",
        error
      );
      mostrarEnlaceInvalido();
    }
  }
  function habilitarFormulario() {
    validatingState.classList.add("hidden");
    passwordForm.classList.remove("hidden");
  }
  function mostrarEnlaceInvalido() {
    validatingState.className = "form-message error";
    validatingState.textContent = "El enlace de recuperación es inválido o venció. Solicitá uno nuevo desde la pantalla de ingreso.";
  }
  async function actualizarPassword(event) {
    event.preventDefault();
    limpiarMensaje();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (password.length < 8) {
      mostrarMensaje(
        "La contraseña debe tener al menos 8 caracteres.",
        "error"
      );
      return;
    }
    if (password !== confirmPassword) {
      mostrarMensaje(
        "Las contraseñas no coinciden.",
        "error"
      );
      return;
    }
    establecerCargando(true);
    try {
      const {
        error
      } = await supabaseClient.auth.updateUser({
        password
      });
      if (error) {
        throw error;
      }
      mostrarMensaje(
        "La contraseña fue actualizada correctamente. Serás redirigido al ingreso.",
        "success"
      );
      passwordForm.reset();
      window.setTimeout(async () => {
        await supabaseClient.auth.signOut();
        window.location.replace("index.html");
      }, 2200);
    } catch (error) {
      console.error(
        "No se pudo actualizar la contraseña:",
        error
      );
      mostrarMensaje(
        traducirErrorActualizacion(error.message),
        "error"
      );
    } finally {
      establecerCargando(false);
    }
  }
  function establecerCargando(cargando) {
    submitButton.disabled = cargando;
    passwordInput.disabled = cargando;
    confirmPasswordInput.disabled = cargando;
    submitButtonText.textContent = cargando ? "Guardando..." : "Guardar contraseña";
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
  function normalizar(valor) {
    return String(valor != null ? valor : "").trim().toLowerCase();
  }
  function traducirErrorActualizacion(mensajeOriginal) {
    const mensaje = normalizar(mensajeOriginal);
    if (mensaje.includes("same password")) {
      return "La contraseña nueva debe ser distinta de la anterior.";
    }
    if (mensaje.includes("session") || mensaje.includes("jwt")) {
      return "El enlace de recuperación venció. Solicitá uno nuevo.";
    }
    if (mensaje.includes("weak password")) {
      return "La contraseña elegida no cumple los requisitos de seguridad.";
    }
    return "No fue posible actualizar la contraseña. Solicitá un nuevo enlace e intentá nuevamente.";
  }
})();
