-- 0007 — Separar área (secretaría institucional) de procedimiento (tipo de licitación)

-- Mover valores legacy obras/educacion de tipo -> area
UPDATE tramites SET area = tipo
WHERE area IS NULL AND tipo IN ('obras', 'educacion');

UPDATE tramites SET area = 'obras'
WHERE area IS NULL AND tipo IS NOT NULL
  AND (lower(tipo) LIKE '%obras%public%' OR lower(tipo) LIKE '%obra%public%');

UPDATE tramites SET area = 'educacion'
WHERE area IS NULL AND tipo IS NOT NULL
  AND (lower(tipo) LIKE '%educ%' OR lower(tipo) LIKE '%educacion infra%');

-- Limpiar tipo: ya no guarda el área, solo el procedimiento de contratación
UPDATE tramites SET tipo = NULL
WHERE tipo IN ('obras', 'educacion')
   OR lower(tipo) LIKE '%obras%public%'
   OR lower(tipo) LIKE '%educacion infra%'
   OR lower(tipo) LIKE '%educación infra%';

-- Renombrar secretarías en la tabla lookup
UPDATE secretarias
SET nombre = 'Secretaría de Infraestructura y Planificación'
WHERE nombre IS NOT NULL
  AND (
    lower(nombre) LIKE '%obra%public%'
    OR lower(nombre) LIKE '%obras%public%'
    OR lower(trim(nombre)) IN ('obras', 'obra publica', 'obras publicas')
    OR lower(nombre) LIKE '%secretaria de obras%'
  )
  AND lower(nombre) NOT LIKE '%educ%';

UPDATE secretarias
SET nombre = 'Educación, Producción y Trabajo'
WHERE nombre IS NOT NULL
  AND (
    lower(nombre) LIKE '%educ%'
    OR lower(trim(nombre)) IN ('educacion', 'educación')
  );
