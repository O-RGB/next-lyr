import { useKaraokeStore } from "@/stores/karaoke-store";

interface TimerRangeProps {
  duration: number;
  onSeek: (value: number) => void;
  filename?: string;
}

export const TimerRange: React.FC<TimerRangeProps> = ({
  duration,
  onSeek,
  filename,
}) => {
  const currentTime = useKaraokeStore((state) => state.currentTime);

  return (
    <input
      type="range"
      min="0"
      max={duration || 100}
      value={currentTime}
      onChange={(e) => onSeek(Number(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
      disabled={!filename}
    />
  );
};
