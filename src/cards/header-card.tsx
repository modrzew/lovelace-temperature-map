import { ReactCardProps } from '@/lib/create-react-card';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const timeFormatter = new Intl.DateTimeFormat('en-AU', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('en-AU', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

export type HeaderCardProps = ReactCardProps<{
  color: 'light' | 'dark' | 'auto';
}>;

export const HeaderCard = ({ config }: HeaderCardProps) => {
  const currentConfig = config.value;
  const currentTime = useCurrentTime();

  return (
    <div
      className={cn(
        'p-4',
        currentConfig.color === 'light'
          ? 'text-white'
          : currentConfig.color === 'dark'
          ? 'text-black'
          : '',
      )}
    >
      <div className="text-3xl font-medium" style={{ fontFeatureSettings: '"ss01" on' }}>
        {timeFormatter.format(currentTime)}
      </div>
      <div className="text-xl">{dateFormatter.format(currentTime)}</div>
    </div>
  );
};

const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
      setTimeout(updateCurrentTime, 1000 - (Date.now() % 1000));
    };
    updateCurrentTime();
  }, []);

  return currentTime;
};
