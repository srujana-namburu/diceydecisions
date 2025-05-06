import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/layouts/app-layout";
import { Room, Option } from "@shared/schema";
import { Dice } from "@/components/ui/dice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Tiebreaker, TiebreakerMethod } from "@/components/tiebreaker";
import { 
  Users, 
  Clock, 
  Plus, 
  ChevronRight, 
  Check, 
  AlertCircle, 
  Loader2,
  BarChart2,
  Trophy
} from "lucide-react";

// Room status types
type RoomStatus = "waiting" | "voting" | "results" | "completed";

export default function DecisionRoomPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<RoomStatus>("waiting");
  const [newOption, setNewOption] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("options");
  const [remainingTime, setRemainingTime] = useState(300); // 5 minutes in seconds

  // Fetch room details
  const { data: room, isLoading: roomLoading } = useQuery<Room>({
    queryKey: [`/api/rooms/${code}`],
    enabled: !!code,
  });

  // Fetch options
  const { data: options = [], isLoading: optionsLoading } = useQuery<Option[]>({
    queryKey: [`/api/rooms/${room?.id}/options`],
    enabled: !!room?.id,
  });

  // Add option mutation
  const addOptionMutation = useMutation({
    mutationFn: async (data: { text: string, roomId: number }) => {
      const response = await apiRequest("POST", "/api/options", {
        text: data.text,
        roomId: data.roomId
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${room?.id}/options`] });
      setNewOption("");
      toast({
        title: "Option added",
        description: "Your option has been added to the decision.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add option",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (data: { roomId: number, optionId: number }) => {
      const response = await apiRequest("POST", "/api/votes", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded.",
      });
      // In a real implementation, we would update the UI to show waiting for others
      setStatus("results"); // For demo purposes, show results immediately
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit vote",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Open voting mutation (for room creator)
  const openVotingMutation = useMutation({
    mutationFn: async (roomId: number) => {
      // This would be a real API call in a full implementation
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      setStatus("voting");
      toast({
        title: "Voting opened",
        description: "Participants can now vote on the options.",
      });
    }
  });

  // Complete decision mutation (for room creator)
  const completeDecisionMutation = useMutation({
    mutationFn: async (data: { roomId: number, tiebreaker?: string, winningOptionId?: number }) => {
      const response = await apiRequest("POST", `/api/rooms/${data.roomId}/complete`, {
        tiebreaker: data.tiebreaker,
        winningOptionId: data.winningOptionId
      });
      return await response.json();
    },
    onSuccess: () => {
      setStatus("completed");
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${room?.id}`] });
      toast({
        title: "Decision completed!",
        description: "The winner has been determined.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete decision",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Time countdown effect (for voting phase)
  useEffect(() => {
    if (status !== "voting") return;
    
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          // Auto-complete voting when time runs out
          if (room?.id && room.ownerId === user?.id) {
            completeDecisionMutation.mutate({ roomId: room.id });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [status, room?.id, room?.ownerId, user?.id]);
  
  // Check for ties when voting is complete
  useEffect(() => {
    if (status === "results" && tiedOptions.length > 1) {
      setIsTie(true);
    } else {
      setIsTie(false);
      setShowTiebreaker(false);
    }
  }, [status, tiedOptions.length]);

  // Format remaining time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAddOption = () => {
    if (!room?.id) return;
    if (!newOption.trim()) {
      toast({
        title: "Option required",
        description: "Please enter an option.",
        variant: "destructive",
      });
      return;
    }
    
    addOptionMutation.mutate({
      text: newOption.trim(),
      roomId: room.id
    });
  };

  const handleOpenVoting = () => {
    if (!room?.id) return;
    if (options.length < 2) {
      toast({
        title: "Not enough options",
        description: "At least 2 options are required to start voting.",
        variant: "destructive",
      });
      return;
    }
    
    openVotingMutation.mutate(room.id);
  };

  const handleVote = () => {
    if (!room?.id || !selectedOptionId) return;
    
    voteMutation.mutate({
      roomId: room.id,
      optionId: selectedOptionId
    });
  };

  const handleCompleteDecision = () => {
    if (!room?.id) return;
    
    completeDecisionMutation.mutate({
      roomId: room.id,
      tiebreaker: "random" // Default tiebreaker method
    });
  };

  // Determine if current user is the room creator
  const isCreator = room?.ownerId === user?.id;

  // Mock data for participants (in a real app, this would come from the API)
  const participants = [
    { id: 1, name: "User 1", hasVoted: true },
    { id: 2, name: "User 2", hasVoted: false },
    { id: 3, name: "User 3", hasVoted: true },
  ];

  // Mock vote results (in a real app, this would come from the API)
  const voteResults = options.map(option => ({
    option,
    votes: Math.floor(Math.random() * 5) // Random vote count for demo
  }));
  
  // Determine if there's a tie (for demo purposes)
  const [isTie, setIsTie] = useState(false);
  const [showTiebreaker, setShowTiebreaker] = useState(false);
  const [tiebreakerMethod, setTiebreakerMethod] = useState<TiebreakerMethod>("dice");
  
  // Filter tied options based on vote count
  const tiedOptions = voteResults
    .filter(result => result.votes === Math.max(...voteResults.map(r => r.votes)))
    .map(result => ({
      id: result.option.id,
      text: result.option.text,
    }));

  if (roomLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Dice className="dice-animation" size="xl" />
        </div>
      </AppLayout>
    );
  }

  if (!room) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Room Not Found</h1>
          <p className="text-neutral-600 mb-6">
            The decision room you're looking for doesn't exist or has been closed.
          </p>
          <Button className="rounded-lg" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Room Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-neutral-800">{room.title}</h1>
            {room.description && (
              <p className="text-neutral-600 mt-1">{room.description}</p>
            )}
          </div>
          
          <Badge 
            variant={status === "completed" ? "outline" : "secondary"}
            className="px-3 py-1"
          >
            {status === "waiting" && "Waiting for Options"}
            {status === "voting" && "Voting Open"}
            {status === "results" && "Viewing Results"}
            {status === "completed" && "Decision Complete"}
          </Badge>
        </div>
        
        {/* Room Stats */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center text-sm text-neutral-600">
            <Users className="h-4 w-4 mr-1" />
            <span>{participants.length} Participants</span>
          </div>
          
          {status === "voting" && (
            <div className="flex items-center text-sm text-neutral-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>Time remaining: {formatTime(remainingTime)}</span>
            </div>
          )}
          
          {isCreator && status === "waiting" && (
            <div className="ml-auto">
              <Button 
                className="rounded-lg bg-primary text-white hover:bg-primary/90"
                onClick={handleOpenVoting}
                disabled={openVotingMutation.isPending || options.length < 2}
              >
                {openVotingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2" />
                )}
                Open Voting
              </Button>
            </div>
          )}
          
          {isCreator && status === "voting" && (
            <div className="ml-auto">
              <Button 
                className="rounded-lg bg-accent text-white hover:bg-accent/90"
                onClick={handleCompleteDecision}
                disabled={completeDecisionMutation.isPending}
              >
                {completeDecisionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                End Voting
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Options/Voting/Results */}
        <div className="lg:col-span-2">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="bg-white rounded-xl shadow-md"
          >
            <TabsList className="p-2 border-b w-full rounded-t-xl rounded-b-none">
              <TabsTrigger value="options" className="flex-1 rounded-lg">Options</TabsTrigger>
              <TabsTrigger value="voting" className="flex-1 rounded-lg" disabled={status === "waiting"}>Voting</TabsTrigger>
              <TabsTrigger value="results" className="flex-1 rounded-lg" disabled={status === "waiting" || status === "voting"}>Results</TabsTrigger>
            </TabsList>
            
            {/* Options Tab */}
            <TabsContent value="options" className="p-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Decision Options</h2>
              
              {options.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-neutral-200 rounded-lg bg-neutral-50">
                  <Dice size="lg" className="mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">No options yet</h3>
                  <p className="text-neutral-600 mb-4">
                    Start by adding the first option for this decision.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {options.map((option) => (
                    <Card key={option.id} className="border border-neutral-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{option.text}</p>
                          {isCreator && (
                            <Badge variant="outline" className="text-xs">
                              Added by {option.createdById === user?.id ? "You" : "Participant"}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {status === "waiting" && (
                <div className="mt-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add your option..."
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      maxLength={50}
                      className="rounded-lg"
                    />
                    <Button 
                      className="rounded-lg"
                      onClick={handleAddOption}
                      disabled={addOptionMutation.isPending}
                    >
                      {addOptionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="text-right text-xs text-neutral-500 mt-1">
                    {newOption.length}/50 characters
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Voting Tab */}
            <TabsContent value="voting" className="p-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Cast Your Vote</h2>
              
              <div className="space-y-3 mb-6">
                {options.map((option) => (
                  <Card 
                    key={option.id} 
                    className={`border border-neutral-200 cursor-pointer transition-all hover:shadow-md ${
                      selectedOptionId === option.id ? "border-primary ring-2 ring-primary ring-opacity-30" : ""
                    }`}
                    onClick={() => setSelectedOptionId(option.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">{option.text}</p>
                        {selectedOptionId === option.id && (
                          <Check className="text-primary h-5 w-5" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Button 
                className="w-full rounded-lg bg-primary text-white hover:bg-primary/90"
                disabled={!selectedOptionId || voteMutation.isPending}
                onClick={handleVote}
              >
                {voteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirm Vote
              </Button>
            </TabsContent>
            
            {/* Results Tab */}
            <TabsContent value="results" className="p-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Voting Results</h2>
              
              {(status === "results" || status === "completed") && (
                <>
                  <div className="space-y-4 mb-6">
                    {voteResults.map((result, index) => {
                      const isWinner = index === 0; // For demo, first option is winner
                      const maxVotes = Math.max(...voteResults.map(r => r.votes));
                      const percentage = maxVotes > 0 ? (result.votes / maxVotes) * 100 : 0;
                      
                      return (
                        <div key={result.option.id} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              {isWinner && status === "completed" && (
                                <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                              )}
                              <p className={`font-medium ${isWinner && status === "completed" ? "text-primary" : ""}`}>
                                {result.option.text}
                              </p>
                            </div>
                            <span className="text-neutral-700 font-medium">{result.votes} votes</span>
                          </div>
                          <div className={`relative h-2 w-full overflow-hidden rounded-full ${isWinner && status === "completed" ? "bg-primary-100" : "bg-neutral-100"}`}>
                            <div 
                              className={`h-full w-full flex-1 ${isWinner && status === "completed" ? "bg-primary" : "bg-secondary"} transition-all`}
                              style={{ transform: `translateX(-${100 - percentage}%)` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {status === "results" && isCreator && (
                    <>
                      {/* Show tiebreaker if there are multiple options with the highest votes */}
                      {tiedOptions.length > 1 && !showTiebreaker ? (
                        <div className="text-center mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                          <h3 className="font-heading font-semibold text-lg mb-1">It's a tie!</h3>
                          <p className="text-neutral-600 mb-4">
                            {tiedOptions.length} options have received the same number of votes. Use a tiebreaker to determine the winner.
                          </p>
                          <Button 
                            onClick={() => setShowTiebreaker(true)}
                            className="bg-amber-500 text-white hover:bg-amber-600"
                          >
                            Use Tiebreaker
                          </Button>
                        </div>
                      ) : null}
                      
                      {/* Tiebreaker component */}
                      {showTiebreaker && tiedOptions.length > 1 ? (
                        <Tiebreaker
                          options={tiedOptions}
                          onComplete={(winnerId) => {
                            if (room?.id) {
                              completeDecisionMutation.mutate({
                                roomId: room.id,
                                tiebreaker: "custom",
                                winningOptionId: winnerId
                              });
                              setShowTiebreaker(false);
                            }
                          }}
                          className="mb-6"
                        />
                      ) : null}
                      
                      {/* Only show the finalize button if there's no tie or tiebreaker is not shown */}
                      {(tiedOptions.length <= 1 || !showTiebreaker) && (
                        <Button 
                          className="w-full rounded-lg bg-accent text-white hover:bg-accent/90"
                          onClick={handleCompleteDecision}
                          disabled={completeDecisionMutation.isPending}
                        >
                          {completeDecisionMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Finalize Decision
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - Participants */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-heading font-semibold mb-4">Participants</h2>
          
          {participants.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-neutral-600">No participants yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-2 border-b border-neutral-100 last:border-0">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback className="bg-primary-50 text-primary">
                        {participant.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {participant.id === user?.id ? "You" : "Participant"}
                    </span>
                  </div>
                  
                  {status === "voting" && (
                    <Badge variant={participant.hasVoted ? "outline" : "secondary"} className="text-xs">
                      {participant.hasVoted ? "Voted" : "Not voted"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {status === "voting" && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Voting Progress</h3>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div 
                  className="h-full w-full flex-1 bg-secondary transition-all"
                  style={{ transform: `translateX(-${100 - (participants.filter(p => p.hasVoted).length / participants.length) * 100}%)` }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1 text-right">
                {participants.filter(p => p.hasVoted).length} of {participants.length} voted
              </p>
            </div>
          )}
          
          <Button 
            variant="outline" 
            className="w-full mt-6 rounded-lg border-destructive text-destructive hover:bg-destructive/10"
          >
            Leave Room
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}