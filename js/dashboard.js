"use strict";

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const logoutButton = $("#logoutButton");
const menuButton = $("#menuButton");
const sidebar = $("#sidebar");
const pageTitle = $("#pageTitle");
const pageMessage = $("#pageMessage");
const loadingState = $("#loadingState");
const profileShortcut = $("#profileShortcut");
const navButtons = $$('[data-section]');
const sections = {
  inicio: $("#inicioSection"),
  biblioteca: $("#bibliotecaSection"),
  perfil: $("#perfilSection")
};

const userName = $("#userName");
const userRole = $("#userRole");
const userAvatar = $("#userAvatar");
const welcomeTitle = $("#welcomeTitle");
const dashboardRole = $("#dashboardRole");
const dashboardCompany = $("#dashboardCompany");
const dashboardAgreement = $("#dashboardAgreement");

const profileAvatar = $("#profileAvatar");
const profileName = $("#profileName");
const profileRole = $("#profileRole");
const profileCompany = $("#profileCompany");
const profileAgreement = $("#profileAgreement");
const profileForm = $("#profileForm");
const passwordForm = $("#passwordForm");
const nombreInput = $("#nombre");
const apellidoInput = $("#apellido");
const dniInput = $("#dni");
const telefonoInput = $("#telefono");
const emailInput = $("#email");
const newPasswordInput = $("#newPassword");
const confirmPasswordInput = $("#confirmPassword");
const saveProfileButton = $("#saveProfileButton");
const savePasswordButton = $("#savePasswordButton");

const librarySearch = $("#librarySearch");
const libraryGrid = $("#libraryGrid");
const libraryEmpty = $("#libraryEmpty");
const libraryResultsInfo = $("#libraryResultsInfo");
const libraryTotal = $("#libraryTotal");
const featuredDocuments = $("#featuredDocuments");
const filterButtons = $$('[data-library-filter]');

const documentModal = $("#documentModal");
const documentNumber = $("#documentNumber");
const documentTitle = $("#documentTitle");
const documentCategory = $("#documentCategory");
const documentContent = $("#documentContent");
const documentPdfLink = $("#documentPdfLink");
const closeDocumentButton = $("#closeDocumentButton");
const documentSearch = $("#documentSearch");
const documentMatchCount = $("#documentMatchCount");

let currentUser = null;
let currentProfile = null;
let currentLibraryFilter = "todos";
let currentDocument = null;
let currentDocumentOriginalHtml = "";
let AOMA_BIBLIOTECA = [];

window.addEventListener("DOMContentLoaded", iniciarDashboard);
logoutButton?.addEventListener("click", cerrarSesion);
menuButton?.addEventListener("click", () => sidebar?.classList.toggle("open"));
profileShortcut?.addEventListener("click", () => mostrarSeccion("perfil"));
profileForm?.addEventListener("submit", guardarPerfil);
passwordForm?.addEventListener("submit", cambiarPassword);

navButtons.forEach(button => button.addEventListener("click", () => mostrarSeccion(button.dataset.section)));
$$('[data-go]').forEach(button => button.addEventListener("click", () => mostrarSeccion(button.dataset.go)));
filterButtons.forEach(button => button.addEventListener("click", () => cambiarFiltroBiblioteca(button.dataset.libraryFilter)));
librarySearch?.addEventListener("input", renderizarBiblioteca);
closeDocumentButton?.addEventListener("click", cerrarDocumento);
documentModal?.addEventListener("click", event => { if (event.target === documentModal) cerrarDocumento(); });
documentSearch?.addEventListener("input", buscarDentroDocumento);
document.addEventListener("keydown", event => { if (event.key === "Escape") cerrarDocumento(); });

