import { AppLayout } from "@/layouts/app-layout";
import { CreateRoomForm } from "@/components/create-room-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function CreateRoomPage() {
  const [, setLocation] = useLocation();
  
  return (
    <AppLayout>
      <div className="mb-6">
        <Button
          variant="ghost"
          className="text-neutral-600 hover:text-primary px-0"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
      
      <Card className="p-6 md:p-8 rounded-xl">
        <h1 className="font-heading font-bold text-3xl text-neutral-800 mb-6">Create New Decision Room</h1>
        <CreateRoomForm />
      </Card>
    </AppLayout>
  );
}
