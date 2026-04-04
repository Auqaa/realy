import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import QRScanner from '../QRScanner';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { addScanToQueue, getScanQueue, removeScanFromQueue } from '../../utils/offlineStorage';
import { decodeQrFromImageFile, QrPhotoDecodeError } from '../../utils/qrPhotoDecode';

jest.mock('react-qr-reader', () => ({
  QrReader: () => <div data-testid="qr-reader" />
}));

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../utils/offlineStorage', () => ({
  addScanToQueue: jest.fn(),
  getScanQueue: jest.fn(),
  removeScanFromQueue: jest.fn()
}));

jest.mock('../../utils/qrPhotoDecode', () => ({
  decodeQrFromImageFile: jest.fn(),
  QrPhotoDecodeError: class QrPhotoDecodeError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'QrPhotoDecodeError';
      this.code = code;
    }
  }
}));

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('QRScanner', () => {
  let container;
  let root;
  let setUser;
  let onScanSuccess;

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    setUser = jest.fn();
    onScanSuccess = jest.fn();

    useAuth.mockReturnValue({ setUser });
    getScanQueue.mockResolvedValue([]);
    removeScanFromQueue.mockResolvedValue();
    addScanToQueue.mockResolvedValue();
    api.get.mockReset();
    api.post.mockReset();
    decodeQrFromImageFile.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true
    });

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.clearAllMocks();
  });

  const renderScanner = async () => {
    await act(async () => {
      root.render(<QRScanner onScanSuccess={onScanSuccess} />);
    });
    await flushPromises();
  };

  const uploadPhoto = async (file = new File(['qr'], 'qr.png', { type: 'image/png' })) => {
    const input = container.querySelector('input[type="file"]');
    await act(async () => {
      Simulate.change(input, { target: { files: [file], value: 'C:\\fakepath\\qr.png' } });
    });
    await flushPromises();
  };

  it('submits decoded qr value from uploaded photo', async () => {
    decodeQrFromImageFile.mockResolvedValue('rq_museum_kremlin_01');
    api.post.mockResolvedValue({ data: { reward: 25, point: { _id: 'point-1' } } });
    api.get.mockResolvedValue({ data: { _id: 'user-1' } });

    await renderScanner();
    await uploadPhoto();

    expect(decodeQrFromImageFile).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/scan', { qrValue: 'rq_museum_kremlin_01' });
    expect(setUser).toHaveBeenCalledWith({ _id: 'user-1' });
    expect(onScanSuccess).toHaveBeenCalledWith({ _id: 'point-1' });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows a focused message when qr is not found and allows retry', async () => {
    decodeQrFromImageFile
      .mockRejectedValueOnce(new QrPhotoDecodeError('qr-not-found', 'not found'))
      .mockResolvedValueOnce('rq_retry_ok');

    api.post.mockResolvedValue({ data: { reward: 10, point: { _id: 'point-2' } } });
    api.get.mockResolvedValue({ data: { _id: 'user-1' } });

    await renderScanner();
    await uploadPhoto();

    expect(toast.error).toHaveBeenCalledWith('Не удалось найти QR на фото. Попробуйте сделать снимок ближе и без бликов.');
    expect(container.textContent).toContain('Открыть камеру телефона');

    await uploadPhoto(new File(['retry'], 'retry.png', { type: 'image/png' }));

    expect(decodeQrFromImageFile).toHaveBeenCalledTimes(2);
    expect(api.post).toHaveBeenCalledWith('/scan', { qrValue: 'rq_retry_ok' });
  });

  it('shows processing message for image processing failures', async () => {
    decodeQrFromImageFile.mockRejectedValue(new QrPhotoDecodeError('image-processing-failed', 'broken image'));

    await renderScanner();
    await uploadPhoto();

    expect(toast.error).toHaveBeenCalledWith('Не удалось обработать фото. Попробуйте снять QR ещё раз или выбрать более чёткий снимок.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('surfaces backend submit errors after successful decode', async () => {
    decodeQrFromImageFile.mockResolvedValue('rq_backend_fail');
    api.post.mockRejectedValue({ response: { data: { msg: 'Invalid QR code' } } });

    await renderScanner();
    await uploadPhoto();

    expect(toast.error).toHaveBeenCalledWith('Invalid QR code');
  });
});
