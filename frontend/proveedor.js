let idProveedor = null;

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
            
            const nuevaMaquina = {
                id_proveedor: idProveedor,
                id_categoria: Number(document.getElementById('categoria').value),
                marca: document.getElementById('marca').value,
                modelo: document.getElementById('modelo').value,
                anio: Number(document.getElementById('anio').value),
                patente: patenteIngresada,
                precio_dia: Number(document.getElementById('precio_dia').value),
                descripcion: document.getElementById('descripcion').value
            };

            try {
                const respuesta = await fetch('/api/maquinaria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevaMaquina)
                });

                if (respuesta.ok) {
                    mostrarToast('Máquina registrada con éxito', 'success');
                    form.reset(); 
                    cargarMaquinaria(); 
                } else {
                    mostrarToast('Error al registrar la máquina', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    }
});

async function cargarMaquinaria() {
    try {
        const respuesta = await fetch('/api/maquinaria/buscar');
        const maquinas = await respuesta.json();
        
        const tbody = document.querySelector('#tablaMaquinaria tbody');
        if (!tbody) return;

        tbody.innerHTML = ''; 

        maquinas.forEach(maquina => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${maquina.id_maquinaria}</td>
                <td>${maquina.marca}</td>
                <td>${maquina.modelo}</td>
                <td>$${maquina.precio_dia}</td>
                <td>${maquina.estado}</td>
                <td>
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
        // Filtramos solo las reservas del proveedor que tiene la sesión abierta.
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
            let colorEstado = 'black';
            if (reserva.estado === 'Pendiente') colorEstado = '#f39c12';
            if (reserva.estado === 'Confirmada') colorEstado = '#27ae60';
            if (reserva.estado === 'Cancelada') colorEstado = '#e74c3c';

            let botones = '-';
            if (reserva.estado === 'Pendiente') {
                botones = `
                    <button class="btn-aceptar" onclick="cambiarEstadoReserva(${reserva.id_reserva}, 'Confirmada')">Aceptar</button>
                    <button class="btn-rechazar" onclick="cambiarEstadoReserva(${reserva.id_reserva}, 'Cancelada')">Rechazar</button>
                `;
            }

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${reserva.id_reserva}</td>
                <td>${reserva.marca} ${reserva.modelo}</td>
                <td>${reserva.fecha_inicio.substring(0,10)} al ${reserva.fecha_fin.substring(0,10)}</td>
                <td>$${reserva.costo_estimado}</td>
                <td style="color: ${colorEstado}; font-weight: bold;">${reserva.estado}</td>
                <td>${botones}</td>
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
                <h3>Confirmar Acción</h3>
                <p>¿Estás seguro de que deseas <strong>${accion.toLowerCase()}</strong> esta reserva?</p>
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
                <h3>Confirmar Eliminación</h3>
                <p>¿Estás seguro de que deseas eliminar esta máquina? Esta acción no se puede deshacer.</p>
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
            const respuesta = await fetch(`/api/maquinaria/${id}`, {
                method: 'DELETE'
            });
            if (respuesta.ok) {
                mostrarToast('Máquina eliminada del sistema', 'success');
                cargarMaquinaria();
            } else {
                mostrarToast('Error al eliminar', 'error');
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