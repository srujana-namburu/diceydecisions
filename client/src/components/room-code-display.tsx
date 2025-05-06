import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomCodeDisplayProps {
  code: string;
  onEnterRoom: () => void;
}

export function RoomCodeDisplay({ code, onEnterRoom }: RoomCodeDisplayProps) {
  const { toast } = useToast();
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  const shareableLink = window.location.origin + "/join/" + code;
  
  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'code') {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
      
      toast({
        title: "Copied!",
        description: `The ${type} has been copied to your clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again or copy manually.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className="bg-primary-50 rounded-lg py-8 px-4 flex items-center justify-center my-6">
        <div className="text-4xl md:text-5xl font-heading font-bold tracking-widest text-primary pulse">
          {code.split('').map((char, index) => (
            <span key={index} className="inline-block mx-0.5">{char}</span>
          ))}
        </div>
      </div>
      
      <Button 
        onClick={() => copyToClipboard(code, 'code')}
        className="w-full sm:w-auto mb-8 btn-primary rounded-lg"
      >
        {codeCopied ? (
          <Check className="mr-2 h-4 w-4" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        Copy Room Code
      </Button>
      
      <h3 className="font-heading font-medium text-lg text-neutral-800 mb-4">Other Sharing Options</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Shareable Link */}
        <Card className="p-4 bg-neutral-50">
          <h4 className="font-medium text-neutral-700 mb-2">Shareable Link</h4>
          <div className="flex">
            <Input 
              value={shareableLink}
              readOnly 
              className="rounded-l-lg text-sm"
            />
            <Button
              onClick={() => copyToClipboard(shareableLink, 'link')}
              variant="secondary"
              className="rounded-l-none"
            >
              {linkCopied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        </Card>
        
        {/* QR Code Placeholder */}
        <Card className="p-4 bg-neutral-50">
          <h4 className="font-medium text-neutral-700 mb-2">QR Code</h4>
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-white p-2 rounded-lg border border-neutral-200 flex items-center justify-center">
              <Share2 className="h-12 w-12 text-neutral-700" />
            </div>
          </div>
        </Card>
      </div>
      
      <div className="border-t border-neutral-200 pt-6 mb-6">
        <h3 className="font-heading font-medium text-lg text-neutral-800 mb-4">Invite Friends by Email</h3>
        <div className="flex">
          <Input 
            type="email" 
            placeholder="Enter email address" 
            className="rounded-l-lg"
          />
          <Button
            className="rounded-l-none bg-secondary"
          >
            Send
          </Button>
        </div>
      </div>
      
      <Button 
        onClick={onEnterRoom}
        className="w-full btn-primary rounded-lg bg-accent hover:bg-accent/90 text-white"
      >
        Enter Room <span className="ml-2">→</span>
      </Button>
    </div>
  );
}
