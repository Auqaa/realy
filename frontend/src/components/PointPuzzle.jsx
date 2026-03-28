import React, { useEffect, useMemo, useState } from 'react';

const POLYGON_LAYOUTS = [
  'polygon(0 0, 48% 0, 38% 30%, 0 34%)',
  'polygon(48% 0, 100% 0, 100% 40%, 62% 28%, 38% 30%)',
  'polygon(0 34%, 38% 30%, 46% 62%, 0 72%)',
  'polygon(38% 30%, 62% 28%, 100% 40%, 100% 100%, 52% 100%, 46% 62%)',
  'polygon(0 72%, 46% 62%, 52% 100%, 0 100%)'
];

const shuffle = (items) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const PointPuzzle = ({ imageUrl, title, pieceCount = 5 }) => {
  const pieces = useMemo(
    () =>
      POLYGON_LAYOUTS.slice(0, Math.max(1, Math.min(pieceCount, 5))).map((clipPath, index) => ({
        id: `piece-${index + 1}`,
        clipPath,
        label: `Фрагмент ${index + 1}`
      })),
    [pieceCount]
  );

  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [placedPieceIds, setPlacedPieceIds] = useState([]);
  const [trayOrder, setTrayOrder] = useState(() => shuffle(pieces.map((piece) => piece.id)));
  const [hint, setHint] = useState('Выберите фрагмент снизу и коснитесь подходящего контура.');

  useEffect(() => {
    setSelectedPieceId(null);
    setPlacedPieceIds([]);
    setTrayOrder(shuffle(pieces.map((piece) => piece.id)));
    setHint('Выберите фрагмент снизу и коснитесь подходящего контура.');
  }, [pieces, title]);

  const solved = placedPieceIds.length === pieces.length;

  const handleSlotClick = (pieceId) => {
    if (!selectedPieceId) {
      setHint('Сначала выберите фрагмент внизу.');
      return;
    }

    if (selectedPieceId !== pieceId) {
      setHint('Этот фрагмент сюда не подходит. Попробуйте другой контур.');
      return;
    }

    setPlacedPieceIds((current) => [...current, pieceId]);
    setSelectedPieceId(null);
    setHint('Отлично, фрагмент встал на место.');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Полигональный пазл</h4>
          <p className="text-xs text-slate-500">Соберите фото места из {pieces.length} фрагментов.</p>
        </div>
        {solved && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Собрано</span>}
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            className={`h-full w-full object-cover transition duration-300 ${solved ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-25'}`}
          />
        )}

        <div className="absolute inset-0">
          {pieces.map((piece) => {
            const isPlaced = placedPieceIds.includes(piece.id);
            const isSelected = selectedPieceId === piece.id;

            return (
              <React.Fragment key={piece.id}>
                <button
                  type="button"
                  aria-label={piece.label}
                  onClick={() => handleSlotClick(piece.id)}
                  className={`absolute inset-0 transition ${isPlaced ? 'pointer-events-none opacity-0' : 'opacity-100'} ${isSelected ? 'ring-2 ring-sky-400' : ''}`}
                  style={{
                    clipPath: piece.clipPath,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1.5px dashed rgba(255,255,255,0.9)'
                  }}
                />
                {isPlaced && (
                  <div
                    className="absolute inset-0"
                    style={{
                      clipPath: piece.clipPath,
                      backgroundImage: `url(${imageUrl})`,
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.75)'
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{solved ? 'Пазл собран. Можно открыть другие материалы точки.' : hint}</p>

      {!solved && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {trayOrder
            .filter((pieceId) => !placedPieceIds.includes(pieceId))
            .map((pieceId) => {
              const piece = pieces.find((entry) => entry.id === pieceId);
              const isSelected = selectedPieceId === pieceId;

              return (
                <button
                  key={pieceId}
                  type="button"
                  onClick={() => setSelectedPieceId(pieceId)}
                  className={`rounded-2xl border px-3 py-3 text-left text-xs transition ${
                    isSelected ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <span
                    className="mb-2 block h-10 w-full bg-slate-300"
                    style={{ clipPath: piece.clipPath }}
                  />
                  {piece.label}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default PointPuzzle;
