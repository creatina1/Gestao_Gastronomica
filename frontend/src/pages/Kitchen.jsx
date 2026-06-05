import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import EmptyState from '../components/EmptyState.jsx';

function Kitchen() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  const fetchKitchenOrders = async () => {
    try {
      const response = await api.get('/orders/kitchen');
      setOrders(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="kitchen-page">
      <header className="kitchen-header">
        <div className="kitchen-title">
          <h1>👨‍🍳 TELÃO DA COZINHA</h1>
          <p>Acompanhe os pedidos em tempo real</p>
        </div>
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Voltar
        </button>
      </header>

      <div className="kitchen-status">
        <div className="status-badge">
          🔄 {orders.length} pedido{orders.length !== 1 ? 's' : ''} ativo{orders.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="kitchen-grid">
        {orders.length === 0 && (
          <div className="kitchen-empty">
            <EmptyState icon="✅" title="Nenhum pedido ativo" description="Aguardando novas solicitações do salão" />
          </div>
        )}

        {orders.map((order) => (
          <div key={order.id} className="kitchen-card">
            <div className="kitchen-card-header">
              <span className="order-id">Pedido #{order.id}</span>
              <span className={`order-status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
            </div>

            <div className="kitchen-card-body">
              <div className="order-customer">
                <p>
                  <strong>{order.customer_name}</strong>
                </p>
                <p className="order-table">Mesa {order.table_number || 'Livre'}</p>
              </div>

              <div className="order-items">
                <h3>Itens:</h3>
                {order.items && order.items.length > 0 ? (
                  <ul className="items-list">
                    {order.items.map((item, index) => (
                      <li key={index} className="item-line">
                        <span className="item-qty">{item.quantity}x</span>
                        <span className="item-name">{item.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-items">Sem itens registrados</p>
                )}
              </div>

              <div className="order-total">
                <span>Total:</span>
                <strong>R$ {order.total.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Kitchen;
