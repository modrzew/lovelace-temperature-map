import { ReactCardProps } from '@/lib/create-react-card';
import { useEntityState, useEntityStateValue } from '@/lib/hooks/hass-hooks';
import { useShadowPortal } from '@/lib/hooks/use-shadow-portal';
import { cn } from '@/lib/utils';
import { useSignals } from '@preact/signals-react/runtime';
import { createPortal } from 'react-dom';

type DoorOpenCardProps = ReactCardProps<{
  entity: string;
}>;

export const DoorOpenCard = ({ hass, config, editMode }: DoorOpenCardProps) => {
  useSignals();
  const shadowPortal = useShadowPortal();
  const currentConfig = config.value;
  const entityState = useEntityState(hass, currentConfig.entity);
  const entityStateValue = useEntityStateValue(hass, currentConfig.entity);

  const getText = () => {
    switch (entityState.value.state) {
      case 'unlocked':
        return 'Front door is open';
      case 'unlocking':
        return 'Unlocking front door...';
      case 'locking':
        return 'Locking front door...';
      default:
        return 'Front door is closed';
    }
  };

  return (
    <>
      {editMode.value && (
        <div className="w-full h-full border border-dashed bg-gray-50 rounded-md p-4 flex flex-col items-center justify-center">
          <div className="text-lg font-medium text-gray-500">
            Door Open Card
          </div>
          <div className="text-sm text-gray-500">
            State: {entityStateValue.value}
          </div>
        </div>
      )}
      {shadowPortal &&
        createPortal(
          <div
            className={cn(
              'absolute inset-y-0 left-0 w-[20%] z-1000 flex flex-col justify-center pointer-events-none bg-linear-to-r from-amber-500/40 to-transparent to-60%',
              entityState.value.state === 'unlocked' ||
                entityState.value.state === 'unlocking' ||
                entityState.value.state === 'locking'
                ? 'animate-in slide-in-from-left duration-500 fill-mode-both  text-amber-900'
                : 'animate-out slide-out-to-left duration-500 delay-2000 fill-mode-both bg-linear-to-r from-green-500/40 to-transparent to-60% text-green-900',
            )}
          >
            <div className="text-xl font-bold max-w-[80px] px-3 font-stretch-105%">
              {getText()}
            </div>
          </div>,
          shadowPortal,
        )}
    </>
  );
};
