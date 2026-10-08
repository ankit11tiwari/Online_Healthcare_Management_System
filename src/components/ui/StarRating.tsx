import { Star } from 'lucide-react';

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
};

export function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={`${onChange ? 'cursor-pointer' : 'cursor-default'} transition-transform ${
            onChange ? 'hover:scale-110' : ''
          }`}
        >
          <Star
            className={`${sizes[size]} ${
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
