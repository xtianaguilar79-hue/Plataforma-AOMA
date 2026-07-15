"use strict";
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const sections = { escritorio: $("#escritorioSection"), institucional: $("#institucionalSection"), conocimiento: $("#conocimientoSection"), capacitacion: $("#capacitacionSection"), gestion: $("#gestionSection"), perfil: $("#perfilSection") };
  let currentUser = null;
  let currentProfile = null;
  let library = [];
  let filter = "todos";
  let currentDocumentHtml = "";
  let matches = [];
  let matchIndex = -1;
  let course = null;
  let activeModule = 0;
  const navButtons = $$("[data-section]");
  window.addEventListener("DOMContentLoaded", init);
  var _a;
  (_a = $("#logoutButton")) == null ? void 0 : _a.addEventListener("click", logout);
  var _a2;
  (_a2 = $("#menuButton")) == null ? void 0 : _a2.addEventListener("click", toggleSidebar);
  var _a3;
  (_a3 = $("#closeSidebarButton")) == null ? void 0 : _a3.addEventListener("click", closeSidebar);
  var _a4;
  (_a4 = $("#sidebarBackdrop")) == null ? void 0 : _a4.addEventListener("click", closeSidebar);
  var _a5;
  (_a5 = $("#profileShortcut")) == null ? void 0 : _a5.addEventListener("click", () => showSection("perfil"));
  var _a6;
  (_a6 = $("#themeButton")) == null ? void 0 : _a6.addEventListener("click", cycleTheme);
  var _a7;
  (_a7 = $("#themeSelect")) == null ? void 0 : _a7.addEventListener("change", (e) => setTheme(e.target.value));
  navButtons.forEach((b) => b.addEventListener("click", () => showSection(b.dataset.section)));
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => {
    showSection(b.dataset.go);
    if (b.dataset.filter) changeFilter(b.dataset.filter);
  }));
  $$("[data-open-course]").forEach((b) => b.addEventListener("click", openCourse));
  var _a8;
  (_a8 = $("#profileForm")) == null ? void 0 : _a8.addEventListener("submit", saveProfile);
  var _a9;
  (_a9 = $("#passwordForm")) == null ? void 0 : _a9.addEventListener("submit", changePassword);
  var _a10;
  (_a10 = $("#librarySearch")) == null ? void 0 : _a10.addEventListener("input", renderLibrary);
  $$("[data-library-filter]").forEach((b) => b.addEventListener("click", () => changeFilter(b.dataset.libraryFilter)));
  var _a11;
  (_a11 = $("#closeDocumentButton")) == null ? void 0 : _a11.addEventListener("click", closeDocument);
  var _a12;
  (_a12 = $("#documentModal")) == null ? void 0 : _a12.addEventListener("click", (e) => {
    if (e.target.id === "documentModal") closeDocument();
  });
  var _a13;
  (_a13 = $("#documentSearchForm")) == null ? void 0 : _a13.addEventListener("submit", searchDocument);
  var _a14;
  (_a14 = $("#editDocumentSearchButton")) == null ? void 0 : _a14.addEventListener("click", editDocumentSearch);
  var _a15;
  (_a15 = $("#previousMatchButton")) == null ? void 0 : _a15.addEventListener("click", () => navigateMatch(-1));
  var _a16;
  (_a16 = $("#nextMatchButton")) == null ? void 0 : _a16.addEventListener("click", () => navigateMatch(1));
  var _a17;
  (_a17 = $("#enterSigcaButton")) == null ? void 0 : _a17.addEventListener("click", closeWelcome);
  var _a18;
  (_a18 = $("#closeCourseButton")) == null ? void 0 : _a18.addEventListener("click", closeCourse);
  var _a19;
  var _a18b;
  (_a18b = $("#startCourseButton")) == null ? void 0 : _a18b.addEventListener("click", startCourseLearning);
  (_a19 = $("#courseModal")) == null ? void 0 : _a19.addEventListener("click", (e) => {
    if (e.target.id === "courseModal") closeCourse();
  });
  var _a20;
  (_a20 = $("#globalSearchButton")) == null ? void 0 : _a20.addEventListener("click", openGlobalSearch);
  var _a21;
  (_a21 = $("#closeGlobalSearch")) == null ? void 0 : _a21.addEventListener("click", closeGlobalSearch);
  var _a22;
  (_a22 = $("#globalSearchModal")) == null ? void 0 : _a22.addEventListener("click", (e) => {
    if (e.target.id === "globalSearchModal") closeGlobalSearch();
  });
  var _a23;
  (_a23 = $("#globalSearchInput")) == null ? void 0 : _a23.addEventListener("input", renderGlobalSearch);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openGlobalSearch();
    }
    if (e.key === "Escape") {
      closeDocument();
      closeCourse();
      closeGlobalSearch();
    }
  });
  $$("[data-org]").forEach((b) => b.addEventListener("click", () => switchOrg(b.dataset.org)));
  async function init() {
    try {
      applyStoredTheme();
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error || !(session == null ? void 0 : session.user)) return location.replace("index.html");
      currentUser = session.user;
      currentProfile = await getProfile(currentUser.id);
      if (!currentProfile) return logout();
      const role = norm(currentProfile.rol), state = norm(currentProfile.estado);
      if (state !== "aprobado" || currentProfile.activo === false) {
        await supabaseClient.auth.signOut();
        return location.replace("index.html");
      }
      if (role === "administrador" || role === "admin") return location.replace("admin.html");
      fillProfile();
      await Promise.all([loadLibrary(), loadCourse()]);
      renderOrg();
      $("#loadingState").classList.add("hidden");
      showSection("escritorio");
      setTimeout(showWelcome, 250);
      registerSW();
    } catch (e) {
      console.error(e);
      const l = $("#loadingState");
      if (l) l.classList.add("hidden");
      const b = $("#mobileBootError");
      if (b) {
        b.style.display = "block";
        b.textContent = "No se pudo iniciar SIGCA: " + ((e == null ? void 0 : e.message) || "error desconocido");
      }
      message("No se pudo iniciar SIGCA.", "error");
    }
  }
  async function getProfile(id) {
    const { data, error } = await supabaseClient.from("usuarios").select("id,nombre,apellido,dni,telefono,mail,rol,empresa,convenio,estado,activo").eq("id", id).maybeSingle();
    if (error) console.error(error);
    return data;
  }
  function fillProfile() {
    const full = [currentProfile.nombre, currentProfile.apellido].filter(Boolean).join(" "), ini = initials(full);
    ["userName", "sidebarName"].forEach((id) => $("#" + id).textContent = full || "Usuario");
    ["userRole", "sidebarRole", "profileRole"].forEach((id) => $("#" + id).textContent = currentProfile.rol || "Perfil");
    ["userAvatar", "sidebarAvatar", "profileAvatar"].forEach((id) => $("#" + id).textContent = ini);
    $("#profileName").textContent = full;
    $("#profileCompany").textContent = currentProfile.empresa || "Sin empresa";
    $("#profileAgreement").textContent = currentProfile.convenio || "Sin convenio";
    $("#nombre").value = currentProfile.nombre || "";
    $("#apellido").value = currentProfile.apellido || "";
    $("#dni").value = currentProfile.dni || "";
    $("#telefono").value = currentProfile.telefono || "";
    $("#email").value = currentUser.email || currentProfile.mail || "";
    $("#welcomeTitle").textContent = `Buenos días, ${currentProfile.nombre || "compañero"}`;
  }
  function showSection(name) {
    var _a24;
    Object.values(sections).forEach((s) => s == null ? void 0 : s.classList.add("hidden"));
    (_a24 = sections[name]) == null ? void 0 : _a24.classList.remove("hidden");
    navButtons.forEach((b) => b.classList.toggle("active", b.dataset.section === name));
    const titles = { escritorio: "Mi Escritorio", institucional: "Institucional", conocimiento: "Centro de Conocimiento", capacitacion: "Capacitación", gestion: "Gestión Sindical", perfil: "Mi Perfil" };
    $("#pageTitle").textContent = titles[name] || "SIGCA";
    closeSidebar();
    scrollTo({ top: 0, behavior: "smooth" });
  }
  function toggleSidebar() {
    const open = !$("#sidebar").classList.contains("open");
    $("#sidebar").classList.toggle("open", open);
    $("#sidebarBackdrop").classList.toggle("hidden", !open);
    document.body.classList.toggle("sidebar-open", open);
  }
  function closeSidebar() {
    $("#sidebar").classList.remove("open");
    $("#sidebarBackdrop").classList.add("hidden");
    document.body.classList.remove("sidebar-open");
  }
  async function loadLibrary() {
    try {
      const r = await fetch("content/index.json", { cache: "no-store" });
      const j = await r.json();
      library = Array.isArray(j.documentos) ? j.documentos : [];
    } catch (e) {
      library = [];
      console.error(e);
    }
    $("#lawsCount").textContent = library.filter((x) => x.tipo === "ley").length;
    $("#agreementsCount").textContent = library.filter((x) => x.tipo === "convenio").length;
    $("#libraryTotal").textContent = library.length;
    $("#profileDocsCount").textContent = library.length;
    renderFeatured();
    renderLibrary();
  }
  function renderFeatured() {
    const ids = ["lct-20744", "ley-23551", "cct-38-89"];
    $("#featuredDocuments").innerHTML = "";
    ids.map((id) => library.find((x) => x.id === id)).filter(Boolean).forEach((item) => {
      const b = document.createElement("button");
      b.className = "featured-card";
      b.innerHTML = `<span class="document-icon"><i class="fa-solid ${item.icono || "fa-file-lines"}"></i></span><span><small>${esc(item.numero)}</small><strong>${esc(item.titulo)}</strong></span><i class="fa-solid fa-arrow-up-right-from-square"></i>`;
      b.onclick = () => openDocument(item);
      $("#featuredDocuments").appendChild(b);
    });
  }
  function changeFilter(v) {
    filter = v;
    $$("[data-library-filter]").forEach((b) => b.classList.toggle("active", b.dataset.libraryFilter === v));
    renderLibrary();
  }
  function renderLibrary() {
    var _a24;
    const q = norm((_a24 = $("#librarySearch")) == null ? void 0 : _a24.value), items = library.filter((x) => (filter === "todos" || x.tipo === filter) && (!q || norm(`${x.numero} ${x.titulo} ${x.categoria} ${x.resumen} ${(x.palabrasClave || []).join(" ")}`).includes(q)));
    $("#libraryGrid").innerHTML = "";
    $("#libraryResultsInfo").textContent = `${items.length} documento${items.length === 1 ? "" : "s"} encontrado${items.length === 1 ? "" : "s"}`;
    $("#libraryEmpty").classList.toggle("hidden", items.length > 0);
    items.forEach((item) => {
      const a = document.createElement("article");
      a.className = "library-card";
      const kind = item.tipo === "ley" ? "LEY" : "CONVENIO COLECTIVO";
      a.innerHTML = `<div class="document-cover document-cover-${item.tipo}"><span>${kind}</span><strong>${esc(item.numero)}</strong><small>${esc(item.categoria || "Documento institucional")}</small></div><div class="document-card-body"><p class="document-number">${esc(item.numero)}</p><h3>${esc(item.titulo)}</h3><p class="document-summary">${esc(item.resumen || "")}</p><div class="library-card-footer"><span>${item.tipo === "ley" ? "Legislación" : "Normativa convencional"}</span><button>Leer documento <i class="fa-solid fa-arrow-right"></i></button></div></div>`;
      a.querySelector("button").onclick = () => openDocument(item);
      $("#libraryGrid").appendChild(a);
    });
  }
  async function openDocument(item) {
    $("#documentNumber").textContent = item.numero;
    $("#documentTitle").textContent = item.titulo;
    $("#documentCategory").textContent = item.categoria || "";
    $("#documentContent").innerHTML = "<p>Cargando documento...</p>";
    $("#documentModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    resetMatches();
    try {
      const r = await fetch(item.path, { cache: "no-store" });
      const j = await r.json();
      currentDocumentHtml = j.contenidoHtml || "<p>Contenido no disponible.</p>";
      $("#documentContent").innerHTML = currentDocumentHtml;
    } catch (e) {
      currentDocumentHtml = "<p>No pudimos abrir el documento.</p>";
      $("#documentContent").innerHTML = currentDocumentHtml;
    }
  }
  function closeDocument() {
    if (!$("#documentModal") || $("#documentModal").classList.contains("hidden")) return;
    $("#documentModal").classList.add("hidden");
    document.body.style.overflow = "";
  }
  function searchDocument(e) {
    e.preventDefault();
    const term = $("#documentSearch").value.trim();
    $("#documentContent").innerHTML = currentDocumentHtml;
    resetMatches();
    if (term.length < 2) return;
    const walker = document.createTreeWalker($("#documentContent"), NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const rx = new RegExp(`(${regex(term)})`, "gi");
    nodes.forEach((n) => {
      if (!rx.test(n.nodeValue)) return;
      rx.lastIndex = 0;
      const span = document.createElement("span");
      span.innerHTML = esc(n.nodeValue).replace(rx, (m) => `<mark class="document-match">${m}</mark>`);
      n.parentNode.replaceChild(span, n);
    });
    matches = [...$("#documentContent").querySelectorAll("mark.document-match")];
    if (matches.length) {
      $("#documentSearchForm").classList.add("hidden");
      $("#documentSearchNavigation").classList.remove("hidden");
      $("#documentSearchTerm").textContent = term;
      matchIndex = 0;
      activateMatch();
    } else $("#documentMatchCount").textContent = "Sin coincidencias";
  }
  function resetMatches() {
    matches = [];
    matchIndex = -1;
    $("#documentSearchForm").classList.remove("hidden");
    $("#documentSearchNavigation").classList.add("hidden");
    $("#documentSearch").value = "";
  }
  function editDocumentSearch() {
    $("#documentSearchForm").classList.remove("hidden");
    $("#documentSearchNavigation").classList.add("hidden");
    $("#documentSearch").focus();
    $("#documentSearch").select();
  }
  function navigateMatch(d) {
    if (!matches.length) return;
    matchIndex = (matchIndex + d + matches.length) % matches.length;
    activateMatch();
  }
  function activateMatch() {
    matches.forEach((m, i) => m.classList.toggle("active-match", i === matchIndex));
    $("#documentMatchCount").textContent = `${matchIndex + 1} de ${matches.length}`;
    matches[matchIndex].scrollIntoView({ behavior: "smooth", block: "center" });
  }
  async function loadCourse() {
    try {
      const r = await fetch("content/cursos/negociacion-colectiva.json", { cache: "no-store" });
      course = await r.json();
    } catch (e) {
      console.error(e);
      course = { modulos: [] };
    }
    updateProgress();
  }
  function progressSet() {
    return new Set(JSON.parse(localStorage.getItem("sigca-course-negociacion") || "[]"));
  }
  function saveProgress(set) {
    localStorage.setItem("sigca-course-negociacion", JSON.stringify([...set]));
    updateProgress();
  }
  function updateProgress() {
    var _a24;
    const total = ((_a24 = course == null ? void 0 : course.modulos) == null ? void 0 : _a24.length) || 8, done = progressSet().size, p = Math.round(done / total * 100);
    ["deskCoursePercent", "coursePercent", "courseLandingPercent"].forEach((id) => $("#" + id).textContent = p + "%");
    ["deskProgressBar", "courseProgressBar", "courseLandingProgressBar"].forEach((id) => $("#" + id).style.width = p + "%");
  }
  function openCourse() {
    if (!course) return message("El curso todavía está cargando.", "warning");
    $("#courseModal").classList.remove("hidden");
    $("#courseLanding").classList.remove("hidden");
    $("#courseLearningView").classList.add("hidden");
    document.body.style.overflow = "hidden";
    updateProgress();
  }
  function startCourseLearning() {
    $("#courseLanding").classList.add("hidden");
    $("#courseLearningView").classList.remove("hidden");
    renderModules();
    showLesson(activeModule);
  }
  function closeCourse() {
    $("#courseModal").classList.add("hidden");
    document.body.style.overflow = "";
  }
  function renderModules() {
    const done = progressSet();
    $("#courseModules").innerHTML = "";
    course.modulos.forEach((m, i) => {
      const b = document.createElement("button");
      b.className = `module-button ${i === activeModule ? "active" : ""} ${done.has(m.id) ? "done" : ""}`;
      b.innerHTML = `<span class="module-index">${done.has(m.id) ? '<i class="fa-solid fa-check"></i>' : i + 1}</span><span><strong>${esc(m.titulo)}</strong><small>${m.minutos} minutos</small></span><i class="fa-solid fa-chevron-right"></i>`;
      b.onclick = () => {
        activeModule = i;
        renderModules();
        showLesson(i);
      };
      $("#courseModules").appendChild(b);
    });
  }
  function showLesson(i) {
    const m = course.modulos[i], done = progressSet();
    $("#lessonContent").innerHTML = `<p class="eyebrow">Módulo ${i + 1} de ${course.modulos.length}</p>${m.html}<div class="lesson-nav"><button class="secondary-button" id="prevLesson" ${i === 0 ? "disabled" : ""}><i class="fa-solid fa-arrow-left"></i> Anterior</button><button class="primary-button" id="completeLesson">${done.has(m.id) ? '<i class="fa-solid fa-check"></i> Completado' : "Marcar como completado"}</button><button class="secondary-button" id="nextLesson" ${i === course.modulos.length - 1 ? "disabled" : ""}>Siguiente <i class="fa-solid fa-arrow-right"></i></button></div>`;
    $("#prevLesson").onclick = () => {
      if (i > 0) {
        activeModule = i - 1;
        renderModules();
        showLesson(activeModule);
      }
    };
    $("#nextLesson").onclick = () => {
      if (i < course.modulos.length - 1) {
        activeModule = i + 1;
        renderModules();
        showLesson(activeModule);
      }
    };
    $("#completeLesson").onclick = () => {
      const s = progressSet();
      s.add(m.id);
      saveProgress(s);
      renderModules();
      showLesson(i);
    };
    initLessonInteractions(m.id);
  }
  function initLessonInteractions(moduleId) {
    $$("#lessonContent .knowledge-check").forEach((check) => {
      check.querySelectorAll(".knowledge-option").forEach((option) => {
        option.onclick = () => {
          if (check.dataset.answered === "1") return;
          check.dataset.answered = "1";
          const correct = option.dataset.correct === "true";
          check.querySelectorAll(".knowledge-option").forEach((btn) => {
            btn.disabled = true;
            if (btn.dataset.correct === "true") btn.classList.add("is-correct");
          });
          option.classList.add(correct ? "is-selected-correct" : "is-incorrect");
          const feedback = check.querySelector(".knowledge-feedback");
          if (feedback) {
            feedback.textContent = correct ? "Correcto. La respuesta refleja los principios desarrollados en el módulo." : "Revisá el desarrollo anterior. La opción correcta quedó señalada.";
            feedback.classList.add(correct ? "success" : "warning");
          }
        };
      });
    });
    $$("#lessonContent .reflection-text").forEach((area) => {
      const key = `sigca-reflection-${area.dataset.note || moduleId}`;
      area.value = localStorage.getItem(key) || "";
    });
    $$("#lessonContent .save-reflection").forEach((button) => {
      button.onclick = () => {
        const key = `sigca-reflection-${button.dataset.note || moduleId}`;
        const area = $("#lessonContent .reflection-text[data-note='" + (button.dataset.note || moduleId) + "']");
        if (area) localStorage.setItem(key, area.value.trim());
        const status = button.parentElement.querySelector(".reflection-status");
        if (status) {
          status.textContent = "Reflexión guardada en este dispositivo.";
          setTimeout(() => status.textContent = "", 2500);
        }
      };
    });
  }
  function renderOrg() {
    const nacional = [["Secretario General", "Laplace Héctor Oscar"], ["Secretario Adjunto", "Malla Iván Marcelo"], ["Secretario Administrativo", "Molina Gustavo Gabriel"], ["Tesorero", "Savid Héctor Horacio"], ["Secretario Gremial e Interior", "Santillán Alejandro José"], ["Secretario Social y Turismo", "Gauna Emmanuel"], ["Secretario de Prensa y Cultura", "Castro Javier Omar"], ["Secretario de Higiene, Seguridad y Medicina del Trabajo", "Castro Emanuel Maximiliano"]];
    const sj = [["Secretario General", "Malla Iván Marcelo"], ["Secretario Adjunto", "Malla Raúl Edgardo"], ["Secretario Administrativo", "Ortiz Rubén Eloy"], ["Tesorero", "Frías Juan Norberto"], ["Secretario Gremial e Interior", "Soria Cristian Daniel"], ["Secretario Social y Turismo", "Martín Arenas Rubén"], ["Secretario de Higiene, Seguridad y Medicina del Trabajo", "Aguilar Cristian"]];
    $("#orgNacional").innerHTML = orgHtml("Consejo Directivo Nacional · Período 2026–2030", nacional);
    $("#orgSanJuan").innerHTML = orgHtml("Comisión Directiva San Juan · Período 2026–2030", sj);
  }
  function orgHtml(title, people) {
    return `<div class="panel-heading"><div><p class="eyebrow">Organigrama</p><h2>${title}</h2></div></div><div class="org-chart"><div class="org-row">${people.map((p) => `<article class="org-person"><span>${esc(p[0])}</span><strong>${esc(p[1])}</strong></article>`).join("")}</div></div>`;
  }
  function switchOrg(v) {
    $$("[data-org]").forEach((b) => b.classList.toggle("active", b.dataset.org === v));
    $("#orgNacional").classList.toggle("hidden", v !== "nacional");
    $("#orgSanJuan").classList.toggle("hidden", v !== "sanjuan");
  }
  function showWelcome() {
    if (localStorage.getItem("sigca-welcome-hidden") === "1") return;
    $("#welcomeModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function closeWelcome() {
    if ($("#dontShowWelcome").checked) localStorage.setItem("sigca-welcome-hidden", "1");
    $("#welcomeModal").classList.add("hidden");
    document.body.style.overflow = "";
  }
  function applyStoredTheme() {
    const t = localStorage.getItem("sigca-theme") || "system";
    $("#themeSelect").value = t;
    applyThemeValue(t);
  }
  function setTheme(t) {
    localStorage.setItem("sigca-theme", t);
    applyThemeValue(t);
  }
  function applyThemeValue(t) {
    const resolved = t === "system" ? matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : t;
    document.documentElement.dataset.theme = resolved;
    $("#themeButton i").className = resolved === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }
  function cycleTheme() {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    $("#themeSelect").value = document.documentElement.dataset.theme;
  }
  function openGlobalSearch() {
    $("#globalSearchModal").classList.remove("hidden");
    setTimeout(() => $("#globalSearchInput").focus(), 50);
    renderGlobalSearch();
  }
  function closeGlobalSearch() {
    $("#globalSearchModal").classList.add("hidden");
  }
  function renderGlobalSearch() {
    const q = norm($("#globalSearchInput").value);
    const docs = library.filter((x) => !q || norm(`${x.numero} ${x.titulo} ${x.resumen}`).includes(q)).slice(0, 8);
    const staticItems = [{ title: "Introducción a la Negociación Colectiva", sub: "Capacitación", icon: "fa-graduation-cap", action: () => {
      closeGlobalSearch();
      showSection("capacitacion");
    } }, { title: "Organigrama AOMA", sub: "Institucional", icon: "fa-sitemap", action: () => {
      closeGlobalSearch();
      showSection("institucional");
    } }].filter((x) => !q || norm(x.title).includes(q));
    $("#globalSearchResults").innerHTML = "";
    [...staticItems, ...docs.map((d) => ({ title: d.titulo, sub: d.numero, icon: d.icono || "fa-file-lines", action: () => {
      closeGlobalSearch();
      openDocument(d);
    } }))].forEach((x) => {
      const b = document.createElement("button");
      b.className = "global-result";
      b.innerHTML = `<i class="fa-solid ${x.icon}"></i><span><strong>${esc(x.title)}</strong><span>${esc(x.sub)}</span></span>`;
      b.onclick = x.action;
      $("#globalSearchResults").appendChild(b);
    });
  }
  async function saveProfile(e) {
    e.preventDefault();
    const tel = $("#telefono").value.trim(), email = $("#email").value.trim().toLowerCase();
    try {
      const { error } = await supabaseClient.rpc("actualizar_mi_perfil", { p_telefono: tel });
      if (error) throw error;
      if (email && email !== currentUser.email) {
        const r = await supabaseClient.auth.updateUser({ email });
        if (r.error) throw r.error;
      }
      message("Tus datos fueron actualizados.", "success");
    } catch (err) {
      console.error(err);
      message("No se pudieron guardar los cambios.", "error");
    }
  }
  async function changePassword(e) {
    e.preventDefault();
    const p = $("#newPassword").value, c = $("#confirmPassword").value;
    if (p.length < 8) return message("La contraseña debe tener al menos 8 caracteres.", "error");
    if (p !== c) return message("Las contraseñas no coinciden.", "error");
    const { error } = await supabaseClient.auth.updateUser({ password: p });
    if (error) return message("No se pudo actualizar la contraseña.", "error");
    e.target.reset();
    message("Contraseña actualizada.", "success");
  }
  async function logout() {
    await supabaseClient.auth.signOut();
    location.replace("index.html");
  }
  function message(t, type) {
    const el = $("#pageMessage");
    el.textContent = t;
    el.className = `page-message ${type}`;
    scrollTo({ top: 0, behavior: "smooth" });
  }
  function registerSW() {
  }
  function initials(s) {
    return String(s || "Usuario").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join("");
  }
  function norm(v) {
    return String(v != null ? v : "").trim().toLowerCase();
  }
  function esc(v) {
    const d = document.createElement("div");
    d.textContent = String(v != null ? v : "");
    return d.innerHTML;
  }
  function regex(v) {
    return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
})();
