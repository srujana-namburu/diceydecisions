import { cn } from "@/lib/utils";
import { Dice } from "@/components/ui/dice";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  withText?: boolean;
}

export function Logo({ size = "md", className, withText = true }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  };
  
  const diceSize = {
    sm: "sm",
    md: "md",
    lg: "xl",
  };
  
  return (
    <div className={cn("flex items-center", className)}>
      <Dice 
        size={diceSize[size]} 
        color="primary"
        className="mr-2"
      />
      
      {withText && (
        <h1 className={cn(
          "font-heading font-bold text-primary", 
          sizeClasses[size]
        )}>
          DiceyDecisions
        </h1>
      )}
    </div>
  );
}
