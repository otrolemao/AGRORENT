document.addEventListener('DOMContentLoaded', () => {
    const headerHTML = `
        <header>
            <h1>AgroRent<span style="color: var(--color-acid-lime);">.</span></h1>
            <div class="header-user">
                <span id="nombreUsuarioHeader" style="color: var(--color-mist);">Cargando...</span>
                <a href="#" class="btn-secondary" onclick="cerrarSesionGlobal(event)" style="padding: 6px 12px; font-size: 13px;">Cerrar Sesión</a>
            </div>
        </header>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    const usuarioStr = localStorage.getItem('agrorent_usuario');
    if (usuarioStr) {
        try {
            const u = JSON.parse(usuarioStr);
            const span = document.getElementById('nombreUsuarioHeader');
            if (span) span.innerText = u.nombre;
        } catch (e) {}
    }
});

function cerrarSesionGlobal(e) {
    e.preventDefault();
    localStorage.removeItem('agrorent_usuario');
    window.location.href = 'index.html';
}