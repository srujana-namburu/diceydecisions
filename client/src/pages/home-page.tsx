import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Room } from "@shared/schema";
import { AppLayout } from "@/layouts/app-layout";
import { DecisionCard } from "@/components/decision-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dice } from "@/components/ui/dice";
import { PlusCircle, Users, History } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [roomCode, setRoomCode] = useState("");
  
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });
  
  // Filter rooms into recent (in progress) and completed
  const recentDecisions = rooms.filter(room => !room.isCompleted).slice(0, 3);
  
  // Join room mutation
  const joinRoomMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/rooms/join", { code });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Room joined!",
        description: `You've successfully joined the room "${data.title}".`,
      });
      setRoomCode("");
      // In a full implementation, we would redirect to the room
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join room",
        description: error.message || "Invalid room code",
        variant: "destructive",
      });
    }
  });
  
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      joinRoomMutation.mutate(roomCode.trim());
    } else {
      toast({
        title: "Room code required",
        description: "Please enter a valid room code",
        variant: "destructive",
      });
    }
  };
  
  return (
    <AppLayout>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-neutral-800">
          Welcome, <span className="text-primary">{user?.displayName || user?.username}</span>!
        </h1>
        <p className="mt-2 text-neutral-600">What decision will you roll for today?</p>
      </div>
      
      {/* Main Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
        {/* Create New Decision Card */}
        <Card className="bg-gradient-to-br from-primary to-secondary text-white p-6 md:p-8 flex flex-col justify-between min-h-[250px] hover:-translate-y-1 transition-all cursor-pointer shadow-lg rounded-xl">
          <div>
            <Dice size="lg" color="white" className="mb-4 opacity-90" />
            <h2 className="font-heading font-bold text-2xl md:text-3xl">Create New Decision</h2>
            <p className="mt-2 opacity-90">Start a new decision-making room and invite others to join.</p>
          </div>
          <Button
            onClick={() => setLocation("/create-room")}
            className="mt-4 bg-white text-primary hover:bg-neutral-100 w-full btn-primary rounded-lg"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Get Started
          </Button>
        </Card>
        
        {/* Join a Decision Card */}
        <Card className="p-6 md:p-8 flex flex-col justify-between min-h-[250px] rounded-xl">
          <div>
            <Users className="h-10 w-10 mb-4 text-secondary" />
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-neutral-800">Join a Decision</h2>
            <p className="mt-2 text-neutral-600">Enter a room code to join an existing decision.</p>
          </div>
          <form onSubmit={handleJoinRoom} className="mt-4">
            <div className="flex space-x-3">
              <Input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter room code"
                className="flex-1 rounded-lg"
                maxLength={6}
              />
              <Button 
                type="submit"
                className="bg-secondary text-white hover:bg-secondary/90 rounded-lg"
                disabled={joinRoomMutation.isPending}
              >
                Join
              </Button>
            </div>
          </form>
        </Card>
        
        {/* View Past Decisions Card */}
        <Card className="p-6 md:p-8 flex flex-col justify-between min-h-[250px] rounded-xl">
          <div>
            <History className="h-10 w-10 mb-4 text-accent" />
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-neutral-800">Past Decisions</h2>
            <p className="mt-2 text-neutral-600">Review the outcomes of your previous decisions.</p>
          </div>
          <Button
            onClick={() => setLocation("/past-decisions")}
            className="mt-4 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-lg"
          >
            <History className="mr-2 h-4 w-4" /> View History
          </Button>
        </Card>
      </div>
      
      {/* Recent Decisions */}
      {recentDecisions.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading font-bold text-2xl text-neutral-800 mb-4">Recent Decisions</h2>
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentDecisions.map((decision) => (
              <DecisionCard
                key={decision.id}
                id={decision.id}
                title={decision.title}
                createdAt={decision.createdAt}
                isCompleted={decision.isCompleted}
                participantCount={3} // This would come from the API in a full implementation
                optionCount={4} // This would come from the API in a full implementation
                onClick={() => {/* Navigate to decision room */}}
                buttonText="Continue"
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Empty state if no recent decisions */}
      {recentDecisions.length === 0 && !isLoadingRooms && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Dice size="xl" className="mb-4 dice-animation" />
          <h3 className="font-heading text-xl font-semibold mb-2">No active decisions yet</h3>
          <p className="text-neutral-600 max-w-md mb-6">
            Create your first decision room to start making group decisions the fun way!
          </p>
          <Button 
            onClick={() => setLocation("/create-room")}
            className="bg-primary text-white hover:bg-primary/90 rounded-lg btn-primary"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Decision
          </Button>
        </div>
      )}
    </AppLayout>
  );
}
