import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './ui/utils';
import {
  getProjectPriorityFieldClasses,
  getProjectPriorityOptionClasses,
  type ProjectPriority,
} from '../lib/projects';

const PROJECT_PRIORITIES: ProjectPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

interface ProjectPrioritySelectProps {
  value: ProjectPriority;
  onChange: (value: ProjectPriority) => void;
  disabled?: boolean;
  className?: string;
}

export function ProjectPrioritySelect({
  value,
  onChange,
  disabled = false,
  className,
}: ProjectPrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md px-3 text-sm font-medium shadow-sm outline-none transition-all duration-200 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
          getProjectPriorityFieldClasses(value),
          className,
        )}
      >
        <span>{value}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 opacity-70 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          )}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-border-subtle bg-surface p-2 shadow-xl">
          <div className="space-y-2" role="listbox" aria-label="Project priority">
            {PROJECT_PRIORITIES.map((priority) => {
              const isSelected = priority === value;

              return (
                <button
                  key={priority}
                  type="button"
                  onClick={() => {
                    onChange(priority);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200',
                    getProjectPriorityOptionClasses(priority),
                    isSelected ? 'ring-2 ring-gray-900/10' : '',
                  )}
                >
                  <span>{priority}</span>
                  <Check className={cn('h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
