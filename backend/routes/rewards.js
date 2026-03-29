const crypto = require('crypto');
const express = require('express');
const auth = require('../middleware/auth');
const { getDb, withDb } = require('../storage/fileDb');

const router = express.Router();

const museumRewards = [
  {
    _id: 'museum-kremlin',
    kind: 'museum_ticket',
    name: 'Рязанский историко-архитектурный музей-заповедник',
    description: 'пл. Кремль, д. 15',
    partnerName: 'Рязанский кремль',
    image: '/images/museums/ryazan-kremlin.jpg',
    ticketOptions: [
      { _id: 'adult', name: 'Взрослый билет', cost: 42, priceRub: 420 },
      { _id: 'student', name: 'Студенческий билет', cost: 27, priceRub: 270 },
      { _id: 'family', name: 'Семейный билет', cost: 65, priceRub: 650 }
    ]
  },
  {
    _id: 'museum-pavlov',
    kind: 'museum_ticket',
    name: 'Мемориальный музей-усадьба академика И.П. Павлова',
    description: 'ул. Павлова, д. 23',
    partnerName: 'Усадьба Павлова',
    image: '/images/museums/pavlov-estate.jpg',
    ticketOptions: [
      { _id: 'adult', name: 'Взрослый билет', cost: 34, priceRub: 340 },
      { _id: 'child', name: 'Детский билет', cost: 18, priceRub: 180 },
      { _id: 'guided', name: 'Билет с экскурсией', cost: 49, priceRub: 490 }
    ]
  },
  {
    _id: 'museum-vdv',
    kind: 'museum_ticket',
    name: 'Музей истории воздушно-десантных войск',
    description: 'ул. Каляева, д. 20',
    partnerName: 'Музей ВДВ',
    image: '/images/museums/vdv-museum.jpg',
    ticketOptions: [
      { _id: 'adult', name: 'Взрослый билет', cost: 36, priceRub: 360 },
      { _id: 'cadet', name: 'Кадетский билет', cost: 20, priceRub: 200 },
      { _id: 'guided', name: 'Экскурсия по музею', cost: 55, priceRub: 550 }
    ]
  },
  {
    _id: 'museum-pozhalostin',
    kind: 'museum_ticket',
    name: 'Рязанский государственный областной художественный музей им. И.П. Пожалостина',
    description: 'ул. Свободы, д. 57',
    partnerName: 'Художественный музей',
    image: '/images/museums/pozhalostin-museum.jpg',
    ticketOptions: [
      { _id: 'adult', name: 'Взрослый билет', cost: 38, priceRub: 380 },
      { _id: 'student', name: 'Студенческий билет', cost: 22, priceRub: 220 },
      { _id: 'exhibition', name: 'Выставочный билет', cost: 44, priceRub: 440 }
    ]
  },
  {
    _id: 'museum-auto',
    kind: 'museum_ticket',
    name: 'Музей военной автомобильной техники',
    description: 'ул. Военных автомобилистов, д. 12',
    partnerName: 'Музей техники',
    image: '/images/museums/auto-museum.jpg',
    ticketOptions: [
      { _id: 'adult', name: 'Взрослый билет', cost: 33, priceRub: 330 },
      { _id: 'family', name: 'Семейный билет', cost: 58, priceRub: 580 },
      { _id: 'tour', name: 'Тематическая экскурсия', cost: 62, priceRub: 620 }
    ]
  },
  {
    _id: 'museum-pryanik',
    kind: 'museum_ticket',
    name: 'Музей пряника',
    description: 'ул. Свободы, д. 4',
    partnerName: 'Музей пряника',
    image: '/images/museums/pryanik-museum.jpg',
    ticketOptions: [
      { _id: 'adult', name: 'Взрослый билет', cost: 29, priceRub: 290 },
      { _id: 'masterclass', name: 'Билет + мастер-класс', cost: 47, priceRub: 470 },
      { _id: 'family', name: 'Семейный билет', cost: 54, priceRub: 540 }
    ]
  },
  {
    _id: 'museum-youth',
    kind: 'museum_ticket',
    name: 'Дом-музей истории молодежного движения',
    description: 'ул. Свободы, д. 79',
    partnerName: 'Дом-музей',
    image: '/images/museums/youth-house-museum.jpg',
    ticketOptions: [
      { _id: 'adult', name: 'Взрослый билет', cost: 24, priceRub: 240 },
      { _id: 'student', name: 'Студенческий билет', cost: 16, priceRub: 160 },
      { _id: 'lecture', name: 'Билет + лекция', cost: 31, priceRub: 310 }
    ]
  }
];

