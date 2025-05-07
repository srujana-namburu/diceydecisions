import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Room } from "@shared/schema";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dice } from "@/components/ui/dice";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Users, History, RefreshCw, SearchX, Calendar, ListChecks } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DecisionCardProps {
  id: number;
  title: string;
  createdAt: string;
  isCompleted: boolean;
  participantCount: number;
  optionCount: number;
  participants: any[];
  onClick: () => void;
  buttonText: string;
}

function DecisionCard({
  id,
  title,
  createdAt,
  isCompleted,
  participantCount,
  optionCount,
  participants,
  onClick,
  buttonText
}: DecisionCardProps) {
  const now = Date.now();
  const createdTime = new Date(createdAt).getTime();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const isExpired = now - createdTime > THIRTY_MINUTES;
  
  // Always show in-progress badge for non-completed decisions
  const isInProgress = !isCompleted;
  
  // Format the time difference
  const timeDiff = now - createdTime;
  const hours = Math.floor(timeDiff / (60 * 60 * 1000));
  const minutes = Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000));
  
  let timeText = "";
  if (isCompleted) {
    timeText = `Decided about ${hours > 0 ? `${hours} hours` : `${minutes} minutes`} ago`;
  } else {
    timeText = `Started about ${hours > 0 ? `${hours} hours` : `${minutes} minutes`} ago`;
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-lg truncate">{title}</h3>
          {isCompleted ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Completed
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              In Progress
            </Badge>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">
          <Calendar className="inline-block w-3 h-3 mr-1" />
          {timeText}
        </p>
        
        <div className="flex space-x-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center">
            <ListChecks className="w-3 h-3 mr-1" />
            <span>Options: {optionCount}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-3 h-3 mr-1" />
            <span>{participantCount} participants</span>
          </div>
        </div>
        
        <Button 
          variant="default" 
          size="sm" 
          className="w-full"
          onClick={onClick}
        >
          {buttonText}
        </Button>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [roomCode, setRoomCode] = useState("");
  const [selectedTab, setSelectedTab] = useState<"active" | "past">("active");
  const queryClient = useQueryClient();
  
  // Fetch rooms
  const { data: rooms = [], isLoading: isLoadingRooms, refetch: refetchRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    queryFn: async () => {
      try {
        console.log("Fetching rooms...");
        const response = await apiRequest("GET", "/api/rooms");
        if (!response.ok) {
          console.error("Failed to fetch rooms:", response.status);
          return [];
        }
        const data = await response.json();
        console.log("Successfully fetched rooms:", data);
        return data;
      } catch (error) {
        console.error("Error fetching rooms:", error);
        return [];
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  
  // Fetch detailed room data including participants
  const { data: roomDetails = {}, isLoading: isLoadingDetails, refetch: refetchRoomDetails } = useQuery<Record<number, any>>({
    queryKey: ["/api/rooms/details"],
    queryFn: async () => {
      if (rooms.length === 0) return {};
      
      try {
        const details = await Promise.all(
          rooms.map(async (room: Room) => {
            try {
              console.log(`Fetching details for room ${room.id}`);
              const response = await apiRequest("GET", `/api/rooms/${room.id}/details`);
              if (!response.ok) {
                console.error(`Failed to fetch details for room ${room.id}: ${response.status}`);
                return { id: room.id, participantCount: 0, optionCount: 0, participants: [] };
              }
              const data = await response.json();
              console.log(`Successfully fetched details for room ${room.id}:`, data);
              return data;
            } catch (error) {
              console.error(`Error fetching details for room ${room.id}:`, error);
              return { id: room.id, participantCount: 0, optionCount: 0, participants: [] };
            }
          })
        );
        
        return details.reduce((acc: Record<number, any>, room: any) => {
          if (room && room.id) {
            acc[room.id] = room;
          }
          return acc;
        }, {});
      } catch (error) {
        console.error("Error fetching room details:", error);
        return {};
      }
    },
    enabled: rooms.length > 0,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  
  // Filtering logic for active and past rooms
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;

  // Debug the filtering process
  console.log("All rooms before filtering:", rooms);

  // Simplified filtering logic to ensure rooms are displayed
  const filteredRooms = rooms.filter((room: Room) => {
    const isExpired = now - new Date(room.createdAt).getTime() > THIRTY_MINUTES;
    const isInProgress = !room.isCompleted;
    
    console.log(`Filtering room ${room.id}: ${room.title}, isCompleted=${room.isCompleted}, isExpired=${isExpired}, isInProgress=${isInProgress}`);
    
    if (selectedTab === "active") {
      // Show all in-progress rooms in the active tab regardless of expiration
      return isInProgress;
    } else {
      // Only show completed rooms in the past tab
      return room.isCompleted;
    }
  });
  
  // Debug the filtered results
  console.log("Filtered rooms:", filteredRooms);
  
  // Join room mutation
  const joinRoomMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/rooms/join", { code });
      return await response.json();
    },
    onSuccess: (data) => {
      refetchRooms();
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
      {/* Toggle Buttons */}
      <div className="flex justify-center mb-8">
        <button
          className={cn(
            "px-6 py-2 rounded-l-lg font-semibold border border-primary/30",
            selectedTab === "active"
              ? "bg-primary text-white shadow"
              : "bg-white text-primary hover:bg-primary/10"
          )}
          onClick={() => setSelectedTab("active")}
        >
          Decision Rooms
        </button>
        <button
          className={cn(
            "px-6 py-2 rounded-r-lg font-semibold border-t border-b border-r border-primary/30",
            selectedTab === "past"
              ? "bg-primary text-white shadow"
              : "bg-white text-primary hover:bg-primary/10"
          )}
          onClick={() => setSelectedTab("past")}
        >
          Past Decision Rooms
        </button>
      </div>
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
      
      {/* Decision Rooms List */}
      <div className="mt-12">
        <h2 className="font-heading font-bold text-2xl text-neutral-800 mb-4">
          {selectedTab === "active" ? "Your Active Decisions" : "Your Past Decisions"}
        </h2>
        
        {isLoadingRooms ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <SearchX className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="font-medium text-lg mb-2">No decisions found</h3>
            <p className="text-muted-foreground mb-6">
              {selectedTab === "active"
                ? "You don't have any active or in-progress decisions. Create a new one to get started!"
                : "You don't have any completed decisions. Completed decisions will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((decision: Room) => (
              <DecisionCard
                key={decision.id}
                id={decision.id}
                title={decision.title}
                createdAt={decision.createdAt}
                isCompleted={decision.isCompleted}
                participantCount={roomDetails[decision.id]?.participantCount || 0}
                optionCount={roomDetails[decision.id]?.optionCount || 0}
                participants={roomDetails[decision.id]?.participants || []}
                onClick={() => setLocation(`/room/${decision.code}`)}
                buttonText={selectedTab === "active" ? "Continue" : "View"}
              />
            ))}
          </div>
        )}
        
        <div className="mt-4 text-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
              refetchRoomDetails();
            }}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Decisions
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
