document.addEventListener('DOMContentLoaded', () => {
    // --- Sesión ---
    const usuario = obtenerUsuario();
    if (!usuario || usuario.rol !== 2) {
        window.location.href = 'index.html';
        return;
    }
    if (!usuario.id_proveedor) {
        alert('Tu cuenta no tiene un perfil de proveedor asociado. Vuelve a registrarte o contacta al administrador.');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('nombreUsuario').textContent = usuario.nombre;
    document.getElementById('btnSalir').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('agrorent_usuario');
        window.location.href = 'index.html';
    });

    cargarCategorias();
    cargarMaquinaria();

    const form = document.getElementById('formMaquinaria');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevaMaquina = {
            id_proveedor: usuario.id_proveedor,
            id_categoria: Number(document.getElementById('categoria').value),
            marca: document.getElementById('marca').value.trim(),
            modelo: document.getElementById('modelo').value.trim(),
            anio: Number(document.getElementById('anio').value),
            patente: document.getElementById('patente').value.trim(),
            precio_dia: Number(document.getElementById('precio_dia').value),
            descripcion: document.getElementById('descripcion').value.trim()
        };

        if (!nuevaMaquina.id_categoria) {
            mostrarToast('Selecciona una categoría', 'error');
            return;
        }

        try {
            const respuesta = await fetch('/api/maquinaria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevaMaquina)
            });

            const data = await respuesta.json().catch(() => ({}));

            if (respuesta.ok) {
                mostrarToast('¡Máquina registrada con éxito!', 'success');
                form.reset();
                cargarMaquinaria();
            } else {
                mostrarToast(data.error || 'Error al registrar la máquina', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarToast('Error de conexión con el servidor', 'error');
        }
    });
});

function obtenerUsuario() {
    try {
        return JSON.parse(localStorage.getItem('agrorent_usuario'));
    } catch (e) {
        return null;
    }
}

let categoriasPorId = {};

async function cargarCategorias() {
    try {
        const respuesta = await fetch('/api/maquinaria/categorias');
        const categorias = await respuesta.json();
        const select = document.getElementById('categoria');

        select.innerHTML = '';
        const vacio = document.createElement('option');
        vacio.value = '';
        vacio.textContent = 'Selecciona una categoría';
        select.appendChild(vacio);

        categorias.forEach((cat) => {
            categoriasPorId[cat.id_categoria] = cat.nombre;
            const opcion = document.createElement('option');
            opcion.value = cat.id_categoria;
            opcion.textContent = cat.nombre;
            select.appendChild(opcion);
        });
    } catch (error) {
        console.error('Error al cargar categorías:', error);
    }
}

async function cargarMaquinaria() {
    const usuario = obtenerUsuario();
    if (!usuario || !usuario.id_proveedor) return;

    try {
        const respuesta = await fetch(`/api/maquinaria/buscar?id_proveedor=${encodeURIComponent(usuario.id_proveedor)}`);
        const maquinas = await respuesta.json();

        const tbody = document.querySelector('#tablaMaquinaria tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (maquinas.length === 0) {
            const fila = document.createElement('tr');
            const celda = document.createElement('td');
            celda.colSpan = 7;
            celda.textContent = 'Aún no has registrado maquinaria.';
            celda.style.textAlign = 'center';
            fila.appendChild(celda);
            tbody.appendChild(fila);
            return;
        }

        maquinas.forEach((maquina) => {
            const fila = document.createElement('tr');

            const celdas = [
                maquina.id_maquinaria,
                maquina.marca,
                maquina.modelo,
                categoriasPorId[maquina.id_categoria] || maquina.id_categoria,
                '$' + Number(maquina.precio_dia).toLocaleString('es-CL'),
                maquina.estado
            ];

            celdas.forEach((valor) => {
                const td = document.createElement('td');
                td.textContent = valor;
                fila.appendChild(td);
            });

            const tdAccion = document.createElement('td');
            const boton = document.createElement('button');
            boton.className = 'btn btn-danger';
            boton.textContent = 'Eliminar';
            boton.addEventListener('click', () => eliminarMaquina(maquina.id_maquinaria));
            tdAccion.appendChild(boton);
            fila.appendChild(tdAccion);

            tbody.appendChild(fila);
        });
    } catch (error) {
        console.error('Error al cargar la maquinaria:', error);
        mostrarToast('Error al cargar la maquinaria', 'error');
    }
}

function eliminarMaquina(id) {
    const modalHTML = `
        <div class="modal-overlay" id="modalEliminar">
            <div class="modal-content">
                <h3>Confirmar Eliminación</h3>
                <p>¿Estás seguro de que deseas eliminar esta máquina?</p>
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
            const respuesta = await fetch(`/api/maquinaria/${id}`, { method: 'DELETE' });
            const data = await respuesta.json().catch(() => ({}));

            if (respuesta.ok) {
                mostrarToast('Máquina eliminada del sistema', 'success');
                cargarMaquinaria();
            } else {
                mostrarToast(data.error || 'Error al eliminar', 'error');
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
            mostrarToast('Error de conexión con el servidor', 'error');
        }
        cerrarModal();
    };
}

function cerrarModal() {
    const modal = document.getElementById('modalEliminar');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
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
