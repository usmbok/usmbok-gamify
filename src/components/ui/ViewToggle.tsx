import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '../../hooks/useViewPreference';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
      <button
        onClick={() => onChange('card')}
        className={`p-1.5 rounded-md transition-colors ${
          mode === 'card'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Card view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded-md transition-colors ${
          mode === 'list'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
