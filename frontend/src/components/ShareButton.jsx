import React from 'react';
import toast from 'react-hot-toast';

const ShareButton = ({ routeName, pointsCount }) => {
  const share = async () => {
    const text = `Я прошёл маршрут "${routeName}" в приложении Рязанский квест! Открыл ${pointsCount} достопримечательностей и заработал баллы. Присоединяйся!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Моё достижение',
          text: text,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Текст скопирован в буфер обмена');
    }
  };

  return (
    <button onClick={share} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm">
      Поделиться
    </button>
  );
};

export default ShareButton;
