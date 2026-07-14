(() => {
  const formulario = document.getElementById("formRegistro");
  const mensaje = document.getElementById("mensaje");
  const empresaSelect = document.getElementById("empresa");
  const convenioSelect = document.getElementById("convenio");
  document.addEventListener("DOMContentLoaded", iniciar);
  async function iniciar() {
    await cargarEmpresas();
    await cargarConvenios();
  }
  async function cargarEmpresas() {
    const { data, error } = await supabaseClient.from("empresas").select("*").eq("activa", true).order("nombre");
    if (error) {
      console.error(error);
      empresaSelect.innerHTML = "<option>Error al cargar</option>";
      return;
    }
    empresaSelect.innerHTML = '<option value="">Seleccione una empresa</option>';
    data.forEach((empresa) => {
      empresaSelect.innerHTML += `

        <option value="${empresa.nombre}">

            ${empresa.nombre}

        </option>

        `;
    });
  }
  async function cargarConvenios() {
    const { data, error } = await supabaseClient.from("convenios").select("*").eq("activo", true).order("nombre");
    if (error) {
      console.error(error);
      convenioSelect.innerHTML = "<option>Error al cargar</option>";
      return;
    }
    convenioSelect.innerHTML = '<option value="">Seleccione un convenio</option>';
    data.forEach((convenio) => {
      convenioSelect.innerHTML += `

        <option value="${convenio.nombre}">

            ${convenio.nombre}

        </option>

        `;
    });
  }
  formulario.addEventListener("submit", registrarUsuario);
  async function registrarUsuario(e) {
    e.preventDefault();
    mensaje.innerHTML = "";
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const dni = document.getElementById("dni").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const rol = document.getElementById("rol").value;
    const empresa = empresaSelect.value;
    const convenio = convenioSelect.value;
    const password = document.getElementById("password").value;
    const confirmar = document.getElementById("confirmar").value;
    if (!nombre || !apellido || !dni || !email || !rol || !empresa || !convenio) {
      return mostrarError("Debe completar todos los campos.");
    }
    if (password.length < 8) {
      return mostrarError(
        "La contraseña debe tener al menos 8 caracteres."
      );
    }
    if (password !== confirmar) {
      return mostrarError(
        "Las contraseñas no coinciden."
      );
    }
    mensaje.style.color = "white";
    mensaje.innerHTML = "Registrando usuario...";
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });
    if (error) {
      return mostrarError(error.message);
    }
    const { error: perfilError } = await supabaseClient.from("usuarios").insert({
      id: data.user.id,
      nombre,
      apellido,
      dni,
      telefono,
      mail: email,
      rol,
      empresa,
      convenio,
      estado: "Pendiente"
    });
    if (perfilError) {
      return mostrarError(perfilError.message);
    }
    mensaje.style.color = "#00d26a";
    mensaje.innerHTML = `

        Registro realizado correctamente.<br><br>

        Tu solicitud fue enviada al administrador.<br>

        Una vez aprobada podrás ingresar al Campus.

    `;
    formulario.reset();
  }
  function mostrarError(texto) {
    mensaje.style.color = "#ff5555";
    mensaje.innerHTML = texto;
  }
})();