async function iniciarDashboard() {
  limpiarMensaje();
  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError || !session?.user) return window.location.replace("index.html");

    currentUser = session.user;
    const perfil = await obtenerPerfil(currentUser.id);
    if (!perfil) return cerrarSesion();

    const estado = normalizar(perfil.estado);
    const rol = normalizar(perfil.rol);
    if (estado !== "aprobado" || perfil.activo === false) {
      await supabaseClient.auth.signOut();
      return window.location.replace("index.html");
    }
    if (rol === "administrador" || rol === "admin") return window.location.replace("admin.html");
    if (!['delegado', 'dirigente'].includes(rol)) return cerrarSesion();

    currentProfile = perfil;
    completarInterfaz();
    await prepararBiblioteca();
    loadingState.classList.add("hidden");
    mostrarSeccion("inicio");
  } catch (error) {
    console.error("Error al iniciar el dashboard:", error);
    mostrarMensaje("No se pudo cargar tu perfil. Intentá nuevamente.", "error");
  }
}

async function obtenerPerfil(userId) {
  const { data, error } = await supabaseClient.from("usuarios").select(`
    id, nombre, apellido, dni, telefono, mail, rol, empresa, convenio, estado, activo
  `).eq("id", userId).maybeSingle();
  if (error || !data) {
    console.error("No se pudo consultar el perfil:", error);
    return null;
  }
  return data;
}

function completarInterfaz() {
  const nombreCompleto = [currentProfile.nombre, currentProfile.apellido].filter(Boolean).join(" ");
  const iniciales = obtenerIniciales(nombreCompleto);
  userName.textContent = nombreCompleto || "Usuario";
  userRole.textContent = currentProfile.rol || "Usuario";
  userAvatar.textContent = iniciales;
  welcomeTitle.textContent = `Bienvenido, ${currentProfile.nombre || "usuario"}`;
  dashboardRole.textContent = currentProfile.rol || "Sin asignar";
  dashboardCompany.textContent = currentProfile.empresa || "Sin asignar";
  dashboardAgreement.textContent = currentProfile.convenio || "Sin asignar";
  profileAvatar.textContent = iniciales;
  profileName.textContent = nombreCompleto || "Usuario";
  profileRole.textContent = currentProfile.rol || "Usuario";
  profileCompany.textContent = currentProfile.empresa || "Sin empresa";
  profileAgreement.textContent = currentProfile.convenio || "Sin convenio";
  nombreInput.value = currentProfile.nombre || "";
  apellidoInput.value = currentProfile.apellido || "";
  dniInput.value = currentProfile.dni || "";
  telefonoInput.value = currentProfile.telefono || "";
  emailInput.value = currentUser?.email || currentProfile.mail || "";
}

