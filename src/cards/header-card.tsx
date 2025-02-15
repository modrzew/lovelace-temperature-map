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

export const HeaderCard = () => {
  const currentTime = useCurrentTime();

  return (
    <div className="p-4">
      <div className="text-3xl" style={{ fontFeatureSettings: '"ss01" on' }}>{timeFormatter.format(currentTime)}</div>
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
