// src/components/Dashboard.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface CheckIn {
  timestamp: string; // ISO string
  mood_score: number;
}

const Dashboard = () => {
  const [data, setData] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const resp = await axios.get('/api/history'); // backend filters by token
        setData(resp.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const chartData = {
    labels: data.map(item => new Date(item.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Mood Score',
        data: data.map(item => item.mood_score),
        fill: false,
        backgroundColor: '#FFB7B2', // Warm Peach
        borderColor: '#FFB7B2',
        tension: 0.2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Mood Trend' },
    },
    scales: {
      y: { min: 1, max: 10, ticks: { stepSize: 1 } },
    },
  };

  return (
    <div className="glass-card p-4">
      <h2 className="text-xl font-bold text-primaryText mb-4">Your Mood Dashboard</h2>
      {loading ? (
        <p className="text-secondaryText">Loading...</p>
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  );
};

export default Dashboard;
