const roleLabels = {
  admin: 'Administrador',
  gerente: 'Gerente',
  atendimento: 'Atendimento',
  cozinha: 'Cozinha',
  user: 'Usuário',
};

function Navbar({ user, onLogout, onOpenKitchen, onOpenProfile, restaurantName, onToggleSidebar, cartCount, onOpenCart }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        {user.role === 'user' && (
          <button className="btn-hamburger" onClick={onToggleSidebar} title="Categorias">
            <span /><span /><span />
          </button>
        )}
        <div className="logo">🍽️</div>
        <div>
          <h3>Sistema Gastronômico</h3>
          <p>Gestão completa de restaurante</p>
        </div>
      </div>

      <div className="navbar-center">
        <h3>{restaurantName || 'Churrascaria Sangue na Brasa'}</h3>
      </div>

      <div className="navbar-user">
        <div className="navbar-actions">
          {user.role === 'user' && (
            <button className="btn-cart" onClick={onOpenCart} title="Ver carrinho">
              🛒
              {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
            </button>
          )}
          {user.role !== 'user' && (
            <button className="btn-secondary" onClick={onOpenKitchen}>
              📺 Telão
            </button>
          )}
          <button className="btn-profile" onClick={onOpenProfile} title="Ver perfil">
            <span className="profile-avatar">{user.name ? user.name[0].toUpperCase() : '?'}</span>
            <span className="profile-label">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{roleLabels[user.role] || 'Usuário'}</span>
            </span>
          </button>
          <button className="btn-danger" onClick={onLogout}>
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
