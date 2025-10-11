import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface CheckIn {
  id: string;
  timestamp: string;
  mood_level_1_6: number;
  affect_tags: string[];
  note: string | null;
}

interface SparklineProps {
  data: CheckIn[];
}

export default function Sparkline({ data }: SparklineProps) {
  // Prepare data for the chart (reverse to show chronological order)
  const chartData = data
    .slice()
    .reverse()
    .map((checkIn, index) => ({
      index,
      mood: checkIn.mood_level_1_6,
      date: new Date(checkIn.timestamp).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
      }),
      timestamp: checkIn.timestamp,
      affects: checkIn.affect_tags,
      note: checkIn.note,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface border border-borderMutedLight rounded-lg p-3 shadow-soft">
          <p className="text-sm font-medium text-deepSage">
            Mood: {data.mood}/6
          </p>
          <p className="text-xs text-textSecondaryLight">
            {data.date}
          </p>
          {data.affects.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-textSecondaryLight mb-1">Feelings:</p>
              <div className="flex flex-wrap gap-1">
                {data.affects.slice(0, 3).map((affect: string) => (
                  <span
                    key={affect}
                    className="text-xs px-2 py-1 bg-teal/10 text-teal rounded-full"
                  >
                    {affect}
                  </span>
                ))}
                {data.affects.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-sage/10 text-sage rounded-full">
                    +{data.affects.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
          {data.note && (
            <p className="text-xs text-textSecondaryLight mt-2 italic">
              "{data.note}"
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-textSecondaryLight">
        <p className="text-sm">No mood data to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="mood"
              stroke="#2EC489"
              strokeWidth={2}
              dot={{ fill: '#2EC489', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#2EC489', stroke: '#ffffff', strokeWidth: 2 }}
            />
            <Tooltip content={<CustomTooltip />} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mood scale reference */}
      <div className="flex justify-between text-xs text-textSecondaryLight">
        <span>1 (Stormy)</span>
        <span>3 (Overcast)</span>
        <span>6 (Aurora)</span>
      </div>

      {/* Latest check-in summary */}
      {data.length > 0 && (
        <div className="bg-cosmic-gradient rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-deepSage">
                Latest: {data[0].mood_level_1_6}/6
              </p>
              <p className="text-xs text-textSecondaryLight">
                {new Date(data[0].timestamp).toLocaleDateString('en-CA', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            
            {data[0].affect_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {data[0].affect_tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-white/20 text-deepSage rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {data[0].affect_tags.length > 2 && (
                  <span className="text-xs px-2 py-1 bg-white/20 text-deepSage rounded-full">
                    +{data[0].affect_tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
