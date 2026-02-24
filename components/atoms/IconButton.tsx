import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  className = '',
  active = false,
}) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-xl transition ${
      active
        ? 'bg-blue-600 text-white shadow-lg'
        : 'text-gray-400 hover:text-white hover:bg-white/10'
    } ${className}`}
  >
    <Icon className="w-6 h-6" />
  </button>
);
