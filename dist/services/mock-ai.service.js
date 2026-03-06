"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAIService = void 0;
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
class MockAIService {
    async generateRemasterOptions(_imageGcsUri, locationName) {
        const locationLabel = locationName ?? 'unknown location';
        return {
            options: [
                {
                    title: 'Cinematic Golden Hour',
                    description: `为"${locationLabel}"打造温暖的黄金时刻氛围，柔和的夕阳光线洒满整个场景，营造电影般的质感。`,
                    nano_prompt: 'Keep the foreground subject completely unchanged and pixel-perfect. Do not alter the subject\'s shape, texture, color, or position. Transform the background and ambient lighting to a warm cinematic golden hour scene with soft orange and amber tones, volumetric light rays streaming from a low sun angle, gentle lens flare, and enhanced shadow depth.',
                },
                {
                    title: 'Moody Mist',
                    description: `为"${locationLabel}"添加神秘的薄雾效果，营造出宁静而富有层次感的氛围。`,
                    nano_prompt: 'Keep the foreground subject completely unchanged and pixel-perfect. Do not alter the subject\'s shape, texture, color, or position. Add atmospheric mist and fog to the background, creating depth layers with soft desaturation. Apply cool blue-grey color grading, reduce background contrast, and add subtle volumetric haze that wraps around mid-ground elements.',
                },
                {
                    title: 'Neon Cyberpunk Night',
                    description: `将"${locationLabel}"转变为充满赛博朋克风格的霓虹夜景，科技感与未来感十足。`,
                    nano_prompt: 'Keep the foreground subject completely unchanged and pixel-perfect. Do not alter the subject\'s shape, texture, color, or position. Transform the background into a cyberpunk night scene with vivid neon lights in pink, cyan, and purple. Add reflective wet ground surfaces, glowing signage, and dramatic rim lighting on the subject edges from ambient neon sources.',
                },
            ],
        };
    }
    async chatWithAgent(_gcsUri, message, _history) {
        const lower = message.toLowerCase();
        const isActionable = ACTIONABLE_KEYWORDS.some((kw) => lower.includes(kw));
        if (isActionable) {
            return {
                type: 'proposal_card',
                text: '好的！根据你的描述，我为你准备了一个方案，看看是否符合你的期待：',
                proposal: {
                    title: 'Cyberpunk Neon Rain',
                    description: '将照片转变为充满赛博朋克风格的霓虹雨夜，霓虹灯光在湿润的地面上反射出迷幻色彩，科技感十足。',
                    nano_prompt: 'Keep the foreground subject completely unchanged and pixel-perfect. Do not alter the subject\'s shape, texture, color, or position. Transform the background into a cyberpunk night scene with heavy rain, vivid neon lights in pink, cyan, and purple reflecting off wet asphalt. Add volumetric fog, glowing holographic signage, dramatic rim lighting from neon sources, and rain streaks with motion blur.',
                },
            };
        }
        return {
            type: 'chat_reply',
            text: '你想要什么样的风格呢？比如赛博朋克霓虹风、温暖的黄金时刻、还是神秘的雾气效果？告诉我更多细节，我来帮你打造完美的画面！',
        };
    }
}
exports.MockAIService = MockAIService;
//# sourceMappingURL=mock-ai.service.js.map