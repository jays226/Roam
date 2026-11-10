import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { metadataBase:new URL(process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'),title:'Roam — From group chat to getaway', description:'Get the whole crew from “I’m down” to locked in.', manifest:'/manifest.webmanifest' };
export const viewport: Viewport = {themeColor:'#16181C'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
