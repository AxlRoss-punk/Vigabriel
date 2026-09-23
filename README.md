# RRHH Marcaciones - Examen Cloud Computing

Aplicación multicontenedor para gestionar marcaciones de personal (ingreso y salida),
compuesta por 3 contenedores independientes:

- **web**: frontend estático (HTML/CSS/JS) servido con Nginx. Puerto host: `8080`.
- **api**: API REST en Node.js + Express. Puerto host: `4000`.
- **database**: PostgreSQL con volumen persistente. Puerto interno: `5432`.

## Requisitos

- Docker Desktop instalado y en ejecución.

## Puesta en marcha

1. Copiar `.env.example` a `.env` y ajustar los valores si se desea.
2. Ejecutar:

   ```
   docker compose up -d --build
   ```

3. Verificar contenedores:

   ```
   docker ps
   ```

4. Abrir la aplicación web: http://localhost:8080
5. Probar la API directamente: http://localhost:4000/api/marcaciones

## Endpoints de la API

| Método | Ruta                              | Descripción                          |
|--------|------------------------------------|---------------------------------------|
| POST   | /api/marcaciones                   | Registrar una marcación               |
| GET    | /api/marcaciones                   | Listar todas las marcaciones          |
| GET    | /api/marcaciones?empleado=EMP001   | Filtrar por código de empleado        |
| GET    | /api/marcaciones?fecha=2026-09-23  | Filtrar por fecha                     |
| GET    | /api/marcaciones/{id}              | Consultar una marcación por id        |
| PUT    | /api/marcaciones/{id}              | Modificar una marcación               |
| DELETE | /api/marcaciones/{id}              | Eliminar una marcación                |

## Estado automático

El backend calcula el campo `estado` comparando `hora_ingreso_programada` con
`hora_ingreso_real`: si la hora real es menor o igual a la programada, el estado es
`PUNTUAL`; en caso contrario, `ATRASO`.

## Persistencia

Los datos de PostgreSQL se guardan en el volumen Docker `db_data`, por lo que
sobreviven a la eliminación y recreación del contenedor `database`.

## Red interna

Los tres servicios se comunican a través de la red Docker `rrhhmarc-net`. La API
se conecta a la base de datos usando el nombre de servicio `database` (DNS interno
de Docker Compose), no `localhost`, porque cada contenedor tiene su propio
`localhost` aislado; `database` es el hostname que Docker resuelve dentro de la
red interna hacia el contenedor correspondiente.
