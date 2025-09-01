import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Users, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  is_online?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string;
  team_id?: string;
  message: string;
  message_type: 'text' | 'file' | 'system';
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

export const TeamChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchTeamMembers();
    fetchMessages();
    subscribeToMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .neq('user_id', (await supabase.auth.getUser()).data.user?.id);
    
    if (data) {
      setTeamMembers(data);
    }
  };

  const fetchMessages = async () => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('team_messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: true });

    if (data) {
      // Fetch sender names separately to avoid join issues
      const messagesWithSenderName = await Promise.all(
        data.map(async (msg) => {
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', msg.sender_id)
            .single();

          return {
            ...msg,
            message_type: msg.message_type as 'text' | 'file' | 'system',
            sender_name: sender?.full_name || 'Unknown'
          };
        })
      );
      setMessages(messagesWithSenderName);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('team-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_messages'
      }, (payload) => {
        const newMsg = payload.new as Message;
        fetchMessages(); // Refresh to get sender name
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('team_messages')
      .insert({
        sender_id: currentUser.id,
        recipient_id: selectedRecipient,
        message: newMessage,
        message_type: 'text'
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } else {
      setNewMessage('');
      toast({
        title: 'Success',
        description: 'Message sent successfully'
      });
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
      {/* Team Members List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant={!selectedRecipient ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setSelectedRecipient(null)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              General Chat
            </Button>
            {teamMembers.map((member) => (
              <Button
                key={member.id}
                variant={selectedRecipient === member.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedRecipient(member.id)}
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback>{member.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{member.full_name}</span>
                {member.is_online && (
                  <Badge variant="secondary" className="ml-auto">Online</Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {selectedRecipient 
              ? `Chat with ${teamMembers.find(m => m.id === selectedRecipient)?.full_name || 'Unknown'}`
              : 'General Team Chat'
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4 border rounded-lg mb-4">
            <div className="space-y-4">
              {messages
                .filter(msg => 
                  !selectedRecipient || 
                  msg.sender_id === selectedRecipient || 
                  msg.recipient_id === selectedRecipient ||
                  msg.sender_id === currentUser?.id
                )
                .map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === currentUser?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {message.sender_id !== currentUser?.id && (
                      <p className="text-xs font-semibold mb-1">{message.sender_name}</p>
                    )}
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};