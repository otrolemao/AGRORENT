document.addEventListener('DOMContentLoaded', () => {
    cargarMaquinaria();

    const form = document.getElementById('formMaquinaria');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nuevaMaquina = {
                id_proveedor: 1, 
                id_categoria: 1, 
                marca: document.getElementById('marca').value,
                modelo: document.getElementById('modelo').value,
                precio_dia: Number(document.getElementById('precio_dia').value),
                descripcion: document.getElementById('descripcion').value,
                anio: 2023, 
                patente: "PAT-" + Math.floor(Math.random() * 10000)
            };

            try {
                const respuesta = await fetch('/api/maquinaria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevaMaquina)
                });

                if (respuesta.ok) {
                    mostrarToast('¡Máquina registrada con éxito!', 'success');
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

window.eliminarMaquina = async (id) => {
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