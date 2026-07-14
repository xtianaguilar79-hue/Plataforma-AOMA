-- AOMA - Panel administrativo v0.5
-- Ejecutar una sola vez en Supabase > SQL Editor.

CREATE OR REPLACE FUNCTION public.administrar_usuario(
    p_usuario_id UUID,
    p_rol TEXT,
    p_empresa TEXT,
    p_convenio TEXT,
    p_estado TEXT,
    p_activo BOOLEAN
)
RETURNS public.usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    usuario_actualizado public.usuarios;
    rol_normalizado TEXT;
    estado_normalizado TEXT;
BEGIN
    IF NOT public.es_administrador() THEN
        RAISE EXCEPTION 'Acceso no autorizado';
    END IF;

    rol_normalizado := INITCAP(LOWER(TRIM(p_rol)));
    estado_normalizado := INITCAP(LOWER(TRIM(p_estado)));

    IF rol_normalizado NOT IN ('Administrador', 'Dirigente', 'Delegado') THEN
        RAISE EXCEPTION 'Rol inválido';
    END IF;

    IF estado_normalizado NOT IN ('Pendiente', 'Aprobado', 'Rechazado', 'Bloqueado') THEN
        RAISE EXCEPTION 'Estado inválido';
    END IF;

    IF p_usuario_id = auth.uid()
       AND (
            p_activo = FALSE
            OR estado_normalizado <> 'Aprobado'
            OR rol_normalizado <> 'Administrador'
       )
    THEN
        RAISE EXCEPTION 'No podés quitarte tus propios permisos de administrador';
    END IF;

    UPDATE public.usuarios
    SET
        rol = rol_normalizado,
        empresa = NULLIF(TRIM(p_empresa), ''),
        convenio = NULLIF(TRIM(p_convenio), ''),
        estado = estado_normalizado,
        activo = p_activo,
        updated_at = NOW()
    WHERE id = p_usuario_id
    RETURNING * INTO usuario_actualizado;

    IF usuario_actualizado.id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    RETURN usuario_actualizado;
END;
$$;

REVOKE ALL ON FUNCTION public.administrar_usuario(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.administrar_usuario(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
