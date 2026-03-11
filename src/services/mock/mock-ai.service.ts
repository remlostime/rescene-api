import type {
  IAIService,
  RemasterOptionsResponse,
} from '../../interfaces/ai-service.interface.js';
import type { ChatMessage, ChatResponse } from '../../interfaces/chat.types.js';

const ACTIONABLE_KEYWORDS = [
  'cyberpunk',
  'neon',
  'sunset',
  'golden hour',
  'rain',
  'snow',
  'noir',
  'vintage',
  'film',
  'mist',
  'fog',
];

export class MockAIService implements IAIService {
  async generateRemasterOptions(
    _sourceUri: string,
    locationName?: string,
  ): Promise<RemasterOptionsResponse> {
    const locationLabel = locationName ?? 'unknown location';

    return {
      options: [
        {
          title: 'Cinematic Golden Hour',
          description: `Bathe "${locationLabel}" in warm golden hour light with soft sunset rays across the scene for a cinematic feel.`,
          nano_prompt:
            'Keep the foreground subject completely unchanged and pixel-perfect. Do not alter the subject\'s shape, texture, color, or position. Transform the background and ambient lighting to a warm cinematic golden hour scene with soft orange and amber tones, volumetric light rays streaming from a low sun angle, gentle lens flare, and enhanced shadow depth.',
        },
        {
          title: 'Moody Mist',
          description: `Add mysterious mist to "${locationLabel}", creating a serene atmosphere with beautiful depth and layering.`,
          nano_prompt:
            'Keep the foreground subject completely unchanged and pixel-perfect. Do not alter the subject\'s shape, texture, color, or position. Add atmospheric mist and fog to the background, creating depth layers with soft desaturation. Apply cool blue-grey color grading, reduce background contrast, and add subtle volumetric haze that wraps around mid-ground elements.',
        },
        {
          title: 'Neon Cyberpunk Night',
          description: `Transform "${locationLabel}" into a neon-lit cyberpunk nightscape brimming with futuristic energy.`,
          nano_prompt:
            'Keep the foreground subject completely unchanged and pixel-perfect. Do not alter the subject\'s shape, texture, color, or position. Transform the background into a cyberpunk night scene with vivid neon lights in pink, cyan, and purple. Add reflective wet ground surfaces, glowing signage, and dramatic rim lighting on the subject edges from ambient neon sources.',
        },
      ],
    };
  }

  async chatWithAgent(
    _sourceUri: string,
    message: string,
    _history: ChatMessage[],
  ): Promise<ChatResponse> {
    const lower = message.toLowerCase();
    const isActionable = ACTIONABLE_KEYWORDS.some((kw) => lower.includes(kw));

    if (isActionable) {
      return {
        type: 'proposal_card',
        text: "Great! Based on your description, here's a proposal — see if it matches your vision:",
        proposal: {
          title: 'Cyberpunk Neon Rain',
          description:
            'Transform the photo into a cyberpunk neon rain night with vivid lights reflecting off wet surfaces for a futuristic feel.',
          nano_prompt:
            'Keep the foreground subject completely unchanged and pixel-perfect. Do not alter the subject\'s shape, texture, color, or position. Transform the background into a cyberpunk night scene with heavy rain, vivid neon lights in pink, cyan, and purple reflecting off wet asphalt. Add volumetric fog, glowing holographic signage, dramatic rim lighting from neon sources, and rain streaks with motion blur.',
        },
      };
    }

    return {
      type: 'chat_reply',
      text: "What style are you going for? Maybe cyberpunk neon, warm golden hour, or mysterious mist? Tell me more and I'll craft the perfect look!",
    };
  }
}
