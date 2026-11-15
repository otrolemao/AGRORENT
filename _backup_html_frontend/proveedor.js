let idProveedor = null;
let archivosAcumulados = []; // ACUMULADOR DE FOTOS

document.addEventListener('DOMContentLoaded', () => {
    let usuarioGuardado = null;
    try {
        usuarioGuardado = JSON.parse(localStorage.getItem('agrorent_usuario'));
    } catch (error) {
        usuarioGuardado = null;
    }

    if (!usuarioGuardado || !usuarioGuardado.id_proveedor) {
        window.location.href = 'index.html';
        return;
    }

    idProveedor = usuarioGuardado.id_proveedor;

    cargarMaquinaria();
    cargarCategorias();
    cargarReservas();
    actualizarListaFotos(); // Inicializar la lista de fotos

    // Lógica para acumular fotos cuando se seleccionan
    const inputFotos = document.getElementById('fotos');
    if (inputFotos) {
        inputFotos.addEventListener('change', (e) => {
            for (let i = 0; i < e.target.files.length; i++) {
                if (archivosAcumulados.length < 5) {
                    archivosAcumulados.push(e.target.files[i]);
                } else {
                    mostrarToast('Solo puedes subir hasta 5 fotos', 'error');
                    break;
                }
            }
            // Limpiamos el input para que el usuario pueda volver a seleccionar
            e.target.value = ''; 
            actualizarListaFotos();
        });
    }

    const form = document.getElementById('formMaquinaria');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const patenteIngresada = document.getElementById('patente').value;
            const regexPatente = /^[A-Za-z]{4}-[0-9]{2,3}$/;

            if (!regexPatente.test(patenteIngresada)) {
                mostrarToast('Formato de patente inválido. Usa el formato ABCD-12', 'error');
                return;
            }
            
            const nuevaMaquina = new FormData();
            nuevaMaquina.append('id_proveedor', idProveedor);
            nuevaMaquina.append('id_categoria', document.getElementById('categoria').value);
            nuevaMaquina.append('marca', document.getElementById('marca').value);
            nuevaMaquina.append('modelo', document.getElementById('modelo').value);
            nuevaMaquina.append('anio', document.getElementById('anio').value);
            nuevaMaquina.append('patente', patenteIngresada);
            nuevaMaquina.append('precio_dia', document.getElementById('precio_dia').value);
            nuevaMaquina.append('descripcion', document.getElementById('descripcion').value);

            // Usamos el acumulador de fotos
            if (archivosAcumulados.length > 0) {
                for (let i = 0; i < archivosAcumulados.length; i++) {
                    if (archivosAcumulados[i].size > 5 * 1024 * 1024) {
                        mostrarToast('Cada imagen no puede superar los 5MB', 'error');
                        return;
                    }
                    nuevaMaquina.append('fotos', archivosAcumulados[i]);
                }
            }

            try {
                const respuesta = await fetch('/api/maquinaria', {
                    method: 'POST',
                    body: nuevaMaquina
                });

                if (respuesta.ok) {
                    mostrarToast('Máquina registrada con éxito', 'success');
                    form.reset(); 
                    archivosAcumulados = []; // Limpiamos el acumulador
                    actualizarListaFotos();  // Refrescamos la lista visual
                    cargarMaquinaria(); 
                } else {
                    const data = await respuesta.json();
                    mostrarToast(data.error || 'Error al registrar la máquina', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarToast('Error de conexión al registrar', 'error');
            }
        });
    }
});

// Función para actualizar la lista visual de fotos
function actualizarListaFotos() {
    const contenedor = document.getElementById('listaFotos');
    if (!contenedor) return;
    
    if (archivosAcumulados.length === 0) {
        contenedor.innerHTML = '<span>No has seleccionado fotos.</span>';
        return;
    }
    
    let html = '<ul style="margin: 5px 0; padding-left: 20px; list-style-type: disc;">';
    archivosAcumulados.forEach((archivo, index) => {
        html += `<li style="margin-bottom: 5px;">${archivo.name} 
            <button type="button" style="background: transparent; border: none; color: #dc3545; cursor: pointer; font-weight: bold; margin-left: 10px;" onclick="quitarFoto(${index})">X</button>
        </li>`;
    });
    html += '</ul>';
    contenedor.innerHTML = html;
}

