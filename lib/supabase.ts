import { createClient } from '@supabase/supabase-js';
import type { WebSocketLikeConstructor } from '@supabase/realtime-js';
import WebSocket from 'ws';
export function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Supabase is not configured. Add the project URL and server secret key to .env.local.');return createClient(url,key,{auth:{persistSession:false},realtime:{transport:WebSocket as unknown as WebSocketLikeConstructor}})}
