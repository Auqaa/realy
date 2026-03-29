import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const RewardCard = ({ reward, onPurchase, onPay }) => (
  <div className="rounded-3xl border border-slate-200 p-4">
    {reward.image && <img src={reward.image} alt={reward.name} className="mb-3 h-40 w-full rounded-2xl object-cover border border-slate-200" />}

    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-slate-900">{reward.name}</p>
        <p className="text-sm text-slate-600">{reward.description}</p>
        <p className="mt-1 text-xs text-slate-500">{reward.partnerName}</p>
      </div>
      {!reward.ticketOptions?.length && (
        <button onClick={() => onPurchase(reward._id, reward.cost)} className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
          {reward.cost} 🍄
        </button>
      )}
    </div>

    {reward.ticketOptions?.length > 0 && (
      <div className="mt-3 space-y-2">
        {reward.ticketOptions.map((option) => (
          <div key={option._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm text-slate-900">{option.name}</p>
                <p className="text-xs text-slate-500">{option.priceRub} руб. или {option.cost} 🍄</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onPurchase(reward._id, option.cost, option._id)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                  За баллы
                </button>
                <button onClick={() => onPay(reward, option)} className="rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black">
                  Оплатить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const ShopSection = ({ title, items, onPurchase, onPay, emptyText }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
    <h3 className="text-lg font-bold mb-3 text-slate-900">{title}</h3>
    <div className="space-y-3">
      {items.length ? items.map((reward) => <RewardCard key={reward._id} reward={reward} onPurchase={onPurchase} onPay={onPay} />) : <p className="text-sm text-slate-600">{emptyText}</p>}
    </div>
  </div>
);

const EMPTY_PAYMENT_FORM = {
  email: '',
  cardholder: '',
  cardNumber: '',
  expiry: '',
  cvc: ''
};

const Shop = () => {
  const [rewards, setRewards] = useState([]);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [processingPayment, setProcessingPayment] = useState(false);
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

  const refreshUser = async () => {
    const userRes = await api.get('/users/me');
    setUser(userRes.data);
  };

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
        await refreshUser();
        toast.success(`Промокод: ${res.data.promoCode}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Ошибка покупки');
    }
  };

  const openPayment = (reward, option) => {
    if (!user) {
      toast.error('Войдите, чтобы оплатить');
      return;
    }

    setPaymentTarget({
      rewardId: reward._id,
      rewardName: reward.name,
      optionId: option._id,
      optionName: option.name,
      amountRub: option.priceRub
    });
    setPaymentForm((current) => ({
      ...current,
      email: user.email || current.email || ''
    }));
  };

  const handlePay = async (event) => {
    event.preventDefault();
    if (!paymentTarget) return;

    setProcessingPayment(true);
    try {
      const payload = {
        rewardId: paymentTarget.rewardId,
        ticketOptionId: paymentTarget.optionId,
        email: paymentForm.email.trim(),
        cardholder: paymentForm.cardholder.trim(),
        cardNumber: paymentForm.cardNumber.replace(/\s+/g, ''),
        expiry: paymentForm.expiry.trim(),
        cvc: paymentForm.cvc.trim()
      };

      const res = await api.post('/rewards/pay', payload);
      if (res.data.success) {
        await refreshUser();
        setPaymentTarget(null);
        setPaymentForm(EMPTY_PAYMENT_FORM);
        toast.success(`Оплата прошла: ${res.data.ticketCode}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось провести оплату');
    } finally {
      setProcessingPayment(false);
    }
  };

  const tickets = useMemo(() => rewards.filter((reward) => reward.ticketOptions?.length || reward.kind === 'museum_ticket'), [rewards]);
  const purchases = useMemo(() => rewards.filter((reward) => !reward.ticketOptions?.length && reward.kind !== 'museum_ticket'), [rewards]);
  const recentPayments = useMemo(() => (user?.payments || []).slice(0, 4), [user]);

  return (
    <div className="space-y-4">
      <ShopSection title="Билеты" items={tickets} onPurchase={purchase} onPay={openPayment} emptyText="Пока нет доступных билетов." />
      <ShopSection title="Покупки" items={purchases} onPurchase={purchase} onPay={openPayment} emptyText="Пока нет доступных покупок." />

      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <h3 className="text-lg font-bold mb-3 text-slate-900">Последние оплаты</h3>
        <div className="space-y-2">
          {recentPayments.length ? (
            recentPayments.map((payment) => (
              <div key={payment.orderId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="font-semibold text-slate-900">{payment.rewardName}</div>
                <div className="text-sm text-slate-600">{payment.ticketOptionName || 'Покупка'}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {payment.type === 'card' ? `${payment.amountRub} руб.` : `${payment.amountPoints} 🍄`} • {payment.ticketCode || payment.promoCode}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">Оплаты и покупки появятся здесь после оформления.</p>
          )}
        </div>
      </div>

      {paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Оплата</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{paymentTarget.rewardName}</h3>
                <p className="mt-1 text-sm text-slate-500">{paymentTarget.optionName} • {paymentTarget.amountRub} руб.</p>
              </div>
              <button type="button" onClick={() => setPaymentTarget(null)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50">
                Закрыть
              </button>
            </div>

            <form onSubmit={handlePay} className="mt-5 space-y-3">
              <input type="email" value={paymentForm.email} onChange={(event) => setPaymentForm((current) => ({ ...current, email: event.target.value }))} placeholder="E-mail для чека" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" required />
              <input type="text" value={paymentForm.cardholder} onChange={(event) => setPaymentForm((current) => ({ ...current, cardholder: event.target.value }))} placeholder="Имя держателя карты" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" required />
              <input type="text" value={paymentForm.cardNumber} onChange={(event) => setPaymentForm((current) => ({ ...current, cardNumber: event.target.value }))} placeholder="Номер карты" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={paymentForm.expiry} onChange={(event) => setPaymentForm((current) => ({ ...current, expiry: event.target.value }))} placeholder="MM/YY" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" required />
                <input type="text" value={paymentForm.cvc} onChange={(event) => setPaymentForm((current) => ({ ...current, cvc: event.target.value }))} placeholder="CVC" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" required />
              </div>
              <p className="text-xs leading-5 text-slate-500">Локальная тестовая оплата: данные карты используются только для проверки сценария внутри приложения.</p>
              <button type="submit" disabled={processingPayment} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60">
                {processingPayment ? 'Проводим оплату...' : `Оплатить ${paymentTarget.amountRub} руб.`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
