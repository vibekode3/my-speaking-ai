import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// 환경 변수 로드
	const env = loadEnv(mode, process.cwd(), '');
	
	return {
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		exclude: [
			'@testing-library/svelte',
			'@testing-library/jest-dom',
			'@tailwindcss/vite'
		]
	},
		// 환경 변수를 서버 사이드에서 사용할 수 있도록 설정
		define: {
			'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY)
		},
	test: {
		workspace: [
			{
				extends: './vite.config.js',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.js']
				}
			},
			{
				extends: './vite.config.js',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
	};
});
