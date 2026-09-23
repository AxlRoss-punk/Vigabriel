const form = document.getElementById('form-marcacion');
const tablaBody = document.getElementById('tabla-body');
const mensaje = document.getElementById('mensaje');
const btnCancelar = document.getElementById('btn-cancelar');
const formTitulo = document.getElementById('form-titulo');

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
  setTimeout(() => {
    mensaje.textContent = '';
    mensaje.className = 'mensaje';
  }, 4000);
}

function limpiarFormulario() {
  form.reset();
  document.getElementById('marcacion-id').value = '';
  formTitulo.textContent = 'Registrar marcación';
  btnCancelar.style.display = 'none';
}

function leerFormulario() {
  return {
    codigo_empleado: document.getElementById('codigo_empleado').value.trim(),
    nombre_empleado: document.getElementById('nombre_empleado').value.trim(),
    fecha: document.getElementById('fecha').value,
    hora_ingreso_programada: document.getElementById('hora_ingreso_programada').value || null,
    hora_ingreso_real: document.getElementById('hora_ingreso_real').value,
    hora_salida_programada: document.getElementById('hora_salida_programada').value || null,
    hora_salida_real: document.getElementById('hora_salida_real').value || null,
    observacion: document.getElementById('observacion').value || null,
  };
}

async function cargarMarcaciones(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${window.API_URL}/marcaciones${query ? `?${query}` : ''}`;

  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    renderizarTabla(datos);
  } catch (err) {
    mostrarMensaje('No se pudo conectar con la API', 'error');
  }
}

function renderizarTabla(marcaciones) {
  tablaBody.innerHTML = '';
  marcaciones.forEach((m) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${m.id}</td>
      <td>${m.codigo_empleado}</td>
      <td>${m.nombre_empleado}</td>
      <td>${m.fecha ? m.fecha.substring(0, 10) : ''}</td>
      <td>${m.hora_ingreso_programada ?? ''}</td>
      <td>${m.hora_ingreso_real ?? ''}</td>
      <td>${m.hora_salida_programada ?? ''}</td>
      <td>${m.hora_salida_real ?? ''}</td>
      <td class="estado-${m.estado}">${m.estado}</td>
      <td>${m.observacion ?? ''}</td>
      <td class="acciones-tabla">
        <button class="btn-editar" data-id="${m.id}">Editar</button>
        <button class="btn-eliminar" data-id="${m.id}">Eliminar</button>
      </td>
    `;
    tablaBody.appendChild(fila);
  });
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const id = document.getElementById('marcacion-id').value;
  const cuerpo = leerFormulario();

  const url = id ? `${window.API_URL}/marcaciones/${id}` : `${window.API_URL}/marcaciones`;
  const metodo = id ? 'PUT' : 'POST';

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarMensaje(datos.detalles ? datos.detalles.join(', ') : datos.error, 'error');
      return;
    }

    mostrarMensaje(id ? 'Marcación actualizada' : 'Marcación registrada', 'ok');
    limpiarFormulario();
    cargarMarcaciones();
  } catch (err) {
    mostrarMensaje('Error al comunicarse con la API', 'error');
  }
});

tablaBody.addEventListener('click', async (evento) => {
  const id = evento.target.dataset.id;
  if (!id) return;

  if (evento.target.classList.contains('btn-eliminar')) {
    if (!confirm(`¿Eliminar la marcación ${id}?`)) return;
    try {
      const respuesta = await fetch(`${window.API_URL}/marcaciones/${id}`, { method: 'DELETE' });
      if (!respuesta.ok) throw new Error();
      mostrarMensaje('Marcación eliminada', 'ok');
      cargarMarcaciones();
    } catch (err) {
      mostrarMensaje('No se pudo eliminar la marcación', 'error');
    }
  }

  if (evento.target.classList.contains('btn-editar')) {
    try {
      const respuesta = await fetch(`${window.API_URL}/marcaciones/${id}`);
      const m = await respuesta.json();
      document.getElementById('marcacion-id').value = m.id;
      document.getElementById('codigo_empleado').value = m.codigo_empleado;
      document.getElementById('nombre_empleado').value = m.nombre_empleado;
      document.getElementById('fecha').value = m.fecha ? m.fecha.substring(0, 10) : '';
      document.getElementById('hora_ingreso_programada').value = m.hora_ingreso_programada ?? '';
      document.getElementById('hora_ingreso_real').value = m.hora_ingreso_real ?? '';
      document.getElementById('hora_salida_programada').value = m.hora_salida_programada ?? '';
      document.getElementById('hora_salida_real').value = m.hora_salida_real ?? '';
      document.getElementById('observacion').value = m.observacion ?? '';
      formTitulo.textContent = `Editando marcación #${m.id}`;
      btnCancelar.style.display = 'inline-block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      mostrarMensaje('No se pudo cargar la marcación', 'error');
    }
  }
});

btnCancelar.addEventListener('click', limpiarFormulario);

document.getElementById('btn-filtrar').addEventListener('click', () => {
  const empleado = document.getElementById('filtro-empleado').value.trim();
  const fecha = document.getElementById('filtro-fecha').value;
  const params = {};
  if (empleado) params.empleado = empleado;
  if (fecha) params.fecha = fecha;
  cargarMarcaciones(params);
});

document.getElementById('btn-limpiar-filtro').addEventListener('click', () => {
  document.getElementById('filtro-empleado').value = '';
  document.getElementById('filtro-fecha').value = '';
  cargarMarcaciones();
});

cargarMarcaciones();
