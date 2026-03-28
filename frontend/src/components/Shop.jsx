import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const RewardCard = ({ reward, onPurchase }) => (
  <div className="border rounded-lg p-3 gap-3">
    {reward.image && (
      <img
        src={reward.image}
        alt={reward.name}
        className="w-full h-36 object-cover rounded-lg border mb-3"
      />
    )}
    <div className="flex justify-between items-start gap-3">
      <div>
        <p className="font-semibold">{reward.name}</p>
        <p className="text-sm text-gray-600">{reward.description}</p>
        <p className="text-xs text-gray-500 mt-1">{reward.partnerName}</p>
      </div>
      {!reward.ticketOptions?.length && (
        <button
          onClick={() => onPurchase(reward._id, reward.cost)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap"
        >
          {reward.cost}
        </button>
      )}
    </div>

    {reward.ticketOptions?.length > 0 && (
      <div className="mt-3 space-y-2">
        {reward.ticketOptions.map((option) => (
          <div key={option._id} className="flex items-center justify-between gap-3 border rounded-lg p-2 bg-slate-50">
            <div>
              <p className="font-medium text-sm">{option.name}</p>
              <p className="text-xs text-gray-500">{option.priceRub} руб.</p>
            </div>
            <button
              onClick={() => onPurchase(reward._id, option.cost, option._id)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap"
            >
              Купить за {option.cost}
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

const ShopSection = ({ title, items, onPurchase, emptyText }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 border">
    <h3 className="text-lg font-bold mb-3">{title}</h3>
    <div className="space-y-3">
      {items.length ? items.map((reward) => <RewardCard key={reward._id} reward={reward} onPurchase={onPurchase} />) : <p className="text-sm text-gray-600">{emptyText}</p>}
    </div>
  </div>
);

const Shop = () => {
  const [rewards, setRewards] = useState([]);
  const { user, setUser } = useAuth();

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const res = await api.get('/rewards');
        setRewards(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRewards();
  }, []);

  const purchase = async (rewardId, cost, ticketOptionId = null) => {
    if (!user) {
      toast.error('Войдите, чтобы покупать');
      return;
    }
    if (user.balance < cost) {
      toast.error('Недостаточно баллов');
      return;
    }

    try {
      const res = await api.post('/rewards/purchase', { rewardId, ticketOptionId });
      if (res.data.success) {
        setUser({ ...user, balance: res.data.newBalance });
        toast.success(`Промокод: ${res.data.promoCode}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Ошибка');
    }
  };

  const tickets = useMemo(() => rewards.filter((reward) => reward.ticketOptions?.length || reward.kind === 'museum_ticket'), [rewards]);
  const purchases = useMemo(() => rewards.filter((reward) => !reward.ticketOptions?.length && reward.kind !== 'museum_ticket'), [rewards]);

  return (
    <div className="space-y-4">
      <ShopSection title="Билеты" items={tickets} onPurchase={purchase} emptyText="Пока нет доступных билетов." />
      <ShopSection title="Покупки" items={purchases} onPurchase={purchase} emptyText="Пока нет доступных покупок." />
    </div>
  );
};

export default Shop;
