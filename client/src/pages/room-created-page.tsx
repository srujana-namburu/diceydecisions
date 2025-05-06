import { useEffect } from "react";
import { AppLayout } from "@/layouts/app-layout";
import { RoomCodeDisplay } from "@/components/room-code-display";
import { Card } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Room } from "@shared/schema";
import { Button } from "@/components/ui/button";

export default function RoomCreatedPage() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  
  // Fetch room details
  const { data: room, isLoading } = useQuery<Room>({
    queryKey: [`/api/rooms/${code}`],
    enabled: !!code,
  });
  
  // If no code in URL, redirect to dashboard
  useEffect(() => {
    if (!code) {
      setLocation("/");
    }
  }, [code, setLocation]);
  
  const handleEnterRoom = () => {
    // Redirect to the actual room view
    setLocation(`/room/${code}`);
  };
  
  const displayCode = code || "";
  
  // Handle missing code with a friendly error message
  if (!code) {
    return (
      <AppLayout>
        <Card className="p-6 md:p-8 text-center rounded-xl">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-500 bg-opacity-20 p-3">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <h1 className="font-heading font-bold text-3xl text-neutral-800 mt-4">
            Room Code Missing
          </h1>
          
          <p className="text-neutral-600 mt-2 mb-6">
            The room code is missing or invalid.
          </p>
          
          <Button 
            className="rounded-lg"
            onClick={() => setLocation("/")}
          >
            Return to Dashboard
          </Button>
        </Card>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <Card className="p-6 md:p-8 text-center rounded-xl">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-500 bg-opacity-20 p-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <h1 className="font-heading font-bold text-3xl text-neutral-800 mt-4">
          Room Created!
        </h1>
        
        <p className="text-neutral-600 mt-2">
          Share this code with others to invite them to your decision room
        </p>
        
        <RoomCodeDisplay 
          code={displayCode} 
          onEnterRoom={handleEnterRoom}
        />
      </Card>
    </AppLayout>
  );
}
