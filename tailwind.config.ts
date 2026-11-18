import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { roam: { bg:'var(--roam-bg)',surface:'var(--roam-surface)',raised:'var(--roam-raised)',cream:'var(--roam-cream)',orange:'var(--roam-orange)',blue:'var(--roam-blue)',green:'var(--roam-green)',amber:'var(--roam-amber)',red:'var(--roam-red)' } }, fontFamily:{sans:['DM Sans','Arial','sans-serif']}, borderRadius:{'4xl':'2rem'} } }, plugins: [] };
export default config;
