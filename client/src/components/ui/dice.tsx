import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface DiceProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  value?: 1 | 2 | 3 | 4 | 5 | 6;
  color?: "primary" | "secondary" | "accent" | "white";
  animated?: boolean;
}

export function Dice({ 
  size = "md", 
  value = 5, 
  color = "primary",
  animated = false,
  className,
  ...props 
}: DiceProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };
  
  const colorClasses = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
    white: "text-white",
  };
  
  const dotClasses = "absolute rounded-full bg-current";
  const dotSizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
  };
  
  // Position classes for each dot based on dice value
  const dotPositions = {
    1: [{ position: "center" }],
    2: [{ position: "top-left" }, { position: "bottom-right" }],
    3: [{ position: "top-left" }, { position: "center" }, { position: "bottom-right" }],
    4: [
      { position: "top-left" },
      { position: "top-right" },
      { position: "bottom-left" },
      { position: "bottom-right" },
    ],
    5: [
      { position: "top-left" },
      { position: "top-right" },
      { position: "center" },
      { position: "bottom-left" },
      { position: "bottom-right" },
    ],
    6: [
      { position: "top-left" },
      { position: "top-right" },
      { position: "middle-left" },
      { position: "middle-right" },
      { position: "bottom-left" },
      { position: "bottom-right" },
    ],
  };
  
  const getPositionClass = (position: string) => {
    switch (position) {
      case "top-left":
        return "top-[20%] left-[20%]";
      case "top-right":
        return "top-[20%] right-[20%]";
      case "middle-left":
        return "top-[50%] left-[20%] -translate-y-1/2";
      case "middle-right":
        return "top-[50%] right-[20%] -translate-y-1/2";
      case "bottom-left":
        return "bottom-[20%] left-[20%]";
      case "bottom-right":
        return "bottom-[20%] right-[20%]";
      case "center":
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
      default:
        return "";
    }
  };
  
  return (
    <div 
      className={cn(
        "relative rounded-lg bg-white shadow-md", 
        sizeClasses[size],
        colorClasses[color],
        animated && "dice-animation",
        className
      )}
      {...props}
    >
      {dotPositions[value].map((dot, index) => (
        <div
          key={index}
          className={cn(
            dotClasses,
            dotSizeClasses[size],
            getPositionClass(dot.position)
          )}
        />
      ))}
    </div>
  );
}
