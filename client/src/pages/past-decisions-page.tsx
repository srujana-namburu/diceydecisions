import { useState } from "react";
import { AppLayout } from "@/layouts/app-layout";
import { useQuery } from "@tanstack/react-query";
import { Room } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dice } from "@/components/ui/dice";
import { Filter, Calendar, Users } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function PastDecisionsPage() {
  const [sortOrder, setSortOrder] = useState<string>("newest");
  
  // Get all rooms
  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });
  
  // Filter to only show completed decisions
  const completedDecisions = rooms.filter(room => room.isCompleted);
  
  // Sort decisions based on selected option
  const sortedDecisions = [...completedDecisions].sort((a, b) => {
    switch (sortOrder) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  
  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl text-neutral-800">Past Decisions</h1>
          <p className="text-neutral-600 mt-1">Review your decision history</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <Select
            value={sortOrder}
            onValueChange={setSortOrder}
          >
            <SelectTrigger className="w-full sm:w-auto rounded-lg">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
          
          <Button className="rounded-lg">
            <Filter className="h-4 w-4 mr-2" /> Filter
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Dice size="lg" className="dice-animation" />
        </div>
      ) : sortedDecisions.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Decision</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Tiebreaker</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDecisions.map((decision) => (
                  <TableRow key={decision.id}>
                    <TableCell className="font-medium">{decision.title}</TableCell>
                    <TableCell>{format(new Date(decision.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-green-500 font-medium">
                      {/* This would come from the API with option details */}
                      Option {decision.winningOptionId}
                    </TableCell>
                    <TableCell>
                      {/* This would come from the API */}
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1 text-neutral-500" />
                        <span>5</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {decision.tiebreakerUsed ? (
                        <Badge 
                          variant="outline" 
                          className="bg-primary-100 text-primary-800 rounded-full"
                        >
                          {decision.tiebreakerUsed}
                        </Badge>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className="bg-neutral-100 text-neutral-800 rounded-full"
                        >
                          None
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="text-secondary p-0 h-auto"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="bg-neutral-50 px-4 py-3 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="hidden sm:block">
                <p className="text-sm text-neutral-700">
                  Showing <span className="font-medium">1</span> to{" "}
                  <span className="font-medium">{sortedDecisions.length}</span> of{" "}
                  <span className="font-medium">{sortedDecisions.length}</span> results
                </p>
              </div>
              
              {/* This would be implemented with proper pagination in a full app */}
              <div className="flex justify-center sm:justify-end space-x-1">
                <Button variant="outline" size="sm" className="rounded-lg">
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg">
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Dice size="xl" className="mb-4" />
          <h3 className="font-heading text-xl font-semibold mb-2">No past decisions yet</h3>
          <p className="text-neutral-600 max-w-md">
            Once you complete some decisions, they'll appear here for you to review.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
