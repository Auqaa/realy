import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import PointPuzzle from './PointPuzzle';

const AIAssistant = ({ point, onClose }) => {
  const [facts, setFacts] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  useEffect(() => {
    let alive = true;
    setFacts(point.facts || []);

    if (String(point._id || '').startsWith('stop-')) {
      return () => {
        alive = false;
      };
    }

    const fetchFacts = async () => {
      try {
        const res = await api.get(`/points/${point._id}/ask`);
        if (alive) {
          setFacts(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchFacts();
    return () => {
      alive = false;
    };
  }, [point._id]);

  const displayFacts = useMemo(() => {
    const merged = [...facts];
    if (!merged.length && point.description) {
      merged.push({
        question: 'Краткая справка',
        answer: point.description
      });
    }
    return merged;
  }, [facts, point.description]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">НаРязань</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">{point.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{point.address || point.description}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50">
            Закрыть
          </button>
        </div>

        {point.image && (
          <div className="mb-4 overflow-hidden rounded-3xl">
            <img src={point.image} alt={point.name} className="h-56 w-full object-cover sm:h-72" />
          </div>
        )}

        {point.image && <PointPuzzle imageUrl={point.image} title={point.name} pieceCount={point.puzzlePieceCount || 5} />}

        <div className="mt-4 space-y-2">
          {displayFacts.map((fact, idx) => (
            <div key={`${point._id}-${idx}`} className="rounded-2xl border border-slate-200 p-3">
              <button
                className="w-full text-left font-medium text-slate-900"
                onClick={() => setSelectedQuestion(selectedQuestion === idx ? null : idx)}
              >
                {fact.question}
              </button>
              {selectedQuestion === idx && <p className="mt-2 text-sm leading-6 text-slate-600">{fact.answer}</p>}
            </div>
          ))}
          {!displayFacts.length && <div className="text-sm text-slate-500">Загрузка материалов гида...</div>}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
