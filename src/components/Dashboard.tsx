// src/components/Dashboard.tsx
import { useEffect, useState } from 'react';
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
  Filler,
} from 'chart.js';
import { api } from '../lib/axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CheckIn {
  timestamp: string;
  mood_score: number;
  ai_reply?: string;
  user_message?: string;
}

export default function Dashboard() {
  const [data, setData] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get<CheckIn[]>('/history');
        if (!cancelled) setData(resp.data);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string };
        if (!cancelled) setError(err.response?.data?.error ?? err.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-4">
        <h2 className="text-xl font-bold text-primaryText mb-4">Your Mood Dashboard</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded w-1/3"></div>
          <div className="h-48 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-4">
        <h2 className="text-xl font-bold text-primaryText mb-4">Your Mood Dashboard</h2>
        <div role="alert" className="p-3 rounded bg-red-500/20 text-red-200 text-sm">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-4 text-center text-secondaryText">
        <h2 className="text-xl font-bold text-primaryText mb-2">Your Mood Dashboard</h2>
        <p>No check-ins yet. Start a conversation in Chat to see your mood trend here.</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => new Date(d.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Mood Score',
        data: data.map((d) => d.mood_score),
        fill: true,
        backgroundColor: 'rgba(255, 183, 178, 0.2)',
        borderColor: '#FFB7B2',
        pointBackgroundColor: '#FFB7B2',
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#fff' } },
      title: { display: true, text: 'Mood Trend', color: '#fff' },
    },
    scales: {
      y: { min: 0, max: 10, ticks: { stepSize: 1, color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
      x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
    },
  };

  const avg = (data.reduce((s, d) => s + d.mood_score, 0) / data.length).toFixed(1);
  const last = data[data.length - 1]?.mood_score ?? 0;

  return (
    <div className="glass-card p-4">
      <h2 className="text-xl font-bold text-primaryText mb-4">Your Mood Dashboard</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-white/5 text-center">
          <div className="text-2xl font-bold text-primaryText">{last}/10</div>
          <div className="text-xs text-secondaryText">Latest</div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 text-center">
          <div className="text-2xl font-bold text-primaryText">{avg}</div>
          <div className="text-xs text-secondaryText">Average</div>
        </div>
      </div>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
      <p className="text-xs text-secondaryText mt-2">{data.length} check-in{data.length === 1 ? '' : 's'}</p>
    </div>
  );
}
