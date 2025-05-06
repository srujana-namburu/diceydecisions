import { useState, useEffect } from "react";
import { Dice } from "@/components/ui/dice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TiebreakerMethod = "dice" | "spinner" | "coin";
export type TiebreakerOption = {
  id: number;
  text: string;
};

interface TiebreakerProps {
  options: TiebreakerOption[];
  onComplete: (winnerId: number) => void;
  className?: string;
}

export function Tiebreaker({ options, onComplete, className }: TiebreakerProps) {
  const [method, setMethod] = useState<TiebreakerMethod>("dice");
  const [isAnimating, setIsAnimating] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<TiebreakerOption | null>(null);
  const [diceValue, setDiceValue] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [coinValue, setCoinValue] = useState<"heads" | "tails">("heads");
  const [spinnerRotation, setSpinnerRotation] = useState(0);

  const startTiebreaker = () => {
    setIsAnimating(true);
    setCountdown(3);
  };

  // Countdown effect
  useEffect(() => {
    if (!isAnimating || countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAnimating, countdown]);

  // Animation effect
  useEffect(() => {
    if (!isAnimating || countdown > 0) return;

    // Different animation based on method
    let animationDuration = 0;
    
    if (method === "dice") {
      // Random dice roll
      animationDuration = 2000;
      
      const rollInterval = setInterval(() => {
        setDiceValue(Math.floor(Math.random() * 6 + 1) as 1 | 2 | 3 | 4 | 5 | 6);
      }, 150);
      
      setTimeout(() => {
        clearInterval(rollInterval);
        // Determine winner based on dice value
        const winningIndex = (diceValue - 1) % options.length;
        setWinner(options[winningIndex]);
        setTimeout(() => {
          onComplete(options[winningIndex].id);
        }, 1500);
      }, animationDuration);
    } 
    else if (method === "spinner") {
      // Spinner animation
      animationDuration = 3000;
      
      // Random number of rotations (5-10) plus a partial rotation to land on the winner
      const rotations = 5 + Math.random() * 5;
      const winningIndex = Math.floor(Math.random() * options.length);
      const segmentSize = 360 / options.length;
      const finalAngle = rotations * 360 + (winningIndex * segmentSize) + (segmentSize / 2);
      
      setSpinnerRotation(finalAngle);
      
      setTimeout(() => {
        setWinner(options[winningIndex]);
        setTimeout(() => {
          onComplete(options[winningIndex].id);
        }, 1500);
      }, animationDuration);
    }
    else if (method === "coin") {
      // Coin flip animation
      animationDuration = 2000;
      
      const flipInterval = setInterval(() => {
        setCoinValue(prev => prev === "heads" ? "tails" : "heads");
      }, 150);
      
      setTimeout(() => {
        clearInterval(flipInterval);
        // Randomly determine heads or tails
        const result = Math.random() > 0.5 ? "heads" : "tails";
        setCoinValue(result);
        
        // Map first option to heads, second to tails
        const winningIndex = result === "heads" ? 0 : 1;
        if (options.length >= 2) {
          setWinner(options[winningIndex]);
          setTimeout(() => {
            onComplete(options[winningIndex].id);
          }, 1500);
        }
      }, animationDuration);
    }
    
    return () => {
      // Clean up any animations if component unmounts
    };
  }, [isAnimating, countdown, method, options]);

  // Render tiebreaker UI based on method
  const renderTiebreakerAnimation = () => {
    if (countdown > 0) {
      return (
        <div className="flex flex-col items-center justify-center p-10">
          <div className="text-5xl font-bold text-primary mb-4">{countdown}</div>
          <p className="text-neutral-600">Get ready...</p>
        </div>
      );
    }
    
    switch (method) {
      case "dice":
        return (
          <div className="flex flex-col items-center justify-center p-10">
            <Dice 
              size="xl" 
              value={diceValue} 
              animated={isAnimating && countdown === 0} 
              className="mb-6"
            />
            {winner && (
              <div className="mt-4 text-center">
                <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-lg font-medium text-primary">{winner.text}</p>
                <p className="text-sm text-neutral-600 mt-1">is the winner!</p>
              </div>
            )}
          </div>
        );
        
      case "spinner":
        return (
          <div className="flex flex-col items-center justify-center p-6">
            <div className="relative w-60 h-60 mb-4">
              {/* Spinner wheel */}
              <div 
                className="w-full h-full rounded-full border-4 border-neutral-200 relative transition-transform duration-3000 ease-out"
                style={{ 
                  transform: `rotate(${spinnerRotation}deg)`,
                  background: 'conic-gradient(from 0deg, #4f46e5 0%, #ec4899 33%, #f59e0b 66%, #4f46e5 100%)'
                }}
                className={isAnimating && countdown === 0 ? "spinner-animation" : ""}
              >
                {/* Spinner segments */}
                {options.map((option, index) => {
                  const angle = (index * 360) / options.length;
                  return (
                    <div 
                      key={option.id}
                      className="absolute w-full h-full flex items-center justify-center text-white font-bold"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <div 
                        className="absolute top-2 text-xs"
                        style={{ transform: 'translateX(-50%)' }}
                      >
                        {option.text.substring(0, 10)}{option.text.length > 10 ? '...' : ''}
                      </div>
                    </div>
                  );
                })}
                
                {/* Center point */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md"></div>
              </div>
              
              {/* Spinner pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 w-4 h-4 bg-white shadow-md rotate-45"></div>
            </div>
            
            {winner && (
              <div className="mt-4 text-center">
                <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-lg font-medium text-primary">{winner.text}</p>
                <p className="text-sm text-neutral-600 mt-1">is the winner!</p>
              </div>
            )}
          </div>
        );
        
      case "coin":
        return (
          <div className="flex flex-col items-center justify-center p-10">
            {/* Simple coin flip animation */}
            <div 
              className={cn(
                "w-24 h-24 rounded-full shadow-lg flex items-center justify-center text-xl font-bold mb-6",
                isAnimating && countdown === 0 ? "coin-animation" : "",
                coinValue === "heads" ? "bg-primary text-white" : "bg-secondary text-white"
              )}
            >
              {coinValue === "heads" ? "H" : "T"}
            </div>
            
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="font-medium mb-1">Heads</p>
                <p className="text-sm text-neutral-600">{options[0]?.text || ""}</p>
              </div>
              <div className="text-center">
                <p className="font-medium mb-1">Tails</p>
                <p className="text-sm text-neutral-600">{options[1]?.text || ""}</p>
              </div>
            </div>
            
            {winner && (
              <div className="mt-4 text-center">
                <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-lg font-medium text-primary">{winner.text}</p>
                <p className="text-sm text-neutral-600 mt-1">is the winner!</p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <h3 className="text-xl font-heading font-semibold mb-4 text-center">Tiebreaker</h3>
        
        {!isAnimating ? (
          <>
            <p className="text-neutral-600 text-center mb-6">
              It's a tie! Select a tiebreaker method to determine the winner.
            </p>
            
            <div className="mb-6">
              <ToggleGroup type="single" value={method} onValueChange={(value) => value && setMethod(value as TiebreakerMethod)}>
                <ToggleGroupItem value="dice" className="flex-1">
                  <span className="mr-2">🎲</span> Dice
                </ToggleGroupItem>
                <ToggleGroupItem value="spinner" className="flex-1">
                  <span className="mr-2">🎡</span> Spinner
                </ToggleGroupItem>
                <ToggleGroupItem value="coin" className="flex-1" disabled={options.length > 2}>
                  <span className="mr-2">🪙</span> Coin
                </ToggleGroupItem>
              </ToggleGroup>
              
              {method === "coin" && options.length > 2 && (
                <p className="text-xs text-destructive mt-2">
                  Coin flip only works with exactly 2 options.
                </p>
              )}
            </div>
            
            <h4 className="font-medium mb-2">Tied Options:</h4>
            <ul className="list-disc pl-5 mb-6">
              {options.map(option => (
                <li key={option.id} className="mb-1">{option.text}</li>
              ))}
            </ul>
            
            <Button 
              className="w-full rounded-lg"
              onClick={startTiebreaker}
              disabled={method === "coin" && options.length !== 2}
            >
              Start Tiebreaker
            </Button>
          </>
        ) : (
          <div className="min-h-[300px] flex items-center justify-center">
            {renderTiebreakerAnimation()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Add a special animation for the coin flip
const styles = `
@keyframes flip {
  0% { transform: rotateY(0); }
  100% { transform: rotateY(1800deg); }
}
.animate-flip {
  animation: flip 2s ease-out;
}
`;

// Add styles to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}