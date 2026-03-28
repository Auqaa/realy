import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await api.get('/users/leaderboard');
        setLeaders(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeaders();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border">
      <h3 className="text-lg font-bold mb-2">Лидерборд</h3>
      <ul className="divide-y">
        {leaders.map((user, idx) => (
          <li key={user._id} className="py-2 flex justify-between items-center">
            <span className="text-sm">
              {idx + 1}. {user.name}
            </span>
            <span className="font-semibold text-indigo-600">{user.balance} баллов</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;
