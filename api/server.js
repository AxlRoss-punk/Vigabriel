const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

function calcularEstado(horaProgramada, horaReal) {
  if (!horaProgramada || !horaReal) return 'INCOMPLETO';
  const [hp, mp] = horaProgramada.split(':').map(Number);
  const [hr, mr] = horaReal.split(':').map(Number);
  const minutosProgramados = hp * 60 + mp;
  const minutosReales = hr * 60 + mr;
  return minutosReales <= minutosProgramados ? 'PUNTUAL' : 'ATRASO';
}

function validarMarcacion(body) {
  const errores = [];
  const {
    codigo_empleado,
    nombre_empleado,
    fecha,
    hora_ingreso_programada,
    hora_ingreso_real,
    hora_salida_programada,
    hora_salida_real,
  } = body;

  if (!codigo_empleado || !codigo_empleado.trim()) {
    errores.push('codigo_empleado es obligatorio');
  }
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    errores.push('fecha es obligatoria y debe tener formato YYYY-MM-DD');
  }
  if (!hora_ingreso_real || !HORA_REGEX.test(hora_ingreso_real)) {
    errores.push('hora_ingreso_real es obligatoria y debe tener formato HH:MM');
  }
  if (hora_ingreso_programada && !HORA_REGEX.test(hora_ingreso_programada)) {
    errores.push('hora_ingreso_programada tiene formato inválido');
  }
  if (hora_salida_programada && !HORA_REGEX.test(hora_salida_programada)) {
    errores.push('hora_salida_programada tiene formato inválido');
  }
  if (hora_salida_real && !HORA_REGEX.test(hora_salida_real)) {
    errores.push('hora_salida_real tiene formato inválido');
  }
  if (hora_salida_real && hora_ingreso_real && HORA_REGEX.test(hora_salida_real) && HORA_REGEX.test(hora_ingreso_real)) {
    if (hora_salida_real < hora_ingreso_real) {
      errores.push('hora_salida_real no puede ser anterior a hora_ingreso_real');
    }
  }
  if (!nombre_empleado || !nombre_empleado.trim()) {
    errores.push('nombre_empleado es obligatorio');
  }

  return errores;
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', detalle: err.message });
  }
});

app.post('/api/marcaciones', async (req, res) => {
  const errores = validarMarcacion(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
  }

  const {
    codigo_empleado,
    nombre_empleado,
    fecha,
    hora_ingreso_programada,
    hora_ingreso_real,
    hora_salida_programada,
    hora_salida_real,
    observacion,
  } = req.body;

  const estado = calcularEstado(hora_ingreso_programada, hora_ingreso_real);

  try {
    const resultado = await pool.query(
      `INSERT INTO marcaciones
        (codigo_empleado, nombre_empleado, fecha, hora_ingreso_programada, hora_ingreso_real,
         hora_salida_programada, hora_salida_real, estado, observacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        codigo_empleado,
        nombre_empleado,
        fecha,
        hora_ingreso_programada || null,
        hora_ingreso_real,
        hora_salida_programada || null,
        hora_salida_real || null,
        estado,
        observacion || null,
      ]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno', detalle: err.message });
  }
});

app.get('/api/marcaciones', async (req, res) => {
  const { empleado, fecha } = req.query;
  const condiciones = [];
  const valores = [];

  if (empleado) {
    valores.push(empleado);
    condiciones.push(`codigo_empleado = $${valores.length}`);
  }
  if (fecha) {
    valores.push(fecha);
    condiciones.push(`fecha = $${valores.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const resultado = await pool.query(
      `SELECT * FROM marcaciones ${where} ORDER BY id DESC`,
      valores
    );
    res.status(200).json(resultado.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno', detalle: err.message });
  }
});

app.get('/api/marcaciones/:id', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM marcaciones WHERE id = $1', [req.params.id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Marcación no encontrada' });
    }
    res.status(200).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno', detalle: err.message });
  }
});

app.put('/api/marcaciones/:id', async (req, res) => {
  const errores = validarMarcacion(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
  }

  const existente = await pool.query('SELECT * FROM marcaciones WHERE id = $1', [req.params.id]);
  if (existente.rows.length === 0) {
    return res.status(404).json({ error: 'Marcación no encontrada' });
  }

  const {
    codigo_empleado,
    nombre_empleado,
    fecha,
    hora_ingreso_programada,
    hora_ingreso_real,
    hora_salida_programada,
    hora_salida_real,
    observacion,
  } = req.body;

  const estado = calcularEstado(hora_ingreso_programada, hora_ingreso_real);

  try {
    const resultado = await pool.query(
      `UPDATE marcaciones SET
        codigo_empleado = $1,
        nombre_empleado = $2,
        fecha = $3,
        hora_ingreso_programada = $4,
        hora_ingreso_real = $5,
        hora_salida_programada = $6,
        hora_salida_real = $7,
        estado = $8,
        observacion = $9
       WHERE id = $10
       RETURNING *`,
      [
        codigo_empleado,
        nombre_empleado,
        fecha,
        hora_ingreso_programada || null,
        hora_ingreso_real,
        hora_salida_programada || null,
        hora_salida_real || null,
        estado,
        observacion || null,
        req.params.id,
      ]
    );
    res.status(200).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno', detalle: err.message });
  }
});

app.delete('/api/marcaciones/:id', async (req, res) => {
  try {
    const resultado = await pool.query('DELETE FROM marcaciones WHERE id = $1 RETURNING *', [req.params.id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Marcación no encontrada' });
    }
    res.status(200).json({ mensaje: 'Marcación eliminada', marcacion: resultado.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error interno', detalle: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API de marcaciones escuchando en el puerto ${PORT}`);
});