function mostrarSeccion(nombreSeccion) {
  limpiarMensaje();
  Object.values(sections).forEach(section => section?.classList.add("hidden"));
  sections[nombreSeccion]?.classList.remove("hidden");
  navButtons.forEach(button => button.classList.toggle("active", button.dataset.section === nombreSeccion));
  const titulos = { inicio: "Mi espacio", biblioteca: "Biblioteca", perfil: "Mi perfil" };
  pageTitle.textContent = titulos[nombreSeccion] || "Mi espacio";
  sidebar.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function prepararBiblioteca() {
  try {
    const response = await fetch("content/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar el índice (${response.status})`);
    const payload = await response.json();
    AOMA_BIBLIOTECA = Array.isArray(payload.documentos) ? payload.documentos : [];
  } catch (error) {
    console.error("Error al cargar la biblioteca:", error);
    AOMA_BIBLIOTECA = [];
    mostrarMensaje("No se pudo cargar la biblioteca institucional.", "error");
  }

  const totalLeyes = AOMA_BIBLIOTECA.filter(item => item.tipo === "ley").length;
  const totalConvenios = AOMA_BIBLIOTECA.filter(item => item.tipo === "convenio").length;
  $("#lawsCount").textContent = totalLeyes;
  $("#agreementsCount").textContent = totalConvenios;
  libraryTotal.textContent = AOMA_BIBLIOTECA.length;
  renderizarDestacados();
  renderizarBiblioteca();
}

function renderizarDestacados() {
  const ids = ["lct-20744", "ley-23551", "cct-38-89"];
  featuredDocuments.innerHTML = "";
  ids.map(id => AOMA_BIBLIOTECA.find(item => item.id === id)).filter(Boolean).forEach(item => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "featured-card";
    card.innerHTML = `<span class="document-icon ${item.color}"><i class="fa-solid ${item.icono}"></i></span><span><small>${escaparHtml(item.numero)}</small><strong>${escaparHtml(item.titulo)}</strong></span><i class="fa-solid fa-arrow-up-right-from-square"></i>`;
    card.addEventListener("click", () => abrirDocumento(item));
    featuredDocuments.appendChild(card);
  });
}

function cambiarFiltroBiblioteca(filtro) {
  currentLibraryFilter = filtro;
  filterButtons.forEach(button => button.classList.toggle("active", button.dataset.libraryFilter === filtro));
  renderizarBiblioteca();
}

function renderizarBiblioteca() {
  const busqueda = normalizar(librarySearch?.value);
  const filtrados = AOMA_BIBLIOTECA.filter(item => {
    const coincideTipo = currentLibraryFilter === "todos" || item.tipo === currentLibraryFilter;
    const palabras = Array.isArray(item.palabrasClave) ? item.palabrasClave.join(" ") : "";
    const texto = normalizar(`${item.numero} ${item.titulo} ${item.categoria} ${item.resumen} ${palabras}`);
    return coincideTipo && (!busqueda || texto.includes(busqueda));
  });

  libraryGrid.innerHTML = "";
  libraryResultsInfo.textContent = `${filtrados.length} documento${filtrados.length === 1 ? "" : "s"} encontrado${filtrados.length === 1 ? "" : "s"}`;
  libraryEmpty.classList.toggle("hidden", filtrados.length !== 0);

  filtrados.forEach(item => {
    const card = document.createElement("article");
    card.className = "library-card";
    card.innerHTML = `
      <div class="library-card-top"><span class="document-icon ${item.color}"><i class="fa-solid ${item.icono}"></i></span><span class="type-badge ${item.tipo}">${item.tipo === "ley" ? "Ley" : "Convenio"}</span></div>
      <p class="document-number">${escaparHtml(item.numero)}</p>
      <h3>${escaparHtml(item.titulo)}</h3>
      <p class="document-summary">${escaparHtml(item.resumen)}</p>
      <div class="library-card-footer"><span>${escaparHtml(item.categoria)}</span><button type="button">Consultar <i class="fa-solid fa-arrow-right"></i></button></div>`;
    card.querySelector("button").addEventListener("click", () => abrirDocumento(item));
    libraryGrid.appendChild(card);
  });
}

async function abrirDocumento(item) {
  currentDocument = item;
  documentNumber.textContent = item.numero;
  documentTitle.textContent = item.titulo;
  documentCategory.textContent = item.categoria;
  documentSearch.value = "";
  documentMatchCount.textContent = "";
  documentPdfLink.classList.add("hidden");
  currentDocumentOriginalHtml = `<div class="pdf-placeholder"><i class="fa-solid fa-spinner fa-spin"></i><h3>Cargando documento...</h3></div>`;
  documentContent.innerHTML = currentDocumentOriginalHtml;
  documentModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  documentContent.scrollTop = 0;

  try {
    const response = await fetch(item.path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Documento no disponible (${response.status})`);
    const documentData = await response.json();
    currentDocumentOriginalHtml = documentData.contenidoHtml || `<div class="pdf-placeholder"><i class="fa-solid fa-triangle-exclamation"></i><h3>Contenido no disponible</h3><p>El documento no contiene texto para mostrar.</p></div>`;
    documentContent.innerHTML = currentDocumentOriginalHtml;
  } catch (error) {
    console.error("Error al abrir el documento:", error);
    currentDocumentOriginalHtml = `<div class="pdf-placeholder"><i class="fa-solid fa-triangle-exclamation"></i><h3>No pudimos abrir el documento</h3><p>Volvé a intentarlo más tarde.</p></div>`;
    documentContent.innerHTML = currentDocumentOriginalHtml;
  }
}

function cerrarDocumento() {
  if (!documentModal || documentModal.classList.contains("hidden")) return;
  documentModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  currentDocument = null;
}

function buscarDentroDocumento() {
  const termino = documentSearch.value.trim();
  documentContent.innerHTML = currentDocumentOriginalHtml;
  documentMatchCount.textContent = "";
  if (termino.length < 2 || !currentDocumentOriginalHtml) return;

  const walker = document.createTreeWalker(documentContent, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let coincidencias = 0;
  const regex = new RegExp(`(${escaparRegex(termino)})`, "gi");

  nodes.forEach(node => {
    if (!regex.test(node.nodeValue)) return;
    regex.lastIndex = 0;
    const span = document.createElement("span");
    span.innerHTML = escaparHtml(node.nodeValue).replace(regex, match => {
      coincidencias += 1;
      return `<mark>${match}</mark>`;
    });
    node.parentNode.replaceChild(span, node);
  });
  documentMatchCount.textContent = `${coincidencias} coincidencia${coincidencias === 1 ? "" : "s"}`;
  documentContent.querySelector("mark")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function guardarPerfil(event) {
  event.preventDefault();
  limpiarMensaje();
  const telefono = telefonoInput.value.trim();
  const nuevoEmail = emailInput.value.trim().toLowerCase();
  const emailActual = String(currentUser.email || "").toLowerCase();
  if (!nuevoEmail || !esCorreoValido(nuevoEmail)) return mostrarMensaje("Ingresá un correo electrónico válido.", "error");

  establecerBotonCargando(saveProfileButton, true);
  try {
    const { error: telefonoError } = await supabaseClient.rpc("actualizar_mi_perfil", { p_telefono: telefono });
    if (telefonoError) throw telefonoError;
    currentProfile.telefono = telefono;
    if (nuevoEmail !== emailActual) {
      const { data, error: emailError } = await supabaseClient.auth.updateUser({ email: nuevoEmail });
      if (emailError) throw emailError;
      currentUser = data.user || currentUser;
      mostrarMensaje("El teléfono fue actualizado. Revisá tu correo para confirmar el cambio de email, si Supabase lo solicita.", "warning");
    } else {
      mostrarMensaje("Tus datos fueron actualizados correctamente.", "success");
    }
  } catch (error) {
    console.error("No se pudo actualizar el perfil:", error);
    mostrarMensaje(traducirErrorPerfil(error.message), "error");
  } finally {
    establecerBotonCargando(saveProfileButton, false);
  }
}

async function cambiarPassword(event) {
  event.preventDefault();
  limpiarMensaje();
  const password = newPasswordInput.value;
  const confirmar = confirmPasswordInput.value;
  if (password.length < 8) return mostrarMensaje("La contraseña debe tener al menos 8 caracteres.", "error");
  if (password !== confirmar) return mostrarMensaje("Las contraseñas no coinciden.", "error");

  establecerBotonCargando(savePasswordButton, true);
  try {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    passwordForm.reset();
    mostrarMensaje("La contraseña fue actualizada correctamente.", "success");
  } catch (error) {
    console.error("No se pudo actualizar la contraseña:", error);
    mostrarMensaje("No se pudo actualizar la contraseña. Intentá nuevamente.", "error");
  } finally {
    establecerBotonCargando(savePasswordButton, false);
  }
}

async function cerrarSesion() {
  await supabaseClient.auth.signOut();
  window.location.replace("index.html");
}

function establecerBotonCargando(button, cargando) {
  if (!button.dataset.originalText) button.dataset.originalText = button.innerHTML;
  button.disabled = cargando;
  button.innerHTML = cargando ? '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...' : button.dataset.originalText;
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

function obtenerIniciales(nombre) {
  return String(nombre || "Usuario").split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte.charAt(0).toUpperCase()).join("");
}

function normalizar(valor) {
  return String(valor ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function esCorreoValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escaparHtml(valor) {
  const div = document.createElement("div");
  div.textContent = String(valor ?? "");
  return div.innerHTML;
}

function escaparRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function traducirErrorPerfil(mensajeOriginal) {
  const mensaje = normalizar(mensajeOriginal);
  if (mensaje.includes("already registered")) return "Ese correo electrónico ya pertenece a otra cuenta.";
  if (mensaje.includes("rate limit")) return "Se realizaron demasiados intentos. Esperá unos minutos.";
  return "No se pudieron guardar los cambios.";
}
