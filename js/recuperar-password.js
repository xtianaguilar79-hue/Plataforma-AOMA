"use strict";
(() => {
  const recoveryForm = document.getElementById("recoveryForm");
  const emailInput = document.getElementById("email");
  const submitButton = document.getElementById("submitButton");
  const submitButtonText = document.getElementById("submitButtonText");
  const submitSpinner = document.getElementById("submitSpinner");
  const messageBox = document.getElementById("mensaje");
  recoveryForm.addEventListener("submit", enviarRecuperacion);
  async function enviarRecuperacion(event) {
    event.preventDefault();
    limpiarMensaje();
    const email = emailInput.value.trim().toLowerCase();
    if (!email || !esCorreoValido(email)) {
      mostrarMensaje(
        "Ingresá un correo electrónico válido.",
        "error"
      );
      return;
    }
    establecerCargando(true);
    try {
      const redirectTo = `${window.location.origin}/actualizar-password.html`;
      const {
        error
      } = await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo
        }
      );
      if (error) {
        throw error;
      }
      mostrarMensaje(
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisá también la carpeta de correo no deseado.",
        "success"
      );
      recoveryForm.reset();
    } catch (error) {
      console.error(
        "No se pudo enviar el correo de recuperación:",
        error
      );
      mostrarMensaje(
        traducirErrorRecuperacion(error.message),
        "error"
      );
    } finally {
      establecerCargando(false);
    }
  }
  function establecerCargando(cargando) {
    submitButton.disabled = cargando;
    emailInput.disabled = cargando;
    submitButtonText.textContent = cargando ? "Enviando..." : "Enviar enlace";
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
  function normalizar(valor) {
    return String(valor != null ? valor : "").trim().toLowerCase();
  }
  function traducirErrorRecuperacion(mensajeOriginal) {
    const mensaje = normalizar(mensajeOriginal);
    if (mensaje.includes("rate limit")) {
      return "Se realizaron demasiadas solicitudes. Esperá unos minutos antes de intentar nuevamente.";
    }
    if (mensaje.includes("email address") && mensaje.includes("invalid")) {
      return "El correo electrónico ingresado no es válido.";
    }
    return "No fue posible enviar el enlace de recuperación. Intentá nuevamente.";
  }
})();
