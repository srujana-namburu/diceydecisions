import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertRoomSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

// Extended schema with client-side validations
const createRoomSchema = insertRoomSchema.extend({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }).max(50, { message: "Title must be at most 50 characters" }),
  description: z.string().max(200, { message: "Description must be at most 200 characters" }).optional(),
});

type CreateRoomFormValues = z.infer<typeof createRoomSchema>;

export function CreateRoomForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [charCount, setCharCount] = useState(0);
  
  const form = useForm<CreateRoomFormValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      title: "",
      description: "",
      maxParticipants: undefined,
      allowParticipantsToAddOptions: true,
    }
  });
  
  const createRoomMutation = useMutation({
    mutationFn: async (data: CreateRoomFormValues) => {
      const response = await apiRequest("POST", "/api/rooms", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Room created!",
        description: "Your decision room has been created successfully.",
      });
      setLocation(`/room-created/${data.code}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create room",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: CreateRoomFormValues) => {
    createRoomMutation.mutate(data);
  };
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCharCount(value.length);
    
    if (value.length > 200) {
      e.target.value = value.substring(0, 200);
      setCharCount(200);
    }
    
    form.setValue("description", e.target.value);
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">
          Room Title<span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          className="rounded-lg"
          placeholder="e.g. Lunch Location, Movie Night Pick"
          {...form.register("title")}
        />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          className="rounded-lg min-h-[100px]"
          placeholder="Add some context about this decision..."
          {...form.register("description")}
          onChange={handleDescriptionChange}
        />
        <div className="mt-1 text-sm text-neutral-500 flex justify-end">
          <span>{charCount}</span>/200
        </div>
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="maxParticipants">Maximum Participants (optional)</Label>
        <Select
          onValueChange={(value) => form.setValue("maxParticipants", value === 'unlimited' ? undefined : parseInt(value))}
        >
          <SelectTrigger className="rounded-lg">
            <SelectValue placeholder="Unlimited" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unlimited">Unlimited</SelectItem>
            <SelectItem value="2">2 participants</SelectItem>
            <SelectItem value="5">5 participants</SelectItem>
            <SelectItem value="10">10 participants</SelectItem>
            <SelectItem value="20">20 participants</SelectItem>
            <SelectItem value="50">50 participants</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="allowParticipantsToAddOptions" className="block">
            Allow Participants to Add Options
          </Label>
          <p className="text-xs text-neutral-500 mt-1">
            When enabled, all participants can add new options to consider
          </p>
        </div>
        <Switch
          id="allowParticipantsToAddOptions"
          checked={form.watch("allowParticipantsToAddOptions")}
          onCheckedChange={(checked) => form.setValue("allowParticipantsToAddOptions", checked)}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full rounded-lg btn-primary"
        disabled={createRoomMutation.isPending}
      >
        {createRoomMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Create Decision Room
      </Button>
    </form>
  );
}
