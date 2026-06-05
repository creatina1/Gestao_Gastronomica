import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import Navbar from '../components/Navbar.jsx';
import TabsNav from '../components/TabsNav.jsx';
import Card from '../components/Card.jsx';
import Alert from '../components/Alert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FormSection from '../components/FormSection.jsx';

const MENU_CATEGORIES = [
  'Prato principal',
  'Entrada',
  'Sobremesa',
  'Bebida alcoólica',
  'Bebida não alcoólica',
  'Lanche',
  'Salada',
  'Porção',
  'Prato executivo',
  'Outro',
];

function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('menu');
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [menuForm, setMenuForm] = useState({ name: '', description: '', price: '', category: 'Prato principal', available: true, image_url: '' });
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('Todas');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cart, setCart] = useState({}); // { [itemId]: quantity }
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCustomer, setCartCustomer] = useState('');
  const [cartTable, setCartTable] = useState('');
  const [inventoryForm, setInventoryForm] = useState({ name: '', quantity: '', unit: 'un', category: 'Ingredientes', min_quantity: '' });
  const [editInventoryId, setEditInventoryId] = useState(null);
  const [orderCustomer, setOrderCustomer] = useState('');
  const [orderTable, setOrderTable] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [managerEmailInput, setManagerEmailInput] = useState('');
  const [managerRoleInput, setManagerRoleInput] = useState('gerente');
  const [managerEmails, setManagerEmails] = useState([]);
  const [restaurantName, setRestaurantName] = useState('Churrascaria Sangue na Brasa');
  const [editingRestaurantName, setEditingRestaurantName] = useState('');
  const [tableCount, setTableCount] = useState(15);
  const [editingTableCount, setEditingTableCount] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, orderId: null });

  const managerRootEmail = 'joaopaulobarbosafernandesmonte@gmail.com';
  const normalizedManagerRootEmail = managerRootEmail.trim().toLowerCase();
  const normalizedUserEmail = user.email?.trim().toLowerCase();

  const roleLabels = {
    admin: 'Administrador',
    gerente: 'Gerente',
    atendimento: 'Atendimento',
    cozinha: 'Cozinha',
    user: 'Usuário',
  };

  const visibleTabs = useMemo(() => {
    if (['admin', 'gerente'].includes(user.role)) {
      return [
        { id: 'menu', label: 'Cardápio', icon: '📋' },
        { id: 'orders', label: 'Pedidos', icon: '🛒' },
        { id: 'inventory', label: 'Estoque', icon: '📦' },
      ];
    }

    const tabsForRole = [];
    if (['atendimento', 'user', 'admin'].includes(user.role)) {
      tabsForRole.push({ id: 'menu', label: 'Cardápio', icon: '📋' });
    }
    if (['atendimento', 'admin'].includes(user.role)) {
      tabsForRole.push({ id: 'orders', label: 'Pedidos', icon: '🛒' });
    }
    if (['cozinha', 'admin'].includes(user.role)) {
      tabsForRole.push({ id: 'orders', label: 'Pedidos', icon: '🛒' });
      tabsForRole.push({ id: 'inventory', label: 'Estoque', icon: '📦' });
    }
    return tabsForRole;
  }, [user.role]);

  const canManageMenu = ['admin', 'gerente'].includes(user.role);
  const canAccessMenu = ['admin', 'gerente', 'atendimento', 'user'].includes(user.role);
  const canAccessOrders = ['admin', 'gerente', 'atendimento', 'user'].includes(user.role);
  const canAccessInventory = ['admin', 'gerente', 'cozinha'].includes(user.role);

  // Métricas reais do estoque para o card de resumo
  const stockMetrics = useMemo(() => {
    if (inventory.length === 0) return { total: 0, minTotal: 0, remaining: 0, lowItems: 0, okItems: 0, pct: 0, status: 'ok' };
    const total     = inventory.reduce((sum, i) => sum + i.quantity, 0);
    const minTotal  = inventory.reduce((sum, i) => sum + i.min_quantity, 0);
    const remaining = Math.max(0, total - minTotal);
    const lowItems  = inventory.filter((i) => i.quantity <= i.min_quantity).length;
    const okItems   = inventory.filter((i) => i.quantity >  i.min_quantity).length;
    const pct       = Math.round((okItems / inventory.length) * 100);
    const status    = lowItems === 0 ? 'ok' : lowItems <= 3 ? 'warning' : 'danger';
    return { total: +total.toFixed(1), minTotal: +minTotal.toFixed(1), remaining: +remaining.toFixed(1), lowItems, okItems, pct, status };
  }, [inventory]);

  const menuCategories = useMemo(() => {
    return ['Todas', ...MENU_CATEGORIES];
  }, []);

  const activeMenuItems = useMemo(() => menuItems.filter((item) => item.available), [menuItems]);

  // Mesas ocupadas = pedidos ativos (não concluídos) com número de mesa preenchido
  const occupiedTables = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      if (o.status !== 'Concluído' && o.table_number) {
        set.add(String(o.table_number).trim());
      }
    });
    return set;
  }, [orders]);

  const filteredMenuItems = useMemo(() => {
    if (menuCategoryFilter === 'Todas') return activeMenuItems;
    return activeMenuItems.filter((item) => item.category === menuCategoryFilter);
  }, [activeMenuItems, menuCategoryFilter]);

  // Itens agrupados por categoria na ordem fixa do MENU_CATEGORIES
  const groupedMenuItems = useMemo(() => {
    const groups = [];
    const order = menuCategoryFilter === 'Todas' ? MENU_CATEGORIES : [menuCategoryFilter];
    for (const cat of order) {
      const items = activeMenuItems.filter((i) => i.category === cat);
      if (items.length > 0) groups.push({ category: cat, items });
    }
    // Itens com categoria fora da lista fixa
    const extraCats = [...new Set(activeMenuItems.map((i) => i.category).filter((c) => !MENU_CATEGORIES.includes(c)))];
    for (const cat of extraCats) {
      const items = activeMenuItems.filter((i) => i.category === cat);
      if (items.length > 0) groups.push({ category: cat, items });
    }
    return groups;
  }, [activeMenuItems, menuCategoryFilter]);

  useEffect(() => {
    if (canAccessMenu) fetchMenu();
    if (canAccessOrders) fetchOrders();
    if (canAccessInventory) fetchInventory();
    if (normalizedUserEmail === normalizedManagerRootEmail) {
      fetchManagerPermissions();
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const fetchMenu = async () => {
    try {
      const response = await api.get('/menu');
      setMenuItems(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchManagerPermissions = async () => {
    try {
      const response = await api.get('/auth/manager-permissions');
      setManagerEmails(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.restaurant_name) setRestaurantName(response.data.restaurant_name);
      if (response.data.table_count)     setTableCount(Number(response.data.table_count));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRestaurantName = async () => {
    try {
      await api.put('/settings', { key: 'restaurant_name', value: editingRestaurantName });
      setRestaurantName(editingRestaurantName);
      setEditingRestaurantName('');
      showMessage('Nome do restaurante atualizado!', 'success');
    } catch (err) {
      showMessage(err.response?.data?.message || 'Erro ao salvar nome.', 'error');
    }
  };

  const handleSaveTableCount = async () => {
    const n = Number(editingTableCount);
    if (!n || n < 1 || n > 100) { showMessage('Número de mesas inválido (1–100).', 'warning'); return; }
    try {
      await api.put('/settings', { key: 'table_count', value: String(n) });
      setTableCount(n);
      setEditingTableCount('');
      showMessage('Número de mesas atualizado!', 'success');
    } catch (err) {
      showMessage(err.response?.data?.message || 'Erro ao salvar mesas.', 'error');
    }
  };

  const handleGrantManager = async (event) => {
    event.preventDefault();
    if (!managerEmailInput) {
      showMessage('Informe o e-mail a ser liberado.', 'warning');
      return;
    }

    try {
      await api.post('/auth/manager-permissions', {
        email: managerEmailInput,
        role: managerRoleInput,
      });
      showMessage(`Acesso de ${roleLabels[managerRoleInput] || managerRoleInput} liberado para ${managerEmailInput}.`, 'success');
      setManagerEmailInput('');
      fetchManagerPermissions();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Erro ao liberar acesso.', 'error');
    }
  };

  const handleRevokeManager = async () => {
    if (!managerEmailInput) {
      showMessage('Informe o e-mail a ser removido do gerente.', 'warning');
      return;
    }

    try {
      await api.delete('/auth/manager-permissions', { data: { email: managerEmailInput } });
      showMessage(`Acesso de gerente removido de ${managerEmailInput}.`, 'success');
      setManagerEmailInput('');
      fetchManagerPermissions();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Erro ao remover gerente.', 'error');
    }
  };

  const orderItems = useMemo(
    () =>
      menuItems
        .filter((item) => selectedItems[item.id] > 0)
        .map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: Number(selectedItems[item.id]),
        })),
    [menuItems, selectedItems]
  );

  const orderTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [orderItems]
  );

  // ── Carrinho (visão user) ─────────────────────────────────────
  const cartItems = useMemo(() =>
    activeMenuItems
      .filter((i) => cart[i.id] > 0)
      .map((i) => ({ ...i, quantity: cart[i.id] })),
    [activeMenuItems, cart]
  );
  const cartTotal = useMemo(() =>
    cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [cartItems]
  );
  const cartCount = useMemo(() =>
    cartItems.reduce((s, i) => s + i.quantity, 0),
    [cartItems]
  );

  const addToCart = (item) => {
    setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
    setCartOpen(true);
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) next[id]--;
      else delete next[id];
      return next;
    });
  };

  const clearCart = () => { setCart({}); setCartCustomer(''); setCartTable(''); };

  const handleCartOrder = async () => {
    if (cartItems.length === 0) return;
    try {
      await api.post('/orders', {
        customer_name: cartCustomer || user.name,
        table_number: cartTable,
        items: cartItems.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        total: cartTotal,
      });
      clearCart();
      setCartOpen(false);
      showMessage('Pedido enviado para a cozinha! 🎉', 'success');
      fetchOrders();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Erro ao enviar pedido.', 'error');
    }
  };
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleAddMenuItem = async (event) => {
    event.preventDefault();
    try {
      await api.post('/menu', menuForm);
      setMenuForm({ name: '', description: '', price: '', category: 'Prato principal', available: true, image_url: '' });
      showMessage('Prato adicionado ao cardápio!', 'success');
      fetchMenu();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Erro ao salvar prato.', 'error');
    }
  };

  const handleCreateOrder = async (event) => {
    event.preventDefault();
    if (orderItems.length === 0) {
      showMessage('Selecione pelo menos um item para o pedido.', 'warning');
      return;
    }
    try {
      await api.post('/orders', {
        customer_name: orderCustomer,
        table_number: orderTable,
        items: orderItems,
        total: orderTotal,
      });
      setOrderCustomer('');
      setOrderTable('');
      setSelectedItems({});
      showMessage('Pedido enviado para a cozinha!', 'success');
      fetchOrders();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Erro ao enviar pedido.', 'error');
    }
  };

  const handleMarkOrderComplete = async (id) => {
    try {
      await api.put(`/orders/${id}`, { status: 'Concluído' });
      showMessage('Pedido marcado como concluído.', 'success');
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (id) => {
    setConfirmModal({ open: true, orderId: id });
  };

  const confirmDeleteOrder = async () => {
    const id = confirmModal.orderId;
    setConfirmModal({ open: false, orderId: null });
    try {
      await api.delete(`/orders/${id}`);
      showMessage('Pedido excluído.', 'success');
      fetchOrders();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Erro ao excluir pedido.', 'error');
    }
  };

  const handleInventorySave = async (event) => {
    event.preventDefault();
    const payload = {
      ...inventoryForm,
      quantity: Number(inventoryForm.quantity),
      min_quantity: Number(inventoryForm.min_quantity),
    };
    try {
      if (editInventoryId) {
        await api.put(`/inventory/${editInventoryId}`, payload);
        setEditInventoryId(null);
        showMessage('Estoque atualizado!', 'success');
      } else {
        await api.post('/inventory', payload);
        showMessage('Item de estoque adicionado!', 'success');
      }
      setInventoryForm({ name: '', quantity: '', unit: 'un', category: 'Ingredientes', min_quantity: '' });
      fetchInventory();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Erro ao salvar estoque.', 'error');
    }
  };

  const handleInventoryEdit = (item) => {
    setEditInventoryId(item.id);
    setInventoryForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      min_quantity: item.min_quantity,
    });
    setActiveTab('inventory');
  };

  const handleInventoryDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja remover este item?')) {
      try {
        await api.delete(`/inventory/${id}`);
        showMessage('Item de estoque removido.', 'success');
        fetchInventory();
      } catch (err) {
        showMessage(err.response?.data?.message || 'Erro ao remover item.', 'error');
      }
    }
  };

  return (
    <div className="dashboard-page">
      <Navbar user={user} onLogout={logout} onOpenKitchen={() => navigate('/kitchen')} onOpenProfile={() => setShowProfile(true)} restaurantName={restaurantName} onToggleSidebar={() => setSidebarOpen((v) => !v)} cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />

      {/* PERFIL EM TELA CHEIA (MODAL/OVERLAY) */}
      {showProfile && (
        <div className="profile-overlay" onClick={() => setShowProfile(false)}>
          <div className="profile-fullscreen" onClick={(e) => e.stopPropagation()}>
            <div className="profile-fullscreen-header">
              <h2>👤 Perfil do usuário</h2>
              <button className="btn-close-profile" onClick={() => setShowProfile(false)}>✕</button>
            </div>
            <div className="profile-fullscreen-body">
              <div className="profile-avatar-big">{user.name ? user.name[0].toUpperCase() : '?'}</div>
              <div className="profile-info">
                <div className="info-row">
                  <span className="label">👤 Nome:</span>
                  <span className="value">{user.name}</span>
                </div>
                <div className="info-row">
                  <span className="label">📧 E-mail:</span>
                  <span className="value">{user.email}</span>
                </div>
                <div className="info-row">
                  <span className="label">🔖 Papel:</span>
                  <span className="value">{roleLabels[user.role] || 'Usuário'}</span>
                </div>
              </div>

              <div className="profile-section">
                <h3>Sobre o sistema</h3>
                <p>
                  Este painel centraliza todas as operações do seu restaurante: gerenciamento de cardápio, pedidos,
                  estoque e integração com a cozinha.
                </p>
              </div>

              {normalizedUserEmail === normalizedManagerRootEmail && (
                <div className="profile-section">
                  <h3>Nome do restaurante</h3>
                  <p>Este nome é exibido para os clientes na tela do cardápio.</p>
                  <div className="restaurant-name-edit">
                    <input
                      value={editingRestaurantName !== '' ? editingRestaurantName : restaurantName}
                      onChange={(e) => setEditingRestaurantName(e.target.value)}
                      placeholder="Nome do restaurante"
                    />
                    <button
                      className="btn-primary"
                      onClick={handleSaveRestaurantName}
                      disabled={!editingRestaurantName || editingRestaurantName === restaurantName}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              )}

              {normalizedUserEmail === normalizedManagerRootEmail && (
                <div className="profile-section">
                  <h3>Número de mesas</h3>
                  <p>Define quantas mesas aparecem no Terminal do Garçom.</p>
                  <div className="restaurant-name-edit">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingTableCount !== '' ? editingTableCount : tableCount}
                      onChange={(e) => setEditingTableCount(e.target.value)}
                      placeholder="Ex: 15"
                    />
                    <button
                      className="btn-primary"
                      onClick={handleSaveTableCount}
                      disabled={!editingTableCount || Number(editingTableCount) === tableCount}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              )}

              {normalizedUserEmail === normalizedManagerRootEmail && (
                <div className="profile-section">
                  <h3>Gestão de acessos de gerente</h3>
                  <p>Somente você pode conceder ou revogar acesso de gerente, atendimento ou cozinha para outros usuários.</p>

                  <form onSubmit={handleGrantManager} className="manager-form">
                    <label htmlFor="manager-email">E-mail do usuário</label>
                    <input
                      id="manager-email"
                      value={managerEmailInput}
                      onChange={(e) => setManagerEmailInput(e.target.value)}
                      placeholder="email@exemplo.com"
                    />

                    <label htmlFor="manager-role">Papel</label>
                    <select
                      id="manager-role"
                      value={managerRoleInput}
                      onChange={(e) => setManagerRoleInput(e.target.value)}
                    >
                      <option value="gerente">Gerente</option>
                      <option value="atendimento">Atendimento</option>
                      <option value="cozinha">Cozinha</option>
                    </select>

                    <div className="form-actions">
                      <button type="submit" className="btn-primary btn-full">
                        Liberar acesso
                      </button>
                      <button type="button" className="btn-secondary btn-full" onClick={handleRevokeManager}>
                        Remover acesso
                      </button>
                    </div>
                  </form>

                  {managerEmails.length > 0 && (
                    <div className="manager-list">
                      <h4>Perfis autorizados</h4>
                      <ul>
                        {managerEmails.map((entry, index) => {
                          const email = typeof entry === 'string' ? entry : entry?.email || '';
                          const role = typeof entry === 'string' ? 'gerente' : entry?.role || 'gerente';
                          return (
                            <li key={email || index}>
                              {roleLabels[role] || role}: {email}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="profile-section">
                <h3>Recursos disponíveis</h3>
                <ul className="features-list">
                  <li>📋 Gestão de cardápio com categorias e preços</li>
                  <li>🛒 Sistema de pedidos integrado</li>
                  <li>👨‍🍳 Telão da cozinha em tempo real</li>
                  <li>📦 Controle de estoque com alertas de mínimo</li>
                  <li>📊 Relatórios de vendas e status</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {user.role !== 'user' && (
        <TabsNav tabs={visibleTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmModal.open && (
        <div className="confirm-overlay" onClick={() => setConfirmModal({ open: false, orderId: null })}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3>Excluir pedido</h3>
            <p>Tem certeza que deseja excluir o pedido <strong>#{confirmModal.orderId}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => setConfirmModal({ open: false, orderId: null })}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={confirmDeleteOrder}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {user.role === 'user' && cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <aside className="cart-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h3>🛒 Carrinho</h3>
              <button className="btn-close-profile" onClick={() => setCartOpen(false)}>✕</button>
            </div>

            <div className="cart-body">
              {cartItems.length === 0 ? (
                <div className="cart-empty">
                  <span>🍽️</span>
                  <p>Nenhum item adicionado</p>
                </div>
              ) : (
                <ul className="cart-list">
                  {cartItems.map((item) => (
                    <li key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <span className="cart-item-name">{item.name}</span>
                        <span className="cart-item-price">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="cart-item-qty">
                        <button onClick={() => removeFromCart(item.id)}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => addToCart(item)}>+</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-footer">
                <div className="cart-fields">
                  <input
                    placeholder="Seu nome (opcional)"
                    value={cartCustomer}
                    onChange={(e) => setCartCustomer(e.target.value)}
                  />
                  <input
                    placeholder="Nº da mesa (opcional)"
                    value={cartTable}
                    onChange={(e) => setCartTable(e.target.value)}
                  />
                </div>
                <div className="cart-total">
                  <span>Total</span>
                  <strong>R$ {cartTotal.toFixed(2)}</strong>
                </div>
                <button className="btn-primary btn-full" onClick={handleCartOrder}>
                  📤 Enviar pedido
                </button>
                <button className="btn-cart-clear" onClick={clearCart}>Limpar carrinho</button>
              </div>
            )}

            {/* Pedidos anteriores do usuário */}
            {orders.length > 0 && (
              <div className="cart-orders-history">
                <h4 className="cart-orders-title">Seus pedidos</h4>
                {orders.map((order) => (
                  <div key={order.id} className={`cart-order-item ${order.status === 'Concluído' ? 'cart-order-done' : ''}`}>
                    <div className="cart-order-header">
                      <span className="cart-order-id">Pedido #{order.id}</span>
                      <span className={`cart-order-status badge ${order.status === 'Concluído' ? 'badge-success' : 'badge-warning'}`}>
                        {order.status}
                      </span>
                    </div>
                    {order.table_number && (
                      <span className="cart-order-table">🍽️ Mesa {order.table_number}</span>
                    )}
                    <ul className="cart-order-items">
                      {order.items.map((item, idx) => (
                        <li key={idx}>{item.quantity}× {item.name}</li>
                      ))}
                    </ul>
                    <span className="cart-order-total">R$ {order.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
      {user.role !== 'user' && (
      <div className="dashboard-summary">
        <div className="summary-card summary-terminal">
          <div className="summary-card-top">
            <div>
              <span className="summary-label">Terminal do Garçom</span>
              <h3>Mesa 12</h3>
            </div>
            <span className="summary-pill">Pedido ativo</span>
          </div>
          <div className="table-grid">
            {Array.from({ length: tableCount }, (_, i) => `Mesa ${i + 1}`).map((table, i) => {
              const num = String(i + 1);
              const occupied = occupiedTables.has(num) || occupiedTables.has(table);
              return (
                <div key={table} className={`table-chip ${occupied ? 'table-occupied' : ''}`}>
                  <span className="table-icon">{occupied ? '🔴' : '🍽️'}</span>
                  <span>{table}</span>
                  {occupied && <span className="table-status-label">Ocupada</span>}
                </div>
              );
            })}
          </div>
          <div className="summary-actions">
            <span className="summary-small-text">Selecione o pedido desejado ou abra o menu rápido.</span>
            <button className="btn-secondary btn-full">Registrar Pedido</button>
          </div>
        </div>

        <div className="summary-card summary-kds">
          <div className="summary-card-top">
            <div>
              <span className="summary-label">Monitor de Produção</span>
              <h3>KDS</h3>
            </div>
            <span className="summary-pill summary-pill-ready">Cozinha</span>
          </div>
          <div className="kds-status-list">
            {orders.slice(0, 4).map((order) => (
              <div key={order.id} className="kds-status-row">
                <div>
                  <strong>Pedido {order.id}</strong>
                  <p>{order.table_number ? `Mesa ${order.table_number}` : 'Sem mesa'}</p>
                </div>
                <span className={`status-badge status-${order.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {order.status}
                </span>
              </div>
            ))}
            {orders.length === 0 && <p className="summary-empty">Nenhum pedido em produção no momento</p>}
          </div>
          <div className="kds-footer">
            <span>Última atualização em tempo real.</span>
            <button className="btn-small btn-secondary" onClick={() => navigate('/kitchen')}>Ver Telão</button>
          </div>
        </div>

        <div className="summary-card summary-stock">
          <div className="summary-card-top">
            <div>
              <span className="summary-label">Controle de Insumos</span>
              <h3>Estoque & Alertas</h3>
            </div>
            <span className={`summary-pill ${stockMetrics.status === 'ok' ? 'summary-pill-ready' : 'summary-pill-warning'}`}>
              {stockMetrics.status === 'ok' ? 'Saudável' : stockMetrics.status === 'warning' ? 'Atenção' : 'Risco'}
            </span>
          </div>
          <div className="stock-lines">
            <div className="stock-line">
              <span>Total em estoque</span>
              <strong>{stockMetrics.total}</strong>
            </div>
            <div className="stock-line">
              <span>Mínimos necessários</span>
              <strong>{stockMetrics.minTotal}</strong>
            </div>
            <div className="stock-line">
              <span>Acima do mínimo</span>
              <strong>{stockMetrics.remaining}</strong>
            </div>
          </div>
          <div className="stock-progress">
            <span>Itens em nível saudável</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${stockMetrics.pct}%` }} />
            </div>
          </div>
          <div className="stock-alerts">
            <span className="alert-dot alert-dot-ok" />
            <p>Itens saudáveis: {stockMetrics.okItems}</p>
            <span className="alert-dot alert-dot-warning" />
            <p>Itens em alerta: {stockMetrics.lowItems}</p>
          </div>
        </div>
      </div>
      )}

      <main className="dashboard-main">
        {message.text && (
          <Alert type={message.type} message={message.text} onClose={() => setMessage({ text: '', type: '' })} />
        )}

        {/* CARDÁPIO TAB */}
        {activeTab === 'menu' && (
          <div className="tab-content">
            {/* VISÃO DO USUÁRIO COMUM — tela cheia sem card wrapper */}
            {user.role === 'user' ? (
              <div className="menu-fullscreen">

                {sidebarOpen && (
                  <div className="menu-sidebar-overlay" onClick={() => setSidebarOpen(false)}>
                    <aside className="menu-sidebar" onClick={(e) => e.stopPropagation()}>
                      <div className="menu-sidebar-header">
                        <span>Categorias</span>
                        <button className="btn-close-profile" onClick={() => setSidebarOpen(false)}>✕</button>
                      </div>
                      <ul className="menu-sidebar-list">
                        {menuCategories.map((cat) => (
                          <li key={cat}>
                            <button
                              className={`menu-sidebar-item${menuCategoryFilter === cat ? ' active' : ''}`}
                              onClick={() => { setMenuCategoryFilter(cat); setSidebarOpen(false); }}
                            >
                              {cat}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </aside>
                  </div>
                )}

                {groupedMenuItems.length === 0 ? (
                  <EmptyState icon="🍽️" title="Nenhum prato disponível" description="Verifique o cardápio ou habilite itens ativos" />
                ) : (
                  groupedMenuItems.map(({ category, items }) => (
                    <div key={category} className="menu-category-section">
                      <h2 className="menu-category-title">{category}</h2>
                      <div className="menu-cards-grid">
                        {items.map((item) => (
                          <div key={item.id} className="menu-card-large menu-card-clickable" onClick={() => addToCart(item)}>
                            <div className="menu-card-image">
                              {item.image_url
                                ? <img src={item.image_url} alt={item.name} />
                                : <span className="menu-card-no-image">🍽️</span>
                              }
                              {cart[item.id] > 0 && (
                                <span className="cart-badge">{cart[item.id]}</span>
                              )}
                            </div>
                            <div className="menu-card-body">
                              <h3 className="menu-card-name">{item.name}</h3>
                              <p className="menu-card-desc">{item.description || ''}</p>
                              <div className="menu-card-footer">
                                <span className="menu-card-price">R$ {item.price.toFixed(2)}</span>
                                <span className="menu-card-add-btn">+ Adicionar</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
            /* VISÃO DE ADMIN/GERENTE/COZINHA — layout com form + lista */
            <div className="content-grid">
              {canManageMenu && (
                <Card title="Cadastrar novo prato" subtitle="Adicione itens ao cardápio" className="form-card">
                  <form onSubmit={handleAddMenuItem} className="dashboard-form">
                    <FormSection>
                    <div className="form-row">
                      <div className="form-col">
                        <label htmlFor="menu-name">Nome do prato</label>
                        <input
                          id="menu-name"
                          value={menuForm.name}
                          onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                          placeholder="Ex: Frango à Parmegiana"
                          required
                        />
                      </div>
                      <div className="form-col">
                        <label htmlFor="menu-price">Preço (R$)</label>
                        <input
                          id="menu-price"
                          type="number"
                          step="0.01"
                          value={menuForm.price}
                          onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                  </FormSection>

                  <FormSection>
                    <label htmlFor="menu-desc">Descrição</label>
                    <textarea
                      id="menu-desc"
                      value={menuForm.description}
                      onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                      placeholder="Descreva o prato"
                    />
                  </FormSection>

                  <FormSection>
                    <label htmlFor="menu-cat">Categoria</label>
                    <select
                      id="menu-cat"
                      value={menuForm.category}
                      onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                    >
                      {MENU_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </FormSection>

                  <FormSection>
                    <label htmlFor="menu-img">URL da foto (opcional)</label>
                    <input
                      id="menu-img"
                      value={menuForm.image_url}
                      onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })}
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                    {menuForm.image_url && (
                      <div className="img-preview">
                        <img src={menuForm.image_url} alt="preview" onError={(e) => { e.target.style.display='none'; }} />
                      </div>
                    )}
                  </FormSection>

                  <FormSection>
                    <label className="checkbox-input">
                      <input
                        type="checkbox"
                        checked={menuForm.available}
                        onChange={(e) => setMenuForm({ ...menuForm, available: e.target.checked })}
                      />
                      <span>Disponível no cardápio</span>
                    </label>
                  </FormSection>

                  <button type="submit" className="btn-primary btn-full">
                    Salvar prato
                  </button>
                </form>
              </Card>
              )}

              <Card
                title="Cardápio ativo"
                subtitle={`${activeMenuItems.length} prato${activeMenuItems.length !== 1 ? 's' : ''}`}
                className="list-card"
              >
                <div className="category-filter-bar">
                  {menuCategories.map((cat) => (
                    <button
                      key={cat}
                      className={`category-filter-btn${menuCategoryFilter === cat ? ' active' : ''}`}
                      onClick={() => setMenuCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {groupedMenuItems.length === 0 ? (
                  <EmptyState icon="🍽️" title="Nenhum prato disponível" description="Verifique o cardápio ou habilite itens ativos" />
                ) : (
                  groupedMenuItems.map(({ category, items }) => (
                    <div key={category} className="menu-category-section">
                      <h2 className="menu-category-title">{category}</h2>
                      <div className="menu-cards-grid">
                        {items.map((item) => (
                          <div key={item.id} className={`menu-card-large ${!item.available ? 'disabled' : ''}`}>
                            <div className="menu-card-image admin-image">
                              {item.image_url
                                ? <img src={item.image_url} alt={item.name} onError={(e) => { e.target.style.display='none'; }} />
                                : <span className="menu-card-no-image">🍽️</span>
                              }
                            </div>
                            <div className="menu-card-body">
                              <div className="menu-card-header-row">
                                <h3 className="menu-card-name">{item.name}</h3>
                                <span className={`badge ${item.available ? 'badge-success' : 'badge-muted'}`}>
                                  {item.available ? '✓ Ativo' : 'Inativo'}
                                </span>
                              </div>
                              <p className="menu-card-desc">{item.description || 'Sem descrição'}</p>
                              <div className="menu-card-footer">
                                <span className="menu-card-price">R$ {item.price.toFixed(2)}</span>
                                <span className="item-category">{item.category}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>
            )}
          </div>
        )}

        {/* PEDIDOS TAB */}
        {activeTab === 'orders' && (
          <div className="tab-content">
            <div className="content-grid">
              <Card title="Criar novo pedido" subtitle="Selecione itens e envie para cozinha" className="form-card">
                <form onSubmit={handleCreateOrder} className="dashboard-form">
                  <FormSection>
                    <div className="form-row">
                      <div className="form-col">
                        <label htmlFor="order-customer">Cliente</label>
                        <input
                          id="order-customer"
                          value={orderCustomer}
                          onChange={(e) => setOrderCustomer(e.target.value)}
                          placeholder="Nome do cliente"
                          required
                        />
                      </div>
                      <div className="form-col">
                        <label htmlFor="order-table">Mesa</label>
                        <input
                          id="order-table"
                          value={orderTable}
                          onChange={(e) => setOrderTable(e.target.value)}
                          placeholder="Ex: 5"
                        />
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Selecionar itens">
                    <div className="items-selector">
                      {activeMenuItems.length === 0 ? (
                        <EmptyState icon="📋" title="Nenhum item disponível" description="Adicione itens ao cardápio primeiro" />
                      ) : (
                        activeMenuItems.map((item) => (
                          <div key={item.id} className="selector-item">
                            <div className="selector-info">
                              <strong>{item.name}</strong>
                              <p>R$ {item.price.toFixed(2)}</p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={selectedItems[item.id] || ''}
                              onChange={(e) => setSelectedItems({ ...selectedItems, [item.id]: Number(e.target.value) })}
                              placeholder="Qtd"
                              className="quantity-input"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </FormSection>

                  <FormSection>
                    <div className="order-total">
                      <span>Total do pedido:</span>
                      <strong className="total-value">R$ {orderTotal.toFixed(2)}</strong>
                    </div>
                  </FormSection>

                  <button type="submit" className="btn-primary btn-full btn-send">
                    📤 Enviar para cozinha
                  </button>
                </form>
              </Card>

              <Card
                title="Pedidos em aberto"
                subtitle={`${orders.filter((o) => o.status !== 'Concluído').length} pedido${orders.filter((o) => o.status !== 'Concluído').length !== 1 ? 's' : ''}`}
                className="list-card"
              >
                {orders.length === 0 ? (
                  <EmptyState icon="🛒" title="Nenhum pedido" description="Os pedidos aparecerão aqui" />
                ) : (
                  <div className="orders-list">
                    {orders.map((order) => (
                      <div key={order.id} className={`order-row status-${order.status.toLowerCase()}`}>
                        <div className="order-info">
                          <h4>#{order.id} - {order.customer_name}</h4>
                          <p>Mesa: {order.table_number || 'Livre'}</p>
                        </div>
                        <div className="order-data">
                          <span className="order-value">R$ {order.total.toFixed(2)}</span>
                          <span className={`badge ${order.status === 'Concluído' ? 'badge-success' : 'badge-warning'}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="order-actions">
                          {order.status !== 'Concluído' && (
                            <button className="btn-small" onClick={() => handleMarkOrderComplete(order.id)}>
                              ✓ Concluir
                            </button>
                          )}
                          {['admin', 'gerente'].includes(user.role) && (
                            <button className="btn-small btn-delete" onClick={() => handleDeleteOrder(order.id)}>
                              🗑️ Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ESTOQUE TAB */}
        {activeTab === 'inventory' && (
          <div className="tab-content">
            <div className="content-grid">
              <Card title={editInventoryId ? 'Editar item' : 'Cadastrar item'} subtitle="Controle de ingredientes" className="form-card">
                <form onSubmit={handleInventorySave} className="dashboard-form">
                  <FormSection>
                    <label htmlFor="inv-name">Ingrediente / Produto</label>
                    <input
                      id="inv-name"
                      value={inventoryForm.name}
                      onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                      placeholder="Ex: Sal refinado"
                      required
                    />
                  </FormSection>

                  <FormSection>
                    <div className="form-row">
                      <div className="form-col">
                        <label htmlFor="inv-qty">Quantidade</label>
                        <input
                          id="inv-qty"
                          type="number"
                          step="0.1"
                          value={inventoryForm.quantity}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                          placeholder="0"
                          required
                        />
                      </div>
                      <div className="form-col">
                        <label htmlFor="inv-unit">Unidade</label>
                        <input
                          id="inv-unit"
                          value={inventoryForm.unit}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                          placeholder="un, kg, l"
                          required
                        />
                      </div>
                    </div>
                  </FormSection>

                  <FormSection>
                    <div className="form-row">
                      <div className="form-col">
                        <label htmlFor="inv-cat">Categoria</label>
                        <input
                          id="inv-cat"
                          value={inventoryForm.category}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                          placeholder="Ex: Bebidas"
                        />
                      </div>
                      <div className="form-col">
                        <label htmlFor="inv-min">Quantidade mínima</label>
                        <input
                          id="inv-min"
                          type="number"
                          step="0.1"
                          value={inventoryForm.min_quantity}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, min_quantity: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </FormSection>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary btn-full">
                      {editInventoryId ? 'Atualizar' : 'Salvar'} item
                    </button>
                    {editInventoryId && (
                      <button
                        type="button"
                        className="btn-secondary btn-full"
                        onClick={() => {
                          setEditInventoryId(null);
                          setInventoryForm({ name: '', quantity: '', unit: 'un', category: 'Ingredientes', min_quantity: '' });
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </Card>

              <Card
                title="Estoque"
                subtitle={`${inventory.length} item${inventory.length !== 1 ? 'ns' : ''}`}
                className="list-card"
              >
                {inventory.length === 0 ? (
                  <EmptyState icon="📦" title="Estoque vazio" description="Comece adicionando ingredientes" />
                ) : (
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Ingrediente</th>
                        <th>Categoria</th>
                        <th>Qtd</th>
                        <th>Mín</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong>
                          </td>
                          <td>{item.category}</td>
                          <td>
                            {item.quantity.toFixed(1)} {item.unit}
                          </td>
                          <td>{item.min_quantity.toFixed(1)}</td>
                          <td>
                            <div className="table-actions">
                              <button className="btn-edit" onClick={() => handleInventoryEdit(item)}>
                                ✏️
                              </button>
                              <button className="btn-delete" onClick={() => handleInventoryDelete(item.id)}>
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;