// Función global para quitar una foto de la lista
window.quitarFoto = (index) => {
    archivosAcumulados.splice(index, 1);
    actualizarListaFotos();
};

async function cargarMaquinaria() {
    try {
        const respuesta = await fetch(`/api/maquinaria/buscar?id_proveedor=${encodeURIComponent(idProveedor)}`);
        const maquinas = await respuesta.json();
        
        const tbody = document.querySelector('#tablaMaquinaria tbody');
        if (!tbody) return;

        tbody.innerHTML = ''; 

        if (maquinas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No tienes máquinas registradas.</td></tr>';
            return;
        }

        maquinas.forEach(maquina => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${maquina.id_maquinaria}</td>
                <td>${maquina.marca}</td>
                <td>${maquina.modelo}</td>
                <td>$${maquina.precio_dia}</td>
                <td>${maquina.estado}</td>
                <td>
                    <button class="btn" style="margin-right: 6px;" onclick="abrirModalEditar(${maquina.id_maquinaria})">Editar</button>
                    <button class="btn btn-danger" onclick="eliminarMaquina(${maquina.id_maquinaria})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(fila);
        });
    } catch (error) {
        console.error('Error al cargar la maquinaria:', error);
    }
}

async function cargarCategorias() {
    try {
        const respuesta = await fetch('/api/maquinaria/categorias');
        const categorias = await respuesta.json();
        
        const select = document.getElementById('categoria');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccione una categoría</option>';
        categorias.forEach(cat => {
            select.innerHTML += `<option value="${cat.id_categoria}">${cat.nombre}</option>`;
        });
    } catch (error) {
        const select = document.getElementById('categoria');
        if (select) {
            select.innerHTML = `
                <option value="1">Tractor</option>
                <option value="2">Sembradora</option>
                <option value="3">Cosechadora</option>
                <option value="4">Rastra</option>
                <option value="5">Pulverizadora</option>
            `;
        }
    }
}

