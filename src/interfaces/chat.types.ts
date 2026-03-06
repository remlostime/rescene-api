export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Proposal {
  title: string;
  description: string;
  nano_prompt: string;
}

export interface ChatRequest {
  imageId: string;
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  type: 'chat_reply' | 'proposal_card';
  text: string;
  proposal?: Proposal;
}
