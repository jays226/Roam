import {NextResponse} from 'next/server';import {endSession} from '@/lib/session';
export async function POST(){const response=NextResponse.json({ok:true});await endSession(response);return response}
