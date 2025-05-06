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
  Trophy,
  RefreshCw
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Room status types
type RoomStatus = "waiting" | "voting" | "results" | "completed";

type VoteResult = {
  userId: number;
  optionId: number;
};

export default function DecisionRoomPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<RoomStatus>("waiting");
  const [newOption, setNewOption] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("options");
  const [showTiebreaker, setShowTiebreaker] = useState(false);
  const [tiebreakerMethod, setTiebreakerMethod] = useState<TiebreakerMethod>("random");

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

  // Fetch members (users) of the room
  const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useQuery<{ id: number, username: string, displayName: string, email: string }[]>({
    queryKey: [`/api/rooms/${room?.id}/members`],
    enabled: !!room?.id,
    onSuccess: (data: any) => {
      console.log('Successfully fetched members:', data);
    },
    onError: (error: any) => {
      console.error('Error fetching members:', error);
      toast({
        title: "Failed to load participants",
        description: "Could not load the room participants. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  });

  // Ensure members is always an array
  const safeMembers = Array.isArray(members) ? members : [];

  // Debug function to check participants directly
  const debugParticipants = async () => {
    if (!room?.id) return;
    
    try {
      const response = await fetch(`/api/debug/room/${room.id}/participants`);
      const data = await response.json();
      console.log('Debug participants data:', data);
      toast({
        title: "Debug Info",
        description: `Room ${room.id} has ${data.participantCount} participants`,
      });
      
      // Force refetch members
      refetchMembers();
    } catch (error) {
      console.error('Error debugging participants:', error);
    }
  };

  // Function to manually add the current user as a participant
  const addSelfAsParticipant = async () => {
    if (!room?.id || !user?.id) return;
    
    try {
      const response = await apiRequest("POST", "/api/rooms/join", { code: room.code });
      if (response.ok) {
        toast({
          title: "Joined room",
          description: "You've been added as a participant",
        });
        refetchMembers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to join room",
          description: errorData.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding self as participant:', error);
      toast({
        title: "Error",
        description: "Failed to join the room",
        variant: "destructive",
      });
    }
  };

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

  // Handle adding a new option
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

  // Vote mutation - simplified approach
  const voteMutation = useMutation({
    mutationFn: async (data: { roomId: number, optionId: number }) => {
      console.log('Submitting vote with data:', data);
      
      // Use a simple form data approach
      const formData = new FormData();
      formData.append('roomId', data.roomId.toString());
      formData.append('optionId', data.optionId.toString());
      
      const response = await fetch('/api/votes-simple', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error: ${response.status}`);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded.",
      });
      
      // Update UI to show results
      setActiveTab("results");
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${room?.id}/results`] });
    },
    onError: (error: any) => {
      console.error('Vote mutation error:', error);
      toast({
        title: "Failed to submit vote",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle vote submission
  const handleVote = () => {
    if (!room?.id || !selectedOptionId) {
      toast({
        title: "Selection required",
        description: "Please select an option to vote.",
        variant: "destructive",
      });
      return;
    }
    
    console.log(`Submitting vote for option ${selectedOptionId} in room ${room.id}`);
    
    voteMutation.mutate({
      roomId: room.id,
      optionId: selectedOptionId
    });
  };

  // Open voting mutation (for room creator)
  const openVotingMutation = useMutation({
    mutationFn: async (roomId: number) => {
      // In a real implementation, this would be an API call to update room status
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

  // Handle opening voting
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
    
    // Open voting
    openVotingMutation.mutate(room.id);
  };
  
  // End voting mutation (for room creator)
  const endVotingMutation = useMutation({
    mutationFn: async (roomId: number) => {
      // In a real implementation, this would be an API call to update room status
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      setStatus("results");
      setActiveTab("results");
      toast({
        title: "Voting ended",
        description: "Voting has been closed. View the results.",
      });
      
      // Refresh results
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${room?.id}/results`] });
    }
  });
  
  // Handle ending voting
  const handleEndVoting = () => {
    if (!room?.id) return;
    
    endVotingMutation.mutate(room.id);
  };

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

  // State for tiebreaker UI
  const [isTie, setIsTie] = useState(false);

  // Determine if current user is the room creator
  const isCreator = room?.ownerId === user?.id;

  // Fetch vote results for the room
  const { data: voteResults = [], isLoading: voteResultsLoading, refetch: refetchResults } = useQuery<VoteResult[]>({
    queryKey: [`/api/rooms/${room?.id}/results`],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/rooms/${room?.id}/results`);
        if (!response.ok) {
          throw new Error("Failed to fetch vote results");
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching vote results:", error);
        return [];
      }
    },
    enabled: !!room?.id && (status === "results" || status === "completed" || room?.isCompleted),
  });

  // Process vote results to get counts per option
  const voteCountsByOption = Array.isArray(voteResults) ? 
    voteResults.reduce((counts: Record<number, number>, vote) => {
      counts[vote.optionId] = (counts[vote.optionId] || 0) + 1;
      return counts;
    }, {}) : {};

  // Check if user has voted
  const hasVoted = Array.isArray(voteResults) && voteResults.some(vote => vote.userId === user?.id);

  // Get total votes
  const totalVotes = Array.isArray(voteResults) ? voteResults.length : 0;

  // Calculate vote percentages and find the winning option
  const votePercentages = Array.isArray(voteResults) ? 
    Object.entries(voteCountsByOption).map(([optionId, count]) => {
      return {
        optionId: parseInt(optionId),
        voteCount: count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
      };
    }).sort((a, b) => b.percentage - a.percentage) : [];

  // Determine if there's a tie for the winning option
  const highestVoteCount = votePercentages.length > 0 ? votePercentages[0].voteCount : 0;
  
  // Find all options with the highest vote count
  const tiedOptions = votePercentages.length > 0 ? 
    votePercentages
      .filter(result => result.voteCount === highestVoteCount)
      .map(result => {
        const option = options.find(o => o.id === result.optionId);
        return {
          id: result.optionId,
          text: option ? option.text : `Option ${result.optionId}`,
          voteCount: result.voteCount
        };
      }) : [];

  // Check for ties when voting is complete
  useEffect(() => {
    if (status === "results" && Array.isArray(tiedOptions) && tiedOptions.length > 1) {
      setIsTie(true);
    } else {
      setIsTie(false);
      setShowTiebreaker(false);
    }
  }, [status, tiedOptions]);

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
            <span>{safeMembers.length} Participants</span>
          </div>
          
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
                onClick={handleEndVoting}
                disabled={endVotingMutation.isPending}
              >
                {endVotingMutation.isPending ? (
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
              
              {Array.isArray(options) && options.length === 0 ? (
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
                            <Badge variant="outline" className="ml-2 text-xs">
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
              
              {voteMutation.isError ? (
                <div className="text-center py-8 border border-dashed border-destructive/20 rounded-lg bg-destructive/10 mb-6">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
                  <h3 className="font-medium text-lg mb-2">Vote Failed</h3>
                  <p className="text-neutral-600 mb-4">
                    {(voteMutation.error as Error)?.message || "Failed to submit your vote. Please try again."}
                  </p>
                  <Button 
                    variant="outline" 
                    className="rounded-lg"
                    onClick={() => voteMutation.reset()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
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
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Confirm Vote
                      </>
                    )}
                  </Button>
                </>
              )}
              
              <div className="text-xs text-neutral-500 text-center mt-4">
                Note: You can only vote once per decision.
              </div>
            </TabsContent>
            
            {/* Results Tab */}
            <TabsContent value="results" className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-heading font-semibold">Results</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => refetchResults()}
                  disabled={voteResultsLoading}
                >
                  {voteResultsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1">Refresh</span>
                </Button>
              </div>
              
              {voteResultsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : Array.isArray(votePercentages) && votePercentages.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-neutral-200 rounded-lg bg-neutral-50">
                  <BarChart2 className="h-12 w-12 mx-auto mb-3 text-neutral-400" />
                  <h3 className="font-medium text-lg mb-2">No votes yet</h3>
                  <p className="text-neutral-600">
                    Results will appear here once votes have been cast.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {votePercentages.map(result => {
                    const option = options.find(o => o.id === result.optionId);
                    const isWinner = room?.winningOptionId === result.optionId;
                    
                    return (
                      <div key={result.optionId} className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center">
                            <span className="font-medium">{option ? option.text : `Option ${result.optionId}`}</span>
                            {isWinner && room?.isCompleted && (
                              <Badge className="ml-2 bg-primary text-white">Winner</Badge>
                            )}
                          </div>
                          <span className="text-sm">{result.voteCount} vote{result.voteCount !== 1 ? 's' : ''} ({result.percentage}%)</span>
                        </div>
                        <div className="relative">
                          <div className={`relative h-2 w-full overflow-hidden rounded-full ${isWinner && status === "completed" ? "bg-primary-100" : "bg-neutral-100"}`}>
                            <div 
                              className={`h-full w-full flex-1 ${isWinner && status === "completed" ? "bg-primary" : "bg-secondary"} transition-all`}
                              style={{ 
                                transform: `translateX(-${100 - result.percentage}%)` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {room && room.isCompleted && room.tiebreakerUsed && (
                    <div className="mt-6 p-4 border border-dashed border-neutral-200 rounded-lg bg-neutral-50">
                      <div className="flex items-center">
                        <Dice className="h-5 w-5 mr-2 text-primary" />
                        <span className="text-sm">
                          Tiebreaker used: <span className="font-medium">{room.tiebreakerUsed}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - Participants */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold">Participants</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-2 py-1">
                {safeMembers.length}
              </Badge>
              {isCreator && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs" 
                  onClick={debugParticipants}
                >
                  Debug
                </Button>
              )}
            </div>
          </div>
          
          {membersLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-neutral-200 rounded-lg bg-neutral-50">
              <Users className="h-10 w-10 mx-auto mb-3 text-neutral-400" />
              <p className="text-neutral-600">No participants yet</p>
              {isCreator && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="mt-2" 
                  onClick={addSelfAsParticipant}
                >
                  Add yourself
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {safeMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(member as any).displayName ? (member as any).displayName.charAt(0).toUpperCase() : 
                         (member as any).username ? (member as any).username.charAt(0).toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-medium">
                        {(member as any).id === user?.id ? "You" : ((member as any).displayName || (member as any).username || 'Unknown')}
                      </span>
                      {(member as any).id === room.ownerId && (
                        <Badge variant="outline" className="ml-2 text-xs">Owner</Badge>
                      )}
                      <p className="text-xs text-neutral-500">@{(member as any).username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {status === "voting" && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Voting Progress</h3>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div 
                  className={`h-full w-full flex-1 bg-secondary transition-all`}
                  style={{ 
                    transform: `translateX(-${100 - (Math.min(1, safeMembers.length / (room.maxParticipants || 1)) * 100)}%)` 
                  }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1 text-right">
                {safeMembers.length} {room.maxParticipants ? `of ${room.maxParticipants}` : ''} participants
              </p>
            </div>
          )}
          
          <Button 
            variant="outline" 
            className="w-full mt-6 rounded-lg border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => window.location.href = '/'}
          >
            Leave Room
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}