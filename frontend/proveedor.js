window.onload = cargarReservas;

async function cargarReservas() {
    const tabla = document.getElementById('tablaReservas');
    tabla.innerHTML = '<tr><td colspan="6">Cargando reservas...</td></tr>';

    try {
        const res = await fetch('http://localhost:3000/api/reservas');
        const data = await res.json();
        
        tabla.innerHTML = '';
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6">No hay reservas registradas.</td></tr>';
            return;
        }

        data.forEach(reserva => {
            const fInicio = new Date(reserva.fecha_inicio).toLocaleDateString('es-CL');
            const fFin = new Date(reserva.fecha_fin).toLocaleDateString('es-CL');
            
            let botones = '';
            if (reserva.estado === 'pendiente') {
                botones = `
                    <button class="btn-aceptar" onclick="actualizarEstado(${reserva.id_Reserva}, 'confirmada')">Aceptar</button>
                    <button class="btn-rechazar" onclick="actualizarEstado(${reserva.id_Reserva}, 'rechazada')">Rechazar</button>
                `;
            } else {
                botones = `<span style="color: gray;">Procesada</span>`;
            }

            tabla.innerHTML += `
                <tr>
                    <td>#${reserva.id_Reserva}</td>
                    <td>${reserva.id_maquinaria}</td>
                    <td>${fInicio} al ${fFin}</td>
                    <td>$${reserva.monto_total}</td>
                    <td><b>${reserva.estado.toUpperCase()}</b></td>
                    <td>${botones}</td>
                </tr>
            `;
        });
    } catch (error) {
        tabla.innerHTML = '<tr><td colspan="6">Error al cargar datos del servidor. Verifica que el backend esté encendido.</td></tr>';
    }
}

async function actualizarEstado(id, nuevoEstado) {
    if(!confirm(`¿Marcar esta reserva como ${nuevoEstado}?`)) return;

    try {
        const res = await fetch(`http://localhost:3000/api/reservas/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevo_estado: nuevoEstado })
        });
        
        if(res.ok) {
            alert(`Reserva ${nuevoEstado} exitosamente.`);
            cargarReservas(); 
        } else {
            alert('Error al actualizar el estado.');
        }
    } catch (error) {
        alert('Error de conexión con el servidor.');
    }
}