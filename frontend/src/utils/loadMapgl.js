let mapglLoader = null;

const MAPGL_SCRIPT_URL = 'https://mapgl.2gis.com/api/js/v1';

const loadMapgl = () => {
  if (window.mapgl) {
    return Promise.resolve(window.mapgl);
  }

  if (mapglLoader) {
    return mapglLoader;
  }

  mapglLoader = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${MAPGL_SCRIPT_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.mapgl), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load map library')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MAPGL_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.mapgl);
    script.onerror = () => reject(new Error('Failed to load map library'));
    document.head.appendChild(script);
  });

  return mapglLoader;
};

export default loadMapgl;
