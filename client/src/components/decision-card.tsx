import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface DecisionCardProps {
  id: number;
  title: string;
  createdAt: Date;
  isCompleted: boolean;
  winningOption?: string;
  participantCount: number;
  optionCount?: number;
  tiebreakerUsed?: string | null;
  participants?: { id: number; username: string }[];
  onClick: () => void;
  buttonText: string;
}

export function DecisionCard({
  id,
  title,
  createdAt,
  isCompleted,
  winningOption,
  participantCount,
  optionCount,
  tiebreakerUsed,
  participants = [],
  onClick,
  buttonText,
}: DecisionCardProps) {
  // Format the date to show how long ago
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-heading">{title}</CardTitle>
          <Badge
            variant={isCompleted ? "outline" : "secondary"}
            className={cn(
              "px-2 py-1 text-xs",
              isCompleted ? "bg-primary-100 text-primary-700" : "bg-secondary-100 text-secondary-700"
            )}
          >
            {isCompleted ? "Completed" : "In Progress"}
          </Badge>
        </div>
        <p className="text-neutral-600 text-sm flex items-center mt-1">
          <Calendar className="h-3 w-3 mr-1" />
          {isCompleted ? `Decided ${timeAgo}` : `Started ${timeAgo}`}
        </p>
      </CardHeader>
      
      <CardContent>
        {isCompleted && winningOption ? (
          <div className="px-3 py-2 bg-neutral-100 rounded-lg">
            <p className="text-neutral-800 font-medium">
              Winner: <span className="text-green-500">{winningOption}</span>
            </p>
            {tiebreakerUsed && (
              <p className="text-xs text-neutral-600 mt-1">
                Tiebreaker used: {tiebreakerUsed}
              </p>
            )}
          </div>
        ) : (
          <div className="px-3 py-2 bg-neutral-100 rounded-lg">
            <p className="text-neutral-800 font-medium">
              Options: <span className="text-primary">{optionCount || 0}</span>
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between items-center">
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="flex items-center cursor-help">
              <Users className="h-3 w-3 mr-1" />
              <span className="text-xs text-neutral-500">{participantCount} participants</span>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Participants</h4>
              {participants.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {participants.map((participant) => (
                    <li key={participant.id} className="text-neutral-600">
                      {participant.username}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">No participants yet</p>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
        <Button 
          variant="link" 
          className="text-secondary p-0 h-auto"
          onClick={onClick}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
}
