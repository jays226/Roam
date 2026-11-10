import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { roam: { bg:'#16181C',surface:'#22252B',raised:'#2B2F36',cream:'#E9E3D8',orange:'#F59A3C',blue:'#2E6E8E',green:'#3DDC97',amber:'#F5C04A',red:'#E5484D' } }, fontFamily:{sans:['Arial','sans-serif']}, borderRadius:{'4xl':'2rem'} } }, plugins: [] };
export default config;
