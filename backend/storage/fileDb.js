const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'db.json');
const TEMPLATE_PATH = path.join(DB_DIR, 'db.template.json');

const makeId = () => crypto.randomUUID();

const seedData = () => {
  if (fs.existsSync(TEMPLATE_PATH)) {
    return JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf-8'));
  }

  const points = [
    {
      _id: makeId(),
      name: 'Рязанский кремль',
      description: 'Древнейшая часть Рязани, архитектурный ансамбль. Основан в XI веке.',
      lat: 54.6353,
      lng: 39.7485,
      qrCodeValue: 'ryazan_kremlin_01',
      reward: 20,
      order: 1,
      facts: [
        { question: 'Когда построен кремль?', answer: 'Первые укрепления появились в XI веке.' },
        { question: 'Что посмотреть?', answer: 'Успенский собор, Дворец Олега, колокольню.' }
      ]
    },
    {
      _id: makeId(),
      name: 'Соборная улица',
      description: 'Главная пешеходная улица с магазинами и кафе. Здесь всегда оживлённо.',
      lat: 54.6302,
      lng: 39.7478,
      qrCodeValue: 'sobornaya_ul_02',
      reward: 10,
      order: 2,
      facts: [
        { question: 'Чем знаменита улица?', answer: 'Здесь расположены старинные купеческие дома и памятник Евпатию Коловрату.' }
      ]
    },
    {
      _id: makeId(),
      name: 'Музей истории молодёжного движения',
      description: 'Интерактивный музей о жизни молодёжи в разные эпохи.',
      lat: 54.6289,
      lng: 39.7450,
      qrCodeValue: 'museum_youth_03',
      reward: 15,
      order: 3,
      facts: [
        { question: 'Какие экспонаты?', answer: 'Предметы быта, документы, интерактивные зоны.' }
      ]
    },
    {
      _id: makeId(),
      name: 'Памятник Сергею Есенину',
      description: 'Памятник поэту на улице Есенина. Рязанская земля – родина Есенина.',
      lat: 54.6255,
      lng: 39.7442,
      qrCodeValue: 'esenin_statue_04',
      reward: 15,
      order: 4,
      facts: [
        { question: 'Кто автор памятника?', answer: 'Скульптор А. Кибальников, установлен в 1975 году.' }
      ]
    },
    {
      _id: makeId(),
      name: 'Парк имени Гагарина',
      description: 'Большой парк для прогулок, аттракционы, пруд.',
      lat: 54.62,
      lng: 39.734,
      qrCodeValue: 'gagarin_park_05',
      reward: 10,
      order: 5,
      facts: [
        { question: 'Есть ли лодочная станция?', answer: 'Да, летом можно взять лодку напрокат.' }
      ]
    }
  ];

  const routeId = makeId();
  const pointsWithRouteId = points.map((p) => ({ ...p, routeId }));

  const totalReward = pointsWithRouteId.reduce((sum, p) => sum + p.reward, 0);

  const routes = [
    {
      _id: routeId,
      name: 'Центральный маршрут',
      description: 'Прогулка по историческому центру Рязани',
      points: pointsWithRouteId.map((p) => p._id),
      totalReward,
      image: '',
      city: 'Рязань'
    }
  ];

  const rewards = [
    {
      _id: makeId(),
      name: 'Скидка 10% в кафе "Рязанские узоры"',
      description: 'Предъявите промокод при заказе',
      cost: 50,
      promoCode: 'RYAZAN10',
      partnerName: 'Кафе "Рязанские узоры"',
      image: ''
    },
    {
      _id: makeId(),
      name: 'Сувенирный магнит "Рязань"',
      description: 'Получите в сувенирной лавке Кремля',
      cost: 30,
      promoCode: 'MAGNET_KR',
      partnerName: 'Сувенирная лавка',
      image: ''
    }
  ];

  return {
    users: [],
    routes,
    points: pointsWithRouteId,
    rewards,
    scans: []
  };
};

let dbCache = null;

const ensureDb = () => {
  if (dbCache) return dbCache;

  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const initial = seedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    dbCache = initial;
    return dbCache;
  }

  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  dbCache = JSON.parse(raw || '{}');

  // Если файл пустой/битый — пересоздадим.
  if (!dbCache.points || !dbCache.routes || !dbCache.rewards) {
    const initial = seedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    dbCache = initial;
  }

  return dbCache;
};

const persist = async () => {
  const db = ensureDb();
  await fs.promises.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
};

const getDb = async () => ensureDb();

const withDb = async (fn) => {
  const db = ensureDb();
  const res = await fn(db);
  await persist();
  return res;
};

module.exports = {
  getDb,
  withDb,
  DB_PATH
};

