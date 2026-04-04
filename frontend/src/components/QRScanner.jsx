import React, { useEffect, useMemo, useState } from 'react';
import { QrReader } from 'react-qr-reader';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { addScanToQueue, getScanQueue, removeScanFromQueue } from '../utils/offlineStorage';
import { decodeQrFromImageFile, QrPhotoDecodeError } from '../utils/qrPhotoDecode';

const IGNORABLE_SCAN_ERRORS = ['notfoundexception', 'checksumexception', 'formatexception'];

const getPhotoDecodeMessage = (error) => {
  if (error instanceof QrPhotoDecodeError) {
    if (error.code === 'qr-not-found') {
      return 'Не удалось найти QR на фото. Попробуйте сделать снимок ближе и без бликов.';
    }

    if (error.code === 'image-read-failed' || error.code === 'image-load-failed' || error.code === 'image-processing-failed') {
      return 'Не удалось обработать фото. Попробуйте снять QR ещё раз или выбрать более чёткий снимок.';
    }

    if (error.code === 'decode-failed') {
      return 'Не удалось распознать QR на этом фото. Попробуйте повторить снимок.';
    }
  }

  return 'Не удалось распознать QR на фото. Попробуйте сделать снимок ближе.';
};

const QRScanner = ({ onScanSuccess }) => {
  const [scanning, setScanning] = useState(true);
  const [cameraMode, setCameraMode] = useState('environment');
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [processingUpload, setProcessingUpload] = useState(false);
  const { setUser } = useAuth();
  const videoId = useMemo(() => `qr-video-${cameraMode}`, [cameraMode]);
  const canUseLiveCamera = typeof window !== 'undefined' ? window.isSecureContext : false;

  const syncQueue = async () => {
    const queue = await getScanQueue();
    for (const item of queue) {
      try {
        const res = await api.post('/scan', { qrValue: item.qrValue });
        await removeScanFromQueue(item.id);
        toast.success(`Синхронизировано: +${res.data.reward} баллов`);
        const userRes = await api.get('/users/me');
        setUser(userRes.data);
      } catch (err) {
        console.error('Sync failed', err);
      }
    }
  };

  const submitQrValue = async (qrValue) => {
    const value = String(qrValue || '').trim();
    if (!value) return;

    setScanning(false);
    try {
      if (navigator.onLine) {
        const res = await api.post('/scan', { qrValue: value });
        toast.success(`Начислено: ${res.data.reward}`);
        const userRes = await api.get('/users/me');
        setUser(userRes.data);
        onScanSuccess?.(res.data.point);
      } else {
        await addScanToQueue(value);
        toast.success('Код сохранён офлайн. Синхронизация пройдёт позже');
        onScanSuccess?.({ name: 'Сохранено офлайн' });
      }
      setManualCode('');
      setCameraError('');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось обработать код');
    } finally {
      setScanning(true);
    }
  };

  useEffect(() => {
    const video = document.getElementById(videoId);
    if (!video) return undefined;

    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('autoplay', 'true');
    video.muted = true;

    const ensurePlayback = () => {
      if (typeof video.play === 'function') {
        video.play().catch(() => {});
      }
    };

    const onLoadedMetadata = () => ensurePlayback();
    const onCanPlay = () => ensurePlayback();

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    ensurePlayback();

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [videoId]);

  const handleResult = (result, error) => {
    if (result) {
      const value = typeof result.getText === 'function' ? result.getText() : result.text;
      submitQrValue(value);
      return;
    }

    if (!error) return;

    const errorName = String(error.name || '').toLowerCase();
    if (IGNORABLE_SCAN_ERRORS.includes(errorName)) {
      return;
    }

    const message = String(error.message || error).toLowerCase();
    if (message.includes('permission') || message.includes('denied')) {
      setCameraError('Нужен доступ к камере. Разрешите его в браузере и откройте экран ещё раз.');
    } else if (message.includes('secure context')) {
      setCameraError('Для прямого видеосканирования откройте сайт как приложение или используйте кнопку камеры ниже.');
    } else if (message.includes('notallowederror') || message.includes('notreadableerror')) {
      setCameraError('Камера занята или недоступна. Закройте другие приложения с камерой и попробуйте снова.');
    } else if (message.includes('constraint') || message.includes('unable to start')) {
      setCameraError('Не удалось запустить выбранную камеру. Попробуйте переключить её.');
    } else {
      setCameraError('Не удалось запустить видеосканирование. Можно использовать камеру телефона через фото ниже.');
    }
  };

  const switchCamera = () => {
    setScanning(false);
    setCameraError('');
    setCameraMode((current) => (current === 'environment' ? 'user' : 'environment'));
    window.setTimeout(() => setScanning(true), 80);
  };

  const handleCapturedImage = async (event) => {
    const [file] = Array.from(event.target.files || []);
    event.target.value = '';
    if (!file) return;

    setProcessingUpload(true);
    setCameraError('');

    try {
      const value = await decodeQrFromImageFile(file);
      if (!value) {
        throw new QrPhotoDecodeError('qr-not-found', 'QR code was not found on selected photo.');
      }
      await submitQrValue(value);
    } catch (error) {
      console.error(error);
      toast.error(getPhotoDecodeMessage(error));
    } finally {
      setProcessingUpload(false);
    }
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    await submitQrValue(manualCode);
  };

  useEffect(() => {
    window.addEventListener('online', syncQueue);
    return () => window.removeEventListener('online', syncQueue);
  }, []);

  return (
    <div className="mx-auto w-full max-w-md">
      {canUseLiveCamera && scanning && (
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-inner">
          <QrReader
            key={cameraMode}
            onResult={handleResult}
            constraints={{ facingMode: cameraMode }}
            containerStyle={{ width: '100%' }}
            videoContainerStyle={{ width: '100%', paddingTop: '125%' }}
            videoStyle={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#020617' }}
            scanDelay={300}
            videoId={videoId}
          />
        </div>
      )}

      {!canUseLiveCamera && (
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          На телефоне надёжнее всего открыть камеру через кнопку ниже и считать QR по фото. Этот режим работает стабильнее,
          чем видеопоток в обычной вкладке браузера.
        </div>
      )}

      {cameraError && <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">{cameraError}</div>}

      {canUseLiveCamera && (
        <button
          type="button"
          onClick={switchCamera}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Переключить камеру
        </button>
      )}

      <label className="mt-3 flex w-full cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black">
        {processingUpload ? 'Обрабатываем фото...' : 'Открыть камеру телефона'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCapturedImage}
          disabled={processingUpload}
        />
      </label>

      <form onSubmit={handleManualSubmit} className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-medium text-slate-900">Ввести код вручную</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="Например, rq_museum_kremlin_01"
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black"
          >
            Проверить
          </button>
        </div>
      </form>
    </div>
  );
};

export default QRScanner;
