import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Search, Tractor } from 'lucide-react';
import tractorHeroImg from './assets/images/agrorent_modern_tractor_1794765223802.jpg';

type Rol = 'productor' | 'propietario' | 'admin';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Rol;
  id_proveedor?: number | null;
  id_productor?: number | null;
}

interface Machine {
  id_maquinaria: number;
  id_proveedor: number;
  id_categoria: number;
  marca: string;
  modelo: string;
  anio: number | null;
  patente: string | null;
  precio_dia: string | number;
  estado: string;
  foto: string | null;
  descripcion: string | null;
  fecha_registro: string;
  categoria: string | null;
}

interface Foto {
  id_foto: number | null;
  ruta_foto: string;
}

interface Reservation {
  machineId: number;
  label: string;
  precioDia: number;
  createdAt: string;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);

const RUT_REGEX = /^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-?[0-9kK]$/;

export default function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rut, setRut] = useState('');
  const [roleSelection, setRoleSelection] = useState<'productor' | 'propietario'>('productor');
  const [showPassword, setShowPassword] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  );
  const [sessionRole, setSessionRole] = useState<string | null>(() =>
    localStorage.getItem('role')
  );
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('agrorent_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });

  const [imgFailed, setImgFailed] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [machinesError, setMachinesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'catalogo' | 'reservas'>('catalogo');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservasReales, setReservasReales] = useState<any[]>([]);

  // Estados para el panel del Proveedor
  const [vistaProveedor, setVistaProveedor] = useState<'mis-maquinas' | 'publicar' | 'reservas'>('mis-maquinas');
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [nuevoModelo, setNuevoModelo] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoAnio, setNuevoAnio] = useState('');
  const [nuevaPatente, setNuevaPatente] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [fotosNuevas, setFotosNuevas] = useState<File[]>([]);
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);
  const [exitoPublicar, setExitoPublicar] = useState<string | null>(null);
  const [reservasRecibidas, setReservasRecibidas] = useState<any[]>([]);
  
  // Estado para el modal de confirmación de acción
  const [modalAccionReserva, setModalAccionReserva] = useState<{ id: number; estado: string; label: string } | null>(null);

  // Estados para el modal de detalles
  const [modalDetalles, setModalDetalles] = useState<Machine | null>(null);
  const [fotosDetalles, setFotosDetalles] = useState<Foto[]>([]);
  const [indiceFoto, setIndiceFoto] = useState(0);

  // Estados para el modal de RESERVA (Fechas)
  const [modalReserva, setModalReserva] = useState<Machine | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [reservaLoading, setReservaLoading] = useState(false);
  const [reservaError, setReservaError] = useState<string | null>(null);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);

  const accessSectionRef = useRef<HTMLElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const fetchMachines = async (query = '') => {
    setMachinesLoading(true);
    setMachinesError(null);
    try {
      const url = query.trim()
        ? `/api/maquinaria/buscar?busqueda=${encodeURIComponent(query.trim())}`
        : '/api/maquinaria/buscar';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('No se pudo cargar el catálogo de maquinaria.');
      }
      const data = (await response.json()) as Machine[];
      setMachines(Array.isArray(data) ? data : []);
    } catch (err) {
      setMachinesError(
        err instanceof Error ? err.message : 'Error de conexión al cargar maquinaria.'
      );
    } finally {
      setMachinesLoading(false);
    }
  };

  const cargarMisReservas = async () => {
    if (!sessionUser?.id_productor) return;
    try {
      const resp = await fetch(`/api/reservas?id_productor=${sessionUser.id_productor}`);
      if (resp.ok) {
        const data = await resp.json();
        setReservasReales(data);
      }
    } catch (error) {
      console.error('Error al cargar reservas:', error);
    }
  };

  const cargarReservasRecibidas = async () => {
    if (!sessionUser?.id_proveedor) return;
    try {
      const resp = await fetch(`/api/reservas?id_proveedor=${sessionUser.id_proveedor}`);
      if (resp.ok) {
        const data = await resp.json();
        setReservasRecibidas(data);
      }
    } catch (error) {
      console.error('Error al cargar reservas recibidas:', error);
    }
  };

  useEffect(() => {
    fetchMachines();
    if (sessionUser?.id_productor) {
      cargarMisReservas();
    }
  }, [sessionUser]);

  const scrollToAccess = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthSuccess(null);
    accessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      if (mode === 'register') {
        nameInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    }, 350);
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (authMode === 'register' && name.trim().length < 2) {
      setAuthError('Ingresá tu nombre completo para crear la cuenta.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setAuthError('Ingresá un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (authMode === 'register' && !RUT_REGEX.test(rut.trim())) {
      setAuthError('Ingresá un RUT válido (Ej: 12.345.678-9).');
      return;
    }

    setAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        authMode === 'login'
          ? { email: email.trim(), password }
          : {
              name: name.trim(),
              email: email.trim(),
              password,
              role: roleSelection,
              rut: rut.trim(),
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'No se pudo completar la autenticación.');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('agrorent_user', JSON.stringify(data.user));

      setSessionToken(data.token);
      setSessionRole(data.role);
      setSessionUser(data.user);
      setAuthSuccess(
        authMode === 'login'
          ? `Sesión iniciada como ${data.user.name}.`
          : `Cuenta creada correctamente para ${data.user.name}.`
      );
      setPassword('');
      setRut('');
    } catch {
      setAuthError('Error de red al conectar con el servidor de AgroRent.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('agrorent_user');
    setSessionToken(null);
    setSessionRole(null);
    setSessionUser(null);
    setAuthSuccess(null);
    setAuthError(null);
  };

  const handleFillDemo = () => {
    setAuthMode('login');
    setEmail('maria@productor.cl');
    setPassword('agrorent123');
    setAuthError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchMachines(searchQuery);
  };

  const abrirDetalles = async (machine: Machine) => {
    setModalDetalles(machine);
    setIndiceFoto(0);
    try {
      const resp = await fetch(`/api/maquinaria/fotos/${machine.id_maquinaria}`);
      if (resp.ok) {
        const fotos = await resp.json();
        setFotosDetalles(fotos);
      } else {
        setFotosDetalles(machine.foto ? [{ id_foto: null, ruta_foto: machine.foto }] : []);
      }
    } catch (e) {
      setFotosDetalles(machine.foto ? [{ id_foto: null, ruta_foto: machine.foto }] : []);
    }
  };

  const cerrarDetalles = () => {
    setModalDetalles(null);
    setFotosDetalles([]);
  };

  const abrirModalReserva = (machine: Machine) => {
    setModalReserva(machine);
    setFechaInicio('');
    setFechaFin('');
    setReservaError(null);
    setAceptoTerminos(false);
  };

  const cerrarModalReserva = () => {
    setModalReserva(null);
    setFechaInicio('');
    setFechaFin('');
    setReservaError(null);
    setAceptoTerminos(false);
  };

  const confirmarReserva = async () => {
    if (!aceptoTerminos) {
      setReservaError('Debes aceptar los términos y condiciones para continuar.');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setReservaError('Debes seleccionar ambas fechas.');
      return;
    }
    if (new Date(fechaInicio) >= new Date(fechaFin)) {
      setReservaError('La fecha de término debe ser posterior a la de inicio.');
      return;
    }

    setReservaLoading(true);
    setReservaError(null);

    try {
      const idProductor = sessionUser?.id_productor || 1;
      const response = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_productor: idProductor,
          id_maquinaria: modalReserva?.id_maquinaria,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setReservaError(data.error || 'No se pudo crear la reserva.');
        return;
      }

      alert(`¡Reserva solicitada con éxito! Seña estimada: $${data.monto_seña?.toLocaleString('es-CL') || 'calculando...'}`);
      cerrarModalReserva();
      fetchMachines();
      cargarMisReservas();
    } catch (error) {
      setReservaError('Error de conexión con el servidor.');
    } finally {
      setReservaLoading(false);
    }
  };

  // --- FUNCIONES DEL PROVEEDOR ---

  const handleAgregarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevas = Array.from(e.target.files);
      setFotosNuevas((prev) => [...prev, ...nuevas].slice(0, 5));
    }
  };

  const handleQuitarFoto = (index: number) => {
    setFotosNuevas((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublicarMaquina = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPublicar(null);
    setExitoPublicar(null);

    if (!nuevaMarca || !nuevoModelo || !nuevaCategoria || !nuevoPrecio) {
      setErrorPublicar('Por favor, completa los campos obligatorios.');
      return;
    }

    setPublicando(true);
    const formData = new FormData();
    formData.append('id_proveedor', String(sessionUser?.id_proveedor));
    formData.append('id_categoria', nuevaCategoria);
    formData.append('marca', nuevaMarca);
    formData.append('modelo', nuevoModelo);
    formData.append('anio', nuevoAnio);
    formData.append('patente', nuevaPatente);
    formData.append('precio_dia', nuevoPrecio);
    formData.append('descripcion', nuevaDescripcion);

    fotosNuevas.forEach((foto) => {
      formData.append('fotos', foto);
    });

    try {
      const response = await fetch('/api/maquinaria', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setExitoPublicar('¡Máquina publicada con éxito!');
        setNuevaMarca('');
        setNuevoModelo('');
        setNuevaCategoria('');
        setNuevoAnio('');
        setNuevaPatente('');
        setNuevoPrecio('');
        setNuevaDescripcion('');
        setFotosNuevas([]);
        fetchMachines();
      } else {
        const data = await response.json();
        setErrorPublicar(data.error || 'Error al publicar la máquina.');
      }
    } catch (error) {
      setErrorPublicar('Error de conexión con el servidor.');
    } finally {
      setPublicando(false);
    }
  };

  const handleCambiarEstadoReserva = (idReserva: number, nuevoEstado: string, label: string) => {
    setModalAccionReserva({ id: idReserva, estado: nuevoEstado, label });
  };

  const confirmarCambioEstado = async () => {
    if (!modalAccionReserva) return;
    try {
      const resp = await fetch(`/api/reservas/${modalAccionReserva.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: modalAccionReserva.estado }),
      });
      if (resp.ok) {
        alert(`Reserva ${modalAccionReserva.estado.toLowerCase()} correctamente.`);
        setModalAccionReserva(null);
        cargarReservasRecibidas();
        fetchMachines();
      } else {
        alert('Error al actualizar la reserva.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <a href="#inicio" className="brand-logo" aria-label="AgroRent Inicio">
            AgroRent<span className="brand-dot">.</span>
          </a>

          <nav className="header-nav" aria-label="Navegación principal">
            <a href="#plataforma" className="nav-link">Plataforma</a>
            <a href="#flota" className="nav-link">Maquinaria</a>
            <a href="#acceso" className="nav-link">Acceso</a>
          </nav>

          <div className="header-actions">
            {sessionUser ? (
              <>
                <span className="user-greeting">{sessionUser.name}</span>
                <button type="button" onClick={handleLogout} className="btn btn-outline">
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <button type="button" onClick={() => scrollToAccess('register')} className="btn btn-outline">
                Crear Cuenta
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="page-main">
        {sessionUser?.role === 'propietario' ? (
          // --- VISTA DEL PROVEEDOR (JORGE) ---
          <>
            {/* Hero para el proveedor */}
            <section id="inicio" className="hero-section" style={{ paddingBottom: 40 }}>
              <div className="container hero-grid">
                <div className="hero-content">
                  <p className="hero-kicker">Panel de Administración</p>
                  <h1 className="hero-title">
                    Gestiona tu <span className="hero-title-accent">Flota.</span>
                  </h1>
                  <p className="hero-subtitle">
                    Publica nuevas máquinas, revisa tus reservas recibidas y gestiona el arriendo de tus equipos.
                  </p>
                </div>
                <div className="hero-media-card" style={{ opacity: 0.7 }}>
                  <img src={tractorHeroImg} alt="Tractor" className="hero-media-img" />
                  <div className="hero-media-scrim" />
                </div>
              </div>
            </section>

            <section className="section-block" style={{ paddingTop: 20 }}>
              <div className="container">
                <div className="workspace-tabs" style={{ marginBottom: 40 }}>
                  <button
                    className={`tab-btn ${vistaProveedor === 'mis-maquinas' ? 'is-active' : ''}`}
                    onClick={() => { setVistaProveedor('mis-maquinas'); fetchMachines(); }}
                  >
                    Mis Máquinas
                  </button>
                  <button
                    className={`tab-btn ${vistaProveedor === 'publicar' ? 'is-active' : ''}`}
                    onClick={() => setVistaProveedor('publicar')}
                  >
                    Publicar Máquina
                  </button>
                  <button
                    className={`tab-btn ${vistaProveedor === 'reservas' ? 'is-active' : ''}`}
                    onClick={() => { setVistaProveedor('reservas'); cargarReservasRecibidas(); }}
                  >
                    Reservas Recibidas
                  </button>
                </div>

                {vistaProveedor === 'mis-maquinas' && (
                  <div className="fleet-card">
                    <div className="fleet-toolbar">
                      <h2 className="section-title">Mi Inventario</h2>
                    </div>
                    <div className="fleet-table-wrap">
                      <table className="fleet-table">
                        <thead>
                          <tr>
                            <th>Foto</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Precio/Día</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {machines.filter(m => m.id_proveedor === sessionUser.id_proveedor).map((m) => (
                            <tr key={m.id_maquinaria}>
                              <td>
                                {m.foto ? (
                                  <img src={m.foto} alt={m.marca} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                                ) : (
                                  <div style={{ width: 40, height: 40, background: '#23252a', borderRadius: 8 }}></div>
                                )}
                              </td>
                              <td className="cell-brand">{m.marca}</td>
                              <td>{m.modelo}</td>
                              <td className="cell-mono">{formatPrice(Number(m.precio_dia))}</td>
                              <td>{m.estado}</td>
                              <td>
                                <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => alert('Editar estará disponible en el próximo Sprint')}>
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {vistaProveedor === 'publicar' && (
                  <div className="auth-card" style={{ maxWidth: 800, margin: '0 auto' }}>
                    <h2 className="section-title" style={{ marginBottom: 24 }}>Publicar Nueva Máquina</h2>
                    <form onSubmit={handlePublicarMaquina} className="auth-form">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-field">
                          <label className="form-label">Marca *</label>
                          <input type="text" className="form-input" value={nuevaMarca} onChange={(e) => setNuevaMarca(e.target.value)} required />
                        </div>
                        <div className="form-field">
                          <label className="form-label">Modelo *</label>
                          <input type="text" className="form-input" value={nuevoModelo} onChange={(e) => setNuevoModelo(e.target.value)} required />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-field">
                          <label className="form-label">Categoría *</label>
                          <select className="form-select" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} required>
                            <option value="">Seleccione una categoría</option>
                            <option value="1">Tractor</option>
                            <option value="2">Sembradora</option>
                            <option value="3">Cosechadora</option>
                            <option value="4">Rastra</option>
                            <option value="5">Pulverizadora</option>
                          </select>
                        </div>
                        <div className="form-field">
                          <label className="form-label">Año</label>
                          <input type="number" className="form-input" value={nuevoAnio} onChange={(e) => setNuevoAnio(e.target.value)} min="1950" max="2026" />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-field">
                          <label className="form-label">Patente</label>
                          <input type="text" className="form-input" value={nuevaPatente} onChange={(e) => setNuevaPatente(e.target.value)} placeholder="ABCD-12" />
                        </div>
                        <div className="form-field">
                          <label className="form-label">Precio por Día *</label>
                          <input type="number" className="form-input" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} required />
                        </div>
                      </div>

                      <div className="form-field">
                        <label className="form-label">Descripción</label>
                        <textarea className="form-input" rows={3} value={nuevaDescripcion} onChange={(e) => setNuevaDescripcion(e.target.value)} />
                      </div>

                      <div className="form-field">
                        <label className="form-label">Fotos (máx. 5)</label>
                        <input type="file" multiple accept="image/*" onChange={handleAgregarFoto} className="form-input" />
                        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                          {fotosNuevas.map((foto, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <span style={{ fontSize: 12, color: '#9da3ae' }}>{foto.name}</span>
                              <button type="button" onClick={() => handleQuitarFoto(i)} style={{ marginLeft: 5, background: 'transparent', border: 'none', color: '#eb5757', cursor: 'pointer' }}>X</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {errorPublicar && <div className="form-alert form-alert-error">{errorPublicar}</div>}
                      {exitoPublicar && <div className="form-alert form-alert-success">{exitoPublicar}</div>}

                      <button type="submit" className="btn btn-primary btn-full" disabled={publicando}>
                        {publicando ? 'Publicando...' : 'Guardar Máquina'}
                      </button>
                    </form>
                  </div>
                )}

                {vistaProveedor === 'reservas' && (
                  <div className="fleet-card">
                    <div className="fleet-toolbar">
                      <h2 className="section-title">Reservas Recibidas</h2>
                    </div>
                    <div className="fleet-table-wrap">
                      <table className="fleet-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Máquina</th>
                            <th>Fechas</th>
                            <th>Seña Pagada</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reservasRecibidas.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>No hay reservas recibidas.</td></tr>
                          ) : (
                            reservasRecibidas.map((res: any) => (
                              <tr key={res.id_reserva}>
                                <td>#{res.id_reserva}</td>
                                <td className="cell-brand">{res.marca} {res.modelo}</td>
                                <td>{res.fecha_inicio.substring(0, 10)} al {res.fecha_fin.substring(0, 10)}</td>
                                <td className="cell-mono" style={{ color: res.estado_pago === 'Pagado' ? '#e4f222' : '#9da3ae' }}>
                                  ${Number(res.monto_seña || 0).toLocaleString('es-CL')}
                                </td>
                                <td>{res.estado}</td>
                                <td>
                                  {res.estado === 'Pendiente' && (
                                    <>
                                      <button className="btn btn-primary" style={{ marginRight: 5, padding: '6px 12px', fontSize: 12 }} onClick={() => handleCambiarEstadoReserva(res.id_reserva, 'Confirmada', `${res.marca} ${res.modelo}`)}>Aceptar</button>
                                      <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleCambiarEstadoReserva(res.id_reserva, 'Rechazada', `${res.marca} ${res.modelo}`)}>Rechazar</button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          // --- VISTA DEL CLIENTE (MARÍA) ---
          <>
            <section id="inicio" className="hero-section">
              <div className="container hero-grid">
                <div className="hero-content">
                  <p className="hero-kicker">Infraestructura agrícola bajo demanda</p>
                  <h1 className="hero-title">
                    El campo. <span className="hero-title-accent">Digitalizado.</span>
                  </h1>
                  <p className="hero-subtitle">
                    Conectamos directamente a productores agropecuarios con dueños de maquinaria
                    verificada. Reservá tractores, cosechadoras y sembradoras por jornada con
                    tarifas transparentes.
                  </p>
                  <div className="hero-cta-row">
                    <button type="button" onClick={() => scrollToAccess('login')} className="btn btn-primary">
                      Empezar ahora
                    </button>
                    <a href="#flota" className="hero-secondary-link">
                      Ver maquinaria disponible
                    </a>
                  </div>
                </div>

                <div className="hero-media-card">
                  {!imgFailed ? (
                    <img
                      src={tractorHeroImg}
                      alt="Tractor agrícola moderno operando en campo al atardecer"
                      className="hero-media-img"
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed(true)}
                    />
                  ) : (
                    <div className="hero-media-fallback">
                      <Tractor size={40} color="#e4f222" />
                      <span>Tractor de alta potencia en operación</span>
                    </div>
                  )}
                  <div className="hero-media-scrim" aria-hidden="true" />
                  <div className="hero-media-caption">
                    <span>Flota activa en campaña</span>
                    <span className="hero-media-meta">120 HP – 354 HP · Reserva directa</span>
                  </div>
                </div>
              </div>
            </section>

            <section id="plataforma" className="section-block">
              <div className="container">
                <div className="section-header">
                  <h2 className="section-title">Operación simple para cada campaña</h2>
                  <p className="section-lead">
                    Eliminamos intermediarios y llamadas sin respuesta para que cada equipo llegue a
                    tiempo a tu lote.
                  </p>
                </div>

                <div className="bento-grid">
                  <article className="surface-card">
                    <span className="card-index">01.</span>
                    <h3 className="card-title">Búsqueda por labor y potencia</h3>
                    <p className="card-text">
                      Filtrá tractores, sembradoras, pulverizadoras y cosechadoras según tu ventana
                      de trabajo y zona productiva.
                    </p>
                  </article>

                  <article className="surface-card">
                    <span className="card-index">02.</span>
                    <h3 className="card-title">Tarifa diaria previsible</h3>
                    <p className="card-text">
                      Consultá el valor por día de cada unidad antes de reservar, sin comisiones ocultas
                      ni presupuestos informales.
                    </p>
                  </article>

                  <article className="surface-card">
                    <span className="card-index">03.</span>
                    <h3 className="card-title">Rentabilidad para propietarios</h3>
                    <p className="card-text">
                      Publicá tus equipos en fechas disponibles y convertí las horas ociosas de tu
                      parque de maquinaria en ingresos constantes.
                    </p>
                  </article>
                </div>
              </div>
            </section>

            <section id="flota" className="section-block">
              <div className="container">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Maquinaria Disponible</h2>
                  </div>
                  <p className="section-lead">
                    Unidades verificadas listas para coordinar entrega o trabajo en campo.
                  </p>
                </div>

                {sessionUser && (
                  <div className="workspace-tabs" role="tablist" aria-label="Vistas de maquinaria">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === 'catalogo'}
                      className={`tab-btn ${activeTab === 'catalogo' ? 'is-active' : ''}`}
                      onClick={() => setActiveTab('catalogo')}
                    >
                      Catálogo de Máquinas
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === 'reservas'}
                      className={`tab-btn ${activeTab === 'reservas' ? 'is-active' : ''}`}
                      onClick={() => setActiveTab('reservas')}
                    >
                      Mis Reservas ({reservasReales.length})
                    </button>
                  </div>
                )}

                {activeTab === 'reservas' && sessionUser ? (
                  <div className="fleet-card">
                    <div className="fleet-toolbar">
                      <span>Mis Reservas</span>
                      <button type="button" className="btn btn-outline" onClick={() => setActiveTab('catalogo')}>
                        Explorar catálogo
                      </button>
                    </div>
                    {reservasReales.length === 0 ? (
                      <div style={{ padding: '40px 24px', color: 'var(--text-secondary)' }}>
                        Todavía no tienes reservas registradas. Seleccioná un equipo en el catálogo para registrar tu solicitud.
                      </div>
                    ) : (
                      <div className="fleet-table-wrap">
                        <table className="fleet-table">
                          <thead>
                            <tr>
                              <th>ID Reserva</th>
                              <th>Máquina</th>
                              <th>Fechas</th>
                              <th>Costo Est.</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reservasReales.map((res: any) => {
                              let colorEstado = '#212529';
                              if (res.estado === 'Pendiente') colorEstado = '#f39c12';
                              if (res.estado === 'Confirmada') colorEstado = '#07503f';
                              if (res.estado === 'Cancelada' || res.estado === 'Rechazada') colorEstado = '#dc3545';

                              return (
                                <tr key={res.id_reserva}>
                                  <td className="cell-mono">#{res.id_reserva}</td>
                                  <td className="cell-brand">{res.marca} {res.modelo}</td>
                                  <td className="cell-mono">
                                    {res.fecha_inicio.substring(0, 10)} al {res.fecha_fin.substring(0, 10)}
                                  </td>
                                  <td className="cell-mono">{formatPrice(Number(res.costo_estimado))}</td>
                                  <td style={{ color: colorEstado, fontWeight: 600 }}>{res.estado}</td>
                                  <td>
                                    {res.estado === 'Confirmada' && (
                                      <button 
                                        className="btn btn-outline" 
                                        style={{ fontSize: 12, padding: '6px 12px' }}
                                        onClick={() => alert('La valoración estará disponible próximamente.')}
                                      >
                                        Valorar
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="fleet-card">
                    <div className="fleet-toolbar">
                      <form className="fleet-search-form" onSubmit={handleSearchSubmit}>
                        <input
                          type="search"
                          className="form-input"
                          placeholder="Buscar por marca, modelo o descripción..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          aria-label="Buscar maquinaria"
                        />
                        <button type="submit" className="btn btn-primary">
                          <Search size={16} />
                          <span>Buscar</span>
                        </button>
                      </form>

                      {selectedMachine && (
                        <span className="hero-media-meta">
                          Seleccionado: {selectedMachine.marca} {selectedMachine.modelo}
                        </span>
                      )}
                    </div>

                    {machinesLoading ? (
                      <div style={{ padding: '40px 24px', color: 'var(--text-secondary)' }}>
                        Cargando catálogo de maquinaria...
                      </div>
                    ) : machinesError ? (
                      <div style={{ padding: '32px 24px' }}>
                        <div className="form-alert form-alert-error">
                          <AlertCircle size={18} />
                          <span>{machinesError}</span>
                        </div>
                      </div>
                    ) : machines.length === 0 ? (
                      <div style={{ padding: '40px 24px', color: 'var(--text-secondary)' }}>
                        No se encontraron equipos que coincidan con "{searchQuery}".
                      </div>
                    ) : (
                      <div className="fleet-table-wrap">
                        <table className="fleet-table">
                          <thead>
                            <tr>
                              <th>Marca</th>
                              <th>Modelo</th>
                              <th>Categoría</th>
                              <th>Año</th>
                              <th>Precio/Día</th>
                              <th>Descripción</th>
                              <th>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {machines.map((machine) => {
                              const isReserved = reservasReales.some(
                                (r: any) => r.id_maquinaria === machine.id_maquinaria
                              );
                              return (
                                <tr key={machine.id_maquinaria}>
                                  <td className="cell-brand">
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                      {machine.foto && (
                                        <img
                                          src={machine.foto}
                                          alt={`${machine.marca} ${machine.modelo}`}
                                          loading="lazy"
                                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }}
                                        />
                                      )}
                                      {machine.marca}
                                    </span>
                                  </td>
                                  <td>{machine.modelo}</td>
                                  <td>{machine.categoria ?? '—'}</td>
                                  <td className="cell-mono">{machine.anio ?? '—'}</td>
                                  <td className="cell-mono">{formatPrice(Number(machine.precio_dia))}</td>
                                  <td>{machine.descripcion ?? '—'}</td>
                                  <td>
                                                                    <button
                                  type="button"
                                  className="btn btn-outline"
                                  onClick={() => {
                                    if (!sessionUser) {
                                      scrollToAccess('login');
                                    } else if (sessionUser.role === 'propietario') {
                                      alert('La edición estará disponible próximamente.');
                                    } else {
                                      abrirDetalles(machine);
                                    }
                                  }}
                                >
                                  {sessionUser?.role === 'propietario'
                                    ? 'Editar (Próximamente)'
                                    : sessionUser
                                      ? 'Ver más detalles'
                                      : 'Iniciar sesión'}
                                </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section id="acceso" ref={accessSectionRef} className="auth-section">
              <div className="container auth-layout">
                <div className="auth-aside">
                  <h2 className="section-title">Ingresá a tu cuenta y coordiná tu próxima jornada</h2>
                  <p className="section-lead">
                    Accedé al panel completo para gestionar reservas activas, consultar ubicación de las unidades o publicar tu propia maquinaria en AgroRent.
                  </p>
                  <ul className="auth-bullets">
                    <li className="auth-bullet-item">
                      <span className="auth-bullet-num">01</span>
                      <span>Productores: reserva directa con confirmación en línea.</span>
                    </li>
                    <li className="auth-bullet-item">
                      <span className="auth-bullet-num">02</span>
                      <span>Propietarios: control total de tarifas y calendario operativo.</span>
                    </li>
                    <li className="auth-bullet-item">
                      <span className="auth-bullet-num">03</span>
                      <span>Sesión segura sincronizada con tu perfil de usuario.</span>
                    </li>
                  </ul>
                </div>

                <div className="auth-card">
                  {sessionUser ? (
                    <div className="session-panel">
                      <div className="auth-card-header">
                        <h3 className="auth-card-title">Sesión activa</h3>
                        <p className="auth-card-desc">Tu token y rol están guardados en localStorage y listos para operar.</p>
                      </div>

                      {authSuccess && (
                        <div className="form-alert form-alert-success" role="status">
                          <CheckCircle2 size={18} />
                          <span>{authSuccess}</span>
                        </div>
                      )}

                      <div className="session-meta">
                        <div className="session-row">
                          <span className="session-key">Usuario</span>
                          <span className="session-val">{sessionUser.name}</span>
                        </div>
                        <div className="session-row">
                          <span className="session-key">Email</span>
                          <span className="session-val">{sessionUser.email}</span>
                        </div>
                        <div className="session-row">
                          <span className="session-key">Rol</span>
                          <span className="session-val">{sessionRole}</span>
                        </div>
                        <div className="session-row">
                          <span className="session-key">Token</span>
                          <span className="session-val">
                            {sessionToken ? `${sessionToken.slice(0, 18)}...` : '—'}
                          </span>
                        </div>
                      </div>

                      <a href="#flota" className="btn btn-primary btn-full">Ir al catálogo de maquinaria</a>
                      <button type="button" onClick={handleLogout} className="btn btn-outline btn-full">Cerrar Sesión</button>
                    </div>
                  ) : (
                    <>
                      <div className="auth-card-header">
                        <h3 className="auth-card-title">
                          {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                        </h3>
                        <p className="auth-card-desc">
                          {authMode === 'login'
                            ? 'Ingresá con tu correo y contraseña para acceder al catálogo.'
                            : 'Registrate como productor o propietario de maquinaria.'}
                        </p>
                      </div>

                      <form className="auth-form" onSubmit={handleAuthSubmit} noValidate>
                        {authMode === 'register' && (
                          <>
                            <div className="form-field">
                              <label htmlFor="auth-name" className="form-label">Nombre completo</label>
                              <input
                                ref={nameInputRef}
                                id="auth-name"
                                type="text"
                                className="form-input"
                                placeholder="María González"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                              />
                            </div>

                            <div className="form-field">
                              <label htmlFor="auth-role" className="form-label">Tipo de perfil</label>
                              <select
                                id="auth-role"
                                className="form-select"
                                value={roleSelection}
                                onChange={(e) => setRoleSelection(e.target.value as 'productor' | 'propietario')}
                              >
                                <option value="productor">Productor (Arrendar maquinaria)</option>
                                <option value="propietario">Propietario (Publicar equipos)</option>
                              </select>
                            </div>

                            <div className="form-field">
                              <label htmlFor="auth-rut" className="form-label">RUT</label>
                              <input
                                id="auth-rut"
                                type="text"
                                className="form-input"
                                placeholder="12.345.678-9"
                                value={rut}
                                onChange={(e) => setRut(e.target.value)}
                                autoComplete="off"
                                required
                              />
                            </div>
                          </>
                        )}

                        <div className="form-field">
                          <label htmlFor="auth-email" className="form-label">Correo electrónico</label>
                          <input
                            ref={emailInputRef}
                            id="auth-email"
                            type="email"
                            className="form-input"
                            placeholder="nombre@campo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                          />
                        </div>

                        <div className="form-field">
                          <label htmlFor="auth-password" className="form-label">Contraseña</label>
                          <div className="password-wrap">
                            <input
                              id="auth-password"
                              type={showPassword ? 'text' : 'password'}
                              className="form-input"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowPassword((prev) => !prev)}
                              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        {authError && (
                          <div className="form-alert form-alert-error" role="alert">
                            <AlertCircle size={18} />
                            <span>{authError}</span>
                          </div>
                        )}

                        <button type="submit" className="btn btn-primary btn-full" disabled={authLoading}>
                          {authLoading ? 'Procesando...' : authMode === 'login' ? 'Entrar' : 'Crear Cuenta'}
                        </button>
                      </form>

                      <div className="auth-footer-row">
                        <span>{authMode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés una cuenta?'}</span>
                        <button
                          type="button"
                          className="text-link-btn"
                          onClick={() => {
                            setAuthMode(authMode === 'login' ? 'register' : 'login');
                            setAuthError(null);
                          }}
                        >
                          {authMode === 'login' ? 'Registrarse' : 'Iniciar sesión'}
                        </button>
                      </div>

                      {authMode === 'login' && (
                        <div className="demo-hint">
                          <span>Cuenta demo: maria@productor.cl · contraseña: agrorent123</span>
                          <button type="button" className="demo-fill-btn" onClick={handleFillDemo}>
                            Completar datos
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>© 2026 AgroRent. Todos los derechos reservados.</span>
          <div className="footer-links">
            <a href="#inicio">Inicio</a>
            <a href="#plataforma">Plataforma</a>
            <a href="#flota">Maquinaria</a>
            <a href="#acceso">Acceso</a>
          </div>
        </div>
      </footer>

      {/* MODAL DE DETALLES */}
      {modalDetalles && (
        <div className="modal-overlay show" onClick={cerrarDetalles}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text-primary)' }}>
                {modalDetalles.marca} {modalDetalles.modelo}
              </h3>
              <button className="btn btn-outline" onClick={cerrarDetalles}>Cerrar</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
              <div>
                <div style={{ width: '100%', height: 300, background: '#0f1011', borderRadius: 12, overflow: 'hidden', marginBottom: 20, position: 'relative' }}>
                  {fotosDetalles.length > 0 ? (
                    <>
                      <img src={fotosDetalles[indiceFoto].ruta_foto} alt="Máquina" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {fotosDetalles.length > 1 && (
                        <>
                          <button 
                            onClick={() => setIndiceFoto((prev) => (prev - 1 + fotosDetalles.length) % fotosDetalles.length)}
                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '50%' }}
                          >
                            &lsaquo;
                          </button>
                          <button 
                            onClick={() => setIndiceFoto((prev) => (prev + 1) % fotosDetalles.length)}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '50%' }}
                          >
                            &rsaquo;
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#707580' }}>Sin fotos</div>
                  )}
                </div>
                
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 15 }}>
                  {modalDetalles.descripcion || 'Sin descripción.'}
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 16, color: 'var(--text-primary)' }}>Ficha Técnica</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Categoría</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{modalDetalles.categoria || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Año</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{modalDetalles.anio || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Patente</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{modalDetalles.patente || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Estado</span>
                    <span style={{ color: 'var(--accent-lime)', fontWeight: 500 }}>{modalDetalles.estado}</span>
                  </div>
                </div>

                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-lime)', marginBottom: 20 }}>
                  ${Number(modalDetalles.precio_dia).toLocaleString('es-CL')} <span style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 400 }}>/ día</span>
                </div>

                <button 
                  className="btn btn-primary btn-full" 
                  onClick={() => {
                    cerrarDetalles();
                    abrirModalReserva(modalDetalles);
                  }}
                >
                  Reservar ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESERVA (Fechas) */}
      {modalReserva && (
        <div className="modal-overlay show" onClick={cerrarModalReserva}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 10, color: 'var(--text-primary)' }}>
              Reservar {modalReserva.marca} {modalReserva.modelo}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Selecciona las fechas para tu arriendo. El costo estimado es de <strong>${Number(modalReserva.precio_dia).toLocaleString('es-CL')}</strong> por día.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label className="form-label">Fecha de inicio</label>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ colorScheme: 'dark' }}
                  value={fechaInicio} 
                  onChange={(e) => setFechaInicio(e.target.value)} 
                />
              </div>
              <div>
                <label className="form-label">Fecha de término</label>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ colorScheme: 'dark' }}
                  value={fechaFin} 
                  onChange={(e) => setFechaFin(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}>
              <input 
                type="checkbox" 
                id="aceptoTerminos" 
                checked={aceptoTerminos}
                onChange={(e) => setAceptoTerminos(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 3, cursor: 'pointer' }}
              />
              <label htmlFor="aceptoTerminos" style={{ fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.4 }}>
                Acepto los términos y condiciones. Entiendo que se cobrará una <strong>seña del 20%</strong> (${ (Number(modalReserva.precio_dia) * 0.20).toLocaleString('es-CL') }) para confirmar la reserva.
              </label>
            </div>

            {reservaError && (
              <div className="form-alert form-alert-error" style={{ marginBottom: 16 }}>
                {reservaError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={cerrarModalReserva}>Cancelar</button>
              <button 
                className="btn btn-primary" 
                onClick={confirmarReserva} 
                disabled={reservaLoading || !aceptoTerminos}
                style={{ opacity: aceptoTerminos ? 1 : 0.5, cursor: aceptoTerminos ? 'pointer' : 'not-allowed' }}
              >
                {reservaLoading ? 'Procesando...' : 'Confirmar y Pagar Seña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ACCIÓN (PROVEEDOR) */}
      {modalAccionReserva && (
        <div className="modal-overlay show" onClick={() => setModalAccionReserva(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 10, color: 'var(--text-primary)' }}>
              Confirmar Acción
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              ¿Estás seguro de que deseas <strong>{modalAccionReserva.estado.toLowerCase()}</strong> la reserva de <strong>{modalAccionReserva.label}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setModalAccionReserva(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarCambioEstado}>
                Sí, {modalAccionReserva.estado}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}