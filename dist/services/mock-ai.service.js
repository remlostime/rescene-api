"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAIService = void 0;
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
}
exports.MockAIService = MockAIService;
//# sourceMappingURL=mock-ai.service.js.map