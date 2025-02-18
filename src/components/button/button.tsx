import React from "react";

// Define available button colors
type ButtonColor =
  | "primary"
  | "secondary"
  | "danger"
  | "warning"
  | "transparent";

interface ButtonCommonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  color?: ButtonColor;
  isRounded?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const ButtonCommon: React.FC<ButtonCommonProps> = ({
  children,
  color = "primary",
  isRounded = false,
  icon,
  iconPosition = "left",
  ...props
}) => {
  // Color mapping object
  const colorClasses = {
    primary: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white",
    secondary:
      "bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white",
    danger: "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white",
    warning:
      "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-black",
    transparent:
      "bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-800 border border-gray-300",
  };

  // Determine button shape class
  const shapeClass = isRounded ? "rounded-full" : "rounded-lg";

  // Determine content based on icon and its position
  const renderContent = () => {
    if (!icon) return children;

    if (iconPosition === "left") {
      return (
        <span className="flex items-center justify-center gap-2">
          <span className="flex items-center">{icon}</span>
          {children}
        </span>
      );
    } else {
      return (
        <span className="flex items-center justify-center gap-2">
          {children}
          <span className="flex items-center">{icon}</span>
        </span>
      );
    }
  };

  return (
    <button
      {...props}
      className={`${
        props.className || ""
      } px-4 py-2 font-medium shadow-md transition-all ${
        colorClasses[color]
      } ${shapeClass}`}
    >
      {renderContent()}
    </button>
  );
};

export default ButtonCommon;