const getRewardCatalog = (db) => [...museumRewards, ...(db.rewards || [])];

const buildPaymentMeta = ({ reward, ticketOptionId }) => {
  const suffix = (ticketOptionId || 'BASE').toUpperCase();
  return {
    orderId: crypto.randomUUID(),
    paymentId: `PAY-${Date.now().toString(36).toUpperCase()}`,
    promoCode:
      reward.kind === 'museum_ticket'
        ? `NRZ-${reward._id.slice(-6).toUpperCase()}-${suffix}`
        : reward.promoCode,
    ticketCode: `TKT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  };
};

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    res.json(getRewardCatalog(db));
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/purchase', auth, async (req, res) => {
  const { rewardId, ticketOptionId } = req.body;
  try {
    const db = await getDb();
    const reward = getRewardCatalog(db).find((item) => item._id === rewardId);
    if (!reward) return res.status(404).json({ msg: 'Reward not found' });

    const ticketOption = reward.ticketOptions?.find((item) => item._id === ticketOptionId) || null;
    const cost = ticketOption?.cost || reward.cost;
    const meta = buildPaymentMeta({ reward, ticketOptionId });

    const user = db.users.find((u) => u._id === req.user.id);
    if (!user) return res.status(401).json({ msg: 'User not found' });
    if (user.balance < cost) return res.status(400).json({ msg: 'Not enough points' });

    let newBalance = user.balance;
    await withDb(async (innerDb) => {
      const innerUser = innerDb.users.find((u) => u._id === req.user.id);
      if (!innerUser) return;
      innerUser.balance -= cost;
      innerUser.payments = innerUser.payments || [];
      innerUser.payments.unshift({
        ...meta,
        type: 'points',
        rewardId: reward._id,
        rewardName: reward.name,
        ticketOptionId: ticketOptionId || null,
        ticketOptionName: ticketOption?.name || null,
        amountPoints: cost,
        amountRub: ticketOption?.priceRub || reward.priceRub || null,
        status: 'paid',
        createdAt: new Date().toISOString()
      });
      newBalance = innerUser.balance;
    });

    res.json({
      success: true,
      newBalance,
      promoCode: meta.promoCode,
      ticketCode: meta.ticketCode,
      ticketOption,
      reward: {
        _id: reward._id,
        name: reward.name
      }
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/pay', auth, async (req, res) => {
  const { rewardId, ticketOptionId, email, cardNumber, cardholder } = req.body;

  try {
    const db = await getDb();
    const reward = getRewardCatalog(db).find((item) => item._id === rewardId);
    if (!reward) return res.status(404).json({ msg: 'Reward not found' });

    const ticketOption = reward.ticketOptions?.find((item) => item._id === ticketOptionId) || null;
    const amountRub = Number(ticketOption?.priceRub || reward.priceRub || 0);
    if (!amountRub) {
      return res.status(400).json({ msg: 'Payment is not available for this item' });
    }

    const normalizedCardNumber = String(cardNumber || '').replace(/\s+/g, '');
    if (!/^\d{16}$/.test(normalizedCardNumber)) {
      return res.status(400).json({ msg: 'Card number must contain 16 digits' });
    }

    if (!String(cardholder || '').trim()) {
      return res.status(400).json({ msg: 'Cardholder name is required' });
    }

    if (!String(email || '').trim()) {
      return res.status(400).json({ msg: 'E-mail is required for payment receipt' });
    }

    const user = db.users.find((u) => u._id === req.user.id);
    if (!user) return res.status(401).json({ msg: 'User not found' });

    const meta = buildPaymentMeta({ reward, ticketOptionId });

    await withDb(async (innerDb) => {
      const innerUser = innerDb.users.find((u) => u._id === req.user.id);
      if (!innerUser) return;
      innerUser.payments = innerUser.payments || [];
      innerUser.payments.unshift({
        ...meta,
        type: 'card',
        rewardId: reward._id,
        rewardName: reward.name,
        ticketOptionId: ticketOptionId || null,
        ticketOptionName: ticketOption?.name || null,
        amountRub,
        status: 'paid',
        email: String(email).trim(),
        cardLast4: normalizedCardNumber.slice(-4),
        createdAt: new Date().toISOString()
      });
    });

    res.json({
      success: true,
      orderId: meta.orderId,
      paymentId: meta.paymentId,
      promoCode: meta.promoCode,
      ticketCode: meta.ticketCode,
      amountRub,
      reward: {
        _id: reward._id,
        name: reward.name
      },
      ticketOption
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
