import React from "react";

interface TagsProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  className?: string;
  tagsClassName?: string;
  hoverText?: string;
  disabledTooltip?: boolean;
}

const Tags: React.FC<TagsProps> = ({
  text,
  className,
  tagsClassName,
  hoverText,
  disabledTooltip,
  ...props
}) => {
  return (
    <div {...props} className={`${className} group`}>
      <span
        className={`${tagsClassName} bg-purple-600 rounded-sm text-white px-1 font-bold text-nowrap`}
      >
        {text}
      </span>
      {!disabledTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap z-10">
          {hoverText}
        </div>
      )}
    </div>
  );
};

export default Tags;
