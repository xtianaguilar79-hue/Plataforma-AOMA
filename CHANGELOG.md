# SIGCA v0.7.2

- Buscador documental compacto después de ejecutar una búsqueda.
- El campo de búsqueda se oculta y queda una barra mínima con término, contador y navegación.
- Botón de lupa para modificar la búsqueda sin cerrar el documento.
- Mayor espacio vertical para lectura en teléfonos móviles.

# SIGCA v0.7.1

## Correcciones
- Menú lateral móvil con botón de cierre, fondo superpuesto y cierre al navegar.
- Tarjetas de Leyes y Convenios convertidas en accesos directos filtrados a Biblioteca.
- Tarjeta de Capacitaciones ahora informa que el módulo está en preparación.
- Buscador interno de documentos con navegación anterior/siguiente entre coincidencias.
- La coincidencia activa queda resaltada y numerada.
- Mismo cierre de menú móvil aplicado al panel administrador.

# SIGCA v0.7

## Añadido
- Identidad institucional SIGCA y nuevo logo AOMA sobre fondo blanco.
- Logo horizontal y versión compacta para componentes cuadrados.
- Biblioteca unificada en archivos JSON.
- CCT 37/89 convertido al mismo formato que el resto de los documentos.
- Índice único `content/index.json`.
- Esquema documental `content/schema-documento.json`.

## Modificado
- El dashboard carga la biblioteca mediante `fetch()`.
- Se eliminaron las dependencias de documentos JavaScript globales.
- Todos los convenios y leyes se consultan con el mismo visor.

## Conservado
- Autenticación, registro, recuperación de contraseña, perfil y administración.
- Tablas, políticas y datos existentes en Supabase.

## SQL
- Esta versión no requiere ejecutar SQL nuevo.
