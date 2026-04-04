import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GuideWorkspace from '../GuideWorkspace';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn()
  }
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn()
  }
}));

jest.mock('../../components/YandexMap', () => () => <div data-testid="guide-map-placeholder" />);

const GUIDE_PACKS = [
  {
    _id: 'pack-1',
    name: 'Исторический центр',
    description: 'Короткий сценарий для первого знакомства',
    promise: 'Провести группу по главным точкам без спешки',
    practicalNotesTeaser: 'Лучше стартовать до обеда.',
    badges: ['90 минут'],
    featured: true,
    defaultVariantRouteId: 'route-primary',
    variants: [
      { routeId: 'route-primary', role: 'primary', reason: 'Основной маршрут', name: 'Основной маршрут', pointCount: 3, distanceKm: 2.5, durationMinutes: 60, fallbackStopCount: 1 },
      { routeId: 'route-alt', role: 'alternative', reason: 'Плохая погода', name: 'Альтернатива', pointCount: 2, distanceKm: 1.8, durationMinutes: 45, fallbackStopCount: 0 }
    ]
  }
];

const GUIDE_PACK_DETAIL = {
  _id: 'pack-1',
  name: 'Исторический центр',
  description: 'Короткий сценарий для первого знакомства',
  promise: 'Провести группу по главным точкам без спешки',
  practicalNotes: 'Лучше стартовать до обеда и держать группу компактно.',
  badges: ['90 минут'],
  featured: true,
  defaultVariantRouteId: 'route-primary',
  variants: [
    {
      routeId: 'route-primary',
      role: 'primary',
      reason: 'Основной маршрут',
      name: 'Основной маршрут',
      pointCount: 3,
      distanceKm: 2.5,
      durationMinutes: 60,
      guideReadyStopCount: 2,
      fallbackStopCount: 1,
      previewCenter: { lat: 54.63, lng: 39.74 },
      stops: [
        {
          _id: 'stop-1',
          order: 1,
          name: 'Кремль',
          address: 'Пл. Кремль',
          waypointType: 'regular',
          materialSource: 'guideText',
          hasGuideGap: false,
          previewText: 'Готовый сценарий',
          materialBlocks: [{ type: 'guideText', text: 'Подготовленный текст для экскурсовода.' }]
        },
        {
          _id: 'stop-2',
          order: 2,
          name: 'Собор',
          address: 'Рядом с кремлём',
          waypointType: 'qr',
          materialSource: 'facts',
          hasGuideGap: true,
          previewText: 'Fallback facts',
          materialBlocks: [{ type: 'facts', items: [{ question: 'Факт', answer: 'Использовать как fallback.' }] }]
        }
      ]
    },
    {
      routeId: 'route-alt',
      role: 'alternative',
      reason: 'Плохая погода',
      name: 'Альтернатива',
      pointCount: 2,
      distanceKm: 1.8,
      durationMinutes: 45,
      guideReadyStopCount: 2,
      fallbackStopCount: 0,
      previewCenter: { lat: 54.62, lng: 39.73 },
      stops: [
        {
          _id: 'stop-3',
          order: 1,
          name: 'Музей',
          address: 'Улица Почтовая',
          waypointType: 'regular',
          materialSource: 'guideText',
          hasGuideGap: false,
          previewText: 'Альтернативный сценарий',
          materialBlocks: [{ type: 'guideText', text: 'Текст для альтернативного варианта.' }]
        }
      ]
    }
  ]
};

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('GuideWorkspace', () => {
  let container;
  let root;

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.scrollTo = jest.fn();

    api.get.mockImplementation((url) => {
      if (url === '/route-packs/guide') return Promise.resolve({ data: GUIDE_PACKS });
      if (url === '/route-packs/guide/pack-1') return Promise.resolve({ data: GUIDE_PACK_DETAIL });
      if (url === '/config') return Promise.resolve({ data: { mapKey: '', center: { lat: 54.6, lng: 39.7 } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.clearAllMocks();
  });

  const renderPage = async (initialEntry = '/guide') => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/guide" element={<GuideWorkspace />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await flushPromises();
    await flushPromises();
  };

  it('loads guide packs and opens the selected briefing', async () => {
    await renderPage('/guide');

    const packCard = container.querySelector('[data-testid="guide-pack-card-pack-1"]');
    expect(packCard).not.toBeNull();

    await act(async () => {
      Simulate.click(packCard);
    });

    await flushPromises();
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/route-packs/guide/pack-1');
    expect(container.textContent).toContain('Исторический центр');
    expect(container.textContent).toContain('Лучше стартовать до обеда');
    expect(container.querySelector('[data-testid="guide-stop-stop-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="guide-stop-stop-2"]')).not.toBeNull();
  });

  it('switches variant inside the same pack context', async () => {
    await renderPage('/guide?packId=pack-1&variantId=route-primary');

    await flushPromises();
    await flushPromises();

    const alternativeButton = container.querySelector('[data-testid="guide-variant-route-alt"]');
    expect(alternativeButton).not.toBeNull();

    await act(async () => {
      Simulate.click(alternativeButton);
    });

    await flushPromises();

    expect(container.textContent).toContain('Плохая погода');
  });

  it('renders access denied state without API calls', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/guide']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <GuideWorkspace accessDenied />
        </MemoryRouter>
      );
    });

    expect(container.querySelector('[data-testid="guide-access-denied"]')).not.toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });
});
