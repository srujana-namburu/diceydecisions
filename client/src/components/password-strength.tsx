import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const [strength, setStrength] = useState(0);
  const [message, setMessage] = useState("");
  
  useEffect(() => {
    if (!password) {
      setStrength(0);
      setMessage("");
      return;
    }
    
    let strengthScore = 0;
    
    // Length check
    if (password.length >= 8) strengthScore += 1;
    
    // Character variety checks
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strengthScore += 1;
    if (password.match(/\d/)) strengthScore += 1;
    if (password.match(/[^a-zA-Z\d]/)) strengthScore += 1;
    
    setStrength(strengthScore);
    
    // Set message based on strength
    switch (strengthScore) {
      case 0:
        setMessage("Too weak");
        break;
      case 1:
        setMessage("Could be stronger");
        break;
      case 2:
        setMessage("Getting better");
        break;
      case 3:
        setMessage("Good password");
        break;
      case 4:
        setMessage("Great password!");
        break;
      default:
        setMessage("");
    }
  }, [password]);
  
  // Return empty if no password
  if (!password) return null;
  
  // Colors based on strength
  const getColorClass = () => {
    switch (strength) {
      case 0:
        return "bg-destructive";
      case 1:
        return "bg-orange-500";
      case 2:
        return "bg-yellow-500";
      case 3:
        return "bg-lime-500";
      case 4:
        return "bg-green-500";
      default:
        return "bg-neutral-300";
    }
  };
  
  // Width based on strength
  const getWidthClass = () => {
    switch (strength) {
      case 0:
        return "w-1/4";
      case 1:
        return "w-2/4";
      case 2:
        return "w-3/4";
      case 3:
        return "w-4/5";
      case 4:
        return "w-full";
      default:
        return "w-0";
    }
  };
  
  return (
    <div className="relative pt-1">
      <p className="text-sm text-neutral-700 mb-1">Password Strength</p>
      <div className="overflow-hidden h-2 text-xs flex rounded bg-neutral-200">
        <div 
          className={cn(
            "shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300",
            getColorClass(),
            getWidthClass()
          )}
        ></div>
      </div>
      <p className="text-xs text-neutral-600 mt-1">{message}</p>
    </div>
  );
}