async function cargarReservas() {
    try {
        const respuesta = await fetch(`/api/reservas?id_proveedor=${encodeURIComponent(idProveedor)}`);
        const reservas = await respuesta.json();
        
        const tbody = document.querySelector('#tablaReservas tbody');
        if (!tbody) return;

        tbody.innerHTML = ''; 

        if (reservas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay reservas recibidas.</td></tr>';
            return;
        }

        reservas.forEach(reserva => {
            let colorEstado = '#212529';
            if (reserva.estado === 'Pendiente') colorEstado = '#f39c12';
            if (reserva.estado === 'Confirmada') colorEstado = '#07503f';
            if (reserva.estado === 'Cancelada' || reserva.estado === 'Rechazada') colorEstado = '#dc3545';

            let colorPago = '#212529';
            let textPago = '';
            
            if (reserva.estado_pago === 'Pagado') {
                colorPago = '#07503f';
                textPago = `Seña Pagada ($${Number(reserva.monto_seña).toLocaleString('es-CL')})`;
            } else if (reserva.estado_pago === 'Pendiente') {
                colorPago = '#f39c12';
                textPago = `Seña Pendiente`;
            } else if (reserva.estado_pago === 'Reembolsado') {
                colorPago = '#6d6d6d';
                textPago = `Seña Reembolsada ($${Number(reserva.monto_seña).toLocaleString('es-CL')})`;
            }

            let botones = '-';
            if (reserva.estado === 'Pendiente' && reserva.estado_pago === 'Pagado') {
                botones = `
                    <button class="btn-aceptar" onclick="cambiarEstadoReserva(${reserva.id_reserva}, 'Confirmada')">Aceptar</button>
                    <button class="btn-rechazar" onclick="cambiarEstadoReserva(${reserva.id_reserva}, 'Rechazada')">Rechazar</button>
                `;
            } else if (reserva.estado === 'Pendiente' && reserva.estado_pago === 'Pendiente') {
                botones = '<span style="font-size:12px; color:#dc3545;">Esperando pago del cliente</span>';
            }

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>#${reserva.id_reserva}</td>
                <td><strong>${reserva.marca} ${reserva.modelo}</strong></td>
                <td>${reserva.fecha_inicio.substring(0,10)} al ${reserva.fecha_fin.substring(0,10)}</td>
                <td>$${reserva.costo_estimado}</td>
                <td style="color: ${colorEstado}; font-weight: 600;">${reserva.estado}</td>
                <td>
                    <span style="color: ${colorPago}; font-weight: bold; font-size: 12px; display: block; margin-bottom: 5px;">${textPago}</span>
                    ${botones}
                </td>
            `;
            tbody.appendChild(fila);
        });
    } catch (error) {
        console.error('Error al cargar reservas:', error);
    }
}

window.cambiarEstadoReserva = async (id, nuevoEstado) => {
    const accion = nuevoEstado === 'Confirmada' ? 'Aceptar' : 'Rechazar';
    
    const modalHTML = `
        <div class="modal-overlay" id="modalEstadoReserva">
            <div class="modal-content">
                <h3 style="font-family: var(--font-serif); font-size: 28px; margin-bottom: 10px;">Confirmar Acción</h3>
                <p style="color: #6d6d6d;">¿Estás seguro de que deseas <strong>${accion.toLowerCase()}</strong> esta reserva?</p>
                <div class="modal-buttons">
                    <button class="btn-secondary" onclick="cerrarModalReserva()">Cancelar</button>
                    <button class="btn ${nuevoEstado === 'Confirmada' ? '' : 'btn-danger'}" id="btnConfirmarEstado">Sí, ${accion}</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('modalEstadoReserva');
    
    setTimeout(() => modal.classList.add('show'), 10);

    document.getElementById('btnConfirmarEstado').onclick = async () => {
        try {
            const respuesta = await fetch(`/api/reservas/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (respuesta.ok) {
                mostrarToast(`Reserva ${nuevoEstado.toLowerCase()} correctamente`, 'success');
                cargarReservas();
                cargarMaquinaria();
            } else {
                mostrarToast('Error al actualizar la reserva', 'error');
            }
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
        cerrarModalReserva();
    };
};

window.cerrarModalReserva = () => {
    const modal = document.getElementById('modalEstadoReserva');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
};

window.eliminarMaquina = async (id) => {
    const modalHTML = `
        <div class="modal-overlay" id="modalEliminar">
            <div class="modal-content">
                <h3 style="font-family: var(--font-serif); font-size: 28px; margin-bottom: 10px;">Confirmar Eliminación</h3>
                <p style="color: #6d6d6d;">¿Estás seguro de que deseas eliminar esta máquina? Esta acción no se puede deshacer.</p>
                <div class="modal-buttons">
                    <button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>
                    <button class="btn btn-danger" id="btnConfirmarEliminar">Sí, eliminar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('modalEliminar');
    
    setTimeout(() => modal.classList.add('show'), 10);

    document.getElementById('btnConfirmarEliminar').onclick = async () => {
        try {
            const respuesta = await fetch(`/api/maquinaria/${id}?id_proveedor=${encodeURIComponent(idProveedor)}`, {
                method: 'DELETE'
            });
            
            const data = await respuesta.json().catch(() => ({}));

            if (respuesta.ok) {
                mostrarToast('Máquina eliminada del sistema', 'success');
                cargarMaquinaria();
            } else {
                mostrarToast(data.error || 'Error al eliminar', 'error');
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
        cerrarModal();
    };
};

window.cerrarModal = () => {
    const modal = document.getElementById('modalEliminar');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
};

// ============================================================
// EDITAR MÁQUINA (datos + agregar y eliminar fotos)
// ============================================================

const MAX_FOTOS = 5;
let estadoEdicion = null; // { id, fotos, fotosAEliminar, nuevasFotos }

window.abrirModalEditar = async (id) => {
    let maquina, fotos, categorias;

    try {
        const [respMaquina, respFotos, respCategorias] = await Promise.all([
            fetch(`/api/maquinaria/${id}`),
            fetch(`/api/maquinaria/fotos/${id}`),
            fetch('/api/maquinaria/categorias')
        ]);

        if (!respMaquina.ok) {
            mostrarToast('No se pudo cargar la máquina', 'error');
            return;
        }

        maquina = await respMaquina.json();
        fotos = respFotos.ok ? await respFotos.json() : [];
        categorias = respCategorias.ok ? await respCategorias.json() : [];
    } catch (error) {
        console.error('Error al cargar la máquina para editar:', error);
        mostrarToast('Error de conexión al cargar la máquina', 'error');
        return;
    }

    if (Number(maquina.id_proveedor) !== Number(idProveedor)) {
        mostrarToast('No puedes editar una máquina que no te pertenece', 'error');
        return;
    }

    estadoEdicion = {
        id: Number(id),
        fotos: Array.isArray(fotos) ? fotos : [],
        fotosAEliminar: new Set(),
        nuevasFotos: []
    };

    const modalHTML = `
        <div class="modal-overlay" id="modalEditar">
            <div class="modal-content" style="text-align: left; max-width: 720px; max-height: 90vh; overflow-y: auto;">
                <h3 style="font-family: var(--font-serif); font-size: 28px; margin-bottom: 20px;">Editar Máquina</h3>

                <form id="formEditarMaquinaria" enctype="multipart/form-data">
                    <div style="display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <label>Marca:</label>
                            <input type="text" id="editarMarca" required maxlength="50" minlength="2">
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <label>Modelo:</label>
                            <input type="text" id="editarModelo" required maxlength="50" minlength="1">
                        </div>
                    </div>

                    <div style="display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <label>Categoría:</label>
                            <select id="editarCategoria" required></select>
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <label>Estado:</label>
                            <select id="editarEstado">
                                <option value="Disponible">Disponible</option>
                                <option value="Rentado">Rentado</option>
                                <option value="Mantenimiento">Mantenimiento</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <label>Año:</label>
                            <input type="number" id="editarAnio" required min="1950">
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <label>Patente:</label>
                            <input type="text" id="editarPatente" required maxlength="8" pattern="[A-Za-z]{4}-[0-9]{2,3}" title="Formato: ABCD-12" placeholder="ABCD-12">
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label>Precio por Día (CLP):</label>
                        <input type="number" id="editarPrecio" required min="1000" step="1000">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label>Descripción:</label>
                        <textarea id="editarDescripcion" rows="3" maxlength="250" placeholder="Detalles de la máquina... (Máx. 250 caracteres)"></textarea>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label>Fotos actuales:</label>
                        <p style="font-size: 12px; color: #6d6d6d; margin: 4px 0 8px 0;">Pulsa la <strong>X</strong> para marcar una foto y eliminarla al guardar.</p>
                        <div id="galeriaEditar" style="display: flex; flex-wrap: wrap; gap: 12px;"></div>
                        <p id="avisoGaleriaEditar" style="font-size: 12px; color: #6d6d6d; margin: 10px 0 0 0;"></p>
                    </div>

                    <div style="margin-bottom: 25px;">
                        <label>Agregar fotos (Máx. ${MAX_FOTOS} en total):</label>
                        <input type="file" id="fotosEditar" accept="image/*" multiple style="padding: 10px; border: 1px solid var(--color-moss); border-radius: 10px; width: 100%;">
                        <div id="listaFotosNuevas" style="margin-top: 10px; font-size: 13px; color: #6d6d6d;"></div>
                    </div>

                    <div class="modal-buttons">
                        <button type="button" class="btn-secondary" onclick="cerrarModalEditar()">Cancelar</button>
                        <button type="submit" class="btn" id="btnGuardarEditar">Guardar cambios</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('modalEditar');
    setTimeout(() => modal.classList.add('show'), 10);

    // Precargamos los datos actuales (por .value y no por HTML: evita inyección)
    document.getElementById('editarMarca').value = maquina.marca || '';
    document.getElementById('editarModelo').value = maquina.modelo || '';
    document.getElementById('editarAnio').value = maquina.anio || '';
    document.getElementById('editarAnio').max = new Date().getFullYear() + 1;
    document.getElementById('editarPatente').value = maquina.patente || '';
    document.getElementById('editarPrecio').value = maquina.precio_dia || '';
    document.getElementById('editarDescripcion').value = maquina.descripcion || '';
    document.getElementById('editarEstado').value = maquina.estado || 'Disponible';

    const selectCategoria = document.getElementById('editarCategoria');
    selectCategoria.innerHTML = '<option value="">Seleccione una categoría</option>';
    categorias.forEach(cat => {
        const opcion = document.createElement('option');
        opcion.value = cat.id_categoria;
        opcion.textContent = cat.nombre;
        selectCategoria.appendChild(opcion);
    });
    selectCategoria.value = String(maquina.id_categoria || '');

    // Fotos actuales
    dibujarGaleriaEditar();

    // Acumular fotos nuevas
    document.getElementById('fotosEditar').addEventListener('change', (e) => {
        const disponibles = MAX_FOTOS - fotosQueQuedanEditar();
        const seleccionadas = Array.from(e.target.files);
        e.target.value = '';

        for (const archivo of seleccionadas) {
            if (archivo.size > 5 * 1024 * 1024) {
                mostrarToast('Cada imagen no puede superar los 5MB', 'error');
                continue;
            }
            if (estadoEdicion.nuevasFotos.length >= disponibles) {
                mostrarToast(`Solo puedes tener ${MAX_FOTOS} fotos en total. Marca alguna foto actual para eliminar.`, 'error');
                break;
            }
            estadoEdicion.nuevasFotos.push(archivo);
        }
        dibujarGaleriaEditar();
    });

    // Guardar
    document.getElementById('formEditarMaquinaria').addEventListener('submit', async (e) => {
        e.preventDefault();

        const patente = document.getElementById('editarPatente').value.trim();
        if (!/^[A-Za-z]{4}-[0-9]{2,3}$/.test(patente)) {
            mostrarToast('Formato de patente inválido. Usa el formato ABCD-12', 'error');
            return;
        }

        if (Number(document.getElementById('editarPrecio').value) <= 0) {
            mostrarToast('El precio por día debe ser mayor a cero', 'error');
            return;
        }

        const totalFotos = fotosQueQuedanEditar() + estadoEdicion.nuevasFotos.length;
        if (totalFotos > MAX_FOTOS) {
            mostrarToast(`Una máquina puede tener como máximo ${MAX_FOTOS} fotos`, 'error');
            return;
        }

        const datos = new FormData();
        datos.append('id_categoria', document.getElementById('editarCategoria').value);
        datos.append('marca', document.getElementById('editarMarca').value.trim());
        datos.append('modelo', document.getElementById('editarModelo').value.trim());
        datos.append('anio', document.getElementById('editarAnio').value);
        datos.append('patente', patente);
        datos.append('precio_dia', document.getElementById('editarPrecio').value);
        datos.append('descripcion', document.getElementById('editarDescripcion').value.trim());
        datos.append('estado', document.getElementById('editarEstado').value);

        // IDs de las fotos marcadas (o rutas, en máquinas antiguas sin fila en la galería)
        estadoEdicion.fotosAEliminar.forEach(clave => datos.append('fotosAEliminar', clave));

        // Archivos nuevos: un append por cada uno, con el nombre de campo 'fotos'
        for (const archivo of estadoEdicion.nuevasFotos) {
            datos.append('fotos', archivo);
        }

        const boton = document.getElementById('btnGuardarEditar');
        boton.disabled = true;
        boton.textContent = 'Guardando...';

        try {
            const respuesta = await fetch(`/api/maquinaria/${estadoEdicion.id}?id_proveedor=${encodeURIComponent(idProveedor)}`, {
                method: 'PUT',
                body: datos
            });

            const resultado = await respuesta.json().catch(() => ({}));

            if (respuesta.ok) {
                const partes = [];
                if (resultado.fotosAgregadas && resultado.fotosAgregadas.length > 0) {
                    partes.push(`${resultado.fotosAgregadas.length} foto(s) agregada(s)`);
                }
                if (resultado.fotosEliminadas && resultado.fotosEliminadas.length > 0) {
                    partes.push(`${resultado.fotosEliminadas.length} foto(s) eliminada(s)`);
                }
                mostrarToast(`Máquina actualizada${partes.length ? ' — ' + partes.join(', ') : ''}`, 'success');
                cerrarModalEditar();
                cargarMaquinaria();
            } else {
                mostrarToast(resultado.error || 'Error al actualizar la máquina', 'error');
                boton.disabled = false;
                boton.textContent = 'Guardar cambios';
            }
        } catch (error) {
            console.error('Error al actualizar:', error);
            mostrarToast('Error de conexión al actualizar', 'error');
            boton.disabled = false;
            boton.textContent = 'Guardar cambios';
        }
    });
};

window.cerrarModalEditar = () => {
    const modal = document.getElementById('modalEditar');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
    estadoEdicion = null;
};

// Cuántas fotos quedarían si se guardara ahora
function fotosQueQuedanEditar() {
    if (!estadoEdicion) return 0;
    return estadoEdicion.fotos.length - estadoEdicion.fotosAEliminar.size;
}

window.toggleFotoEliminar = (clave) => {
    if (!estadoEdicion) return;

    if (estadoEdicion.fotosAEliminar.has(clave)) {
        estadoEdicion.fotosAEliminar.delete(clave);
    } else {
        estadoEdicion.fotosAEliminar.add(clave);
    }
    dibujarGaleriaEditar();
};

window.quitarFotoNueva = (index) => {
    if (!estadoEdicion) return;
    estadoEdicion.nuevasFotos.splice(index, 1);
    dibujarGaleriaEditar();
};

function dibujarGaleriaEditar() {
    if (!estadoEdicion) return;

    const galeria = document.getElementById('galeriaEditar');
    const aviso = document.getElementById('avisoGaleriaEditar');
    const input = document.getElementById('fotosEditar');
    if (!galeria) return;

    galeria.innerHTML = '';

    if (estadoEdicion.fotos.length === 0) {
        const vacio = document.createElement('span');
        vacio.style.color = '#6d6d6d';
        vacio.textContent = 'Esta máquina no tiene fotos.';
        galeria.appendChild(vacio);
    }

    estadoEdicion.fotos.forEach(foto => {
        const clave = foto.id_foto !== null && foto.id_foto !== undefined ? String(foto.id_foto) : foto.ruta_foto;
        const marcada = estadoEdicion.fotosAEliminar.has(clave);

        const contenedor = document.createElement('div');
        contenedor.style.cssText = 'position: relative; width: 110px; height: 85px;';

        const imagen = document.createElement('img');
        imagen.src = foto.ruta_foto;
        imagen.alt = 'Foto de la máquina';
        imagen.style.cssText = `width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 2px solid ${marcada ? '#dc3545' : '#ddd'};${marcada ? ' opacity: 0.35; filter: grayscale(1);' : ''}`;

        const boton = document.createElement('button');
        boton.type = 'button';
        boton.textContent = '×';
        boton.title = marcada ? 'Desmarcar (conservar la foto)' : 'Marcar para eliminar';
        boton.setAttribute('aria-label', boton.title);
        boton.style.cssText = 'position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; border-radius: 50%; border: none; background: #dc3545; color: #fff; cursor: pointer; font-weight: bold; line-height: 1;';
        boton.onclick = () => toggleFotoEliminar(clave);

        contenedor.appendChild(imagen);
        contenedor.appendChild(boton);
        galeria.appendChild(contenedor);
    });

    // Lista de archivos nuevos seleccionados
    const lista = document.getElementById('listaFotosNuevas');
    if (lista) {
        lista.innerHTML = '';
        if (estadoEdicion.nuevasFotos.length === 0) {
            lista.textContent = 'No has seleccionado fotos nuevas.';
        } else {
            const ul = document.createElement('ul');
            ul.style.cssText = 'margin: 5px 0; padding-left: 20px; list-style-type: disc;';
            estadoEdicion.nuevasFotos.forEach((archivo, index) => {
                const li = document.createElement('li');
                li.style.marginBottom = '5px';
                li.textContent = archivo.name + ' ';
                const quitar = document.createElement('button');
                quitar.type = 'button';
                quitar.textContent = 'X';
                quitar.title = 'Quitar de la selección';
                quitar.style.cssText = 'background: transparent; border: none; color: #dc3545; cursor: pointer; font-weight: bold; margin-left: 10px;';
                quitar.onclick = () => quitarFotoNueva(index);
                li.appendChild(quitar);
                ul.appendChild(li);
            });
            lista.appendChild(ul);
        }
    }

    const quedan = fotosQueQuedanEditar() + estadoEdicion.nuevasFotos.length;
    if (aviso) {
        aviso.textContent = `${quedan} de ${MAX_FOTOS} fotos quedarían al guardar.`;
        aviso.style.color = quedan === 0 ? '#dc3545' : '#6d6d6d';
    }
    if (input) {
        input.disabled = quedan >= MAX_FOTOS;
    }
}

function mostrarToast(mensaje, tipo) {
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerText = mensaje;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}