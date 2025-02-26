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
        <div className="w-full h-full border border-dashed bg-muted rounded-md p-4 flex flex-col items-center justify-center">
          <div className="text-lg font-medium text-muted-foreground">
            Door Open Card
          </div>
          <div className="text-sm text-muted-foreground">
            State: {entityStateValue.value}
          </div>
        </div>
      )}
      {shadowPortal &&
        createPortal(
          <div
            className={cn(
              'absolute inset-y-0 left-0 w-[20%] z-1000 flex flex-col justify-center pointer-events-none ',
              entityState.value.state === 'unlocked' ||
                entityState.value.state === 'unlocking' ||
                entityState.value.state === 'locking'
                ? 'animate-in slide-in-from-left duration-500 ease-out fill-mode-both'
                : 'animate-out slide-out-to-left duration-500 delay-3000 ease-in fill-mode-both',
            )}
          >
            <div
              className={cn(
                'absolute inset-0 transition-all backdrop-blur-xs bg-linear-to-r from-warning/40 to-transparent to-60%',
                entityState.value.state === 'unlocked' ||
                  entityState.value.state === 'unlocking' ||
                  entityState.value.state === 'locking'
                  ? 'opacity-100'
                  : 'opacity-0',
              )}
              style={{
                mask: 'linear-gradient(to right, black, transparent 80%)',
              }}
            />
            <div
              className={cn(
                'absolute inset-0 transition-all backdrop-blur-xs bg-linear-to-r from-success/40 to-transparent to-60%',
                entityState.value.state === 'unlocked' ||
                  entityState.value.state === 'unlocking' ||
                  entityState.value.state === 'locking'
                  ? 'opacity-0'
                  : 'opacity-100',
              )}
              style={{
                mask: 'linear-gradient(to right, black, transparent 80%)',
              }}
            />
            <div
              className={cn(
                'relative z-10 text-xl font-semibold max-w-[80px] px-3 transition-all',
                entityState.value.state === 'unlocked' ||
                  entityState.value.state === 'unlocking' ||
                  entityState.value.state === 'locking'
                  ? 'text-warning'
                  : 'text-success',
              )}
            >
              {getText()}
            </div>
          </div>,
          shadowPortal,
        )}
    </>
  );
};
