import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CloakWriter AI - #1 Free AI Humanizer',
    short_name: 'CloakWriter',
    description: 'Transform AI-generated text from ChatGPT, Claude, and Gemini into natural human writing. Bypass Turnitin, ZeroGPT, and CopyLeaks.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090a0f',
    theme_color: '#090a0f',
    icons: [
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
