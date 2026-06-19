import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'a-very-secure-32-character-secret-key-dairy-default-key';

export interface MemberSession {
  memberId: number;
  memberCode: string;
}

export function signSession(payload: MemberSession): string {
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, signature })).toString('base64');
}

export function verifySession(token: string): MemberSession | null {
  try {
    const decodedStr = Buffer.from(token, 'base64').toString('utf8');
    const { data, signature } = JSON.parse(decodedStr);
    
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    
    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (sigBuffer.length === expBuffer.length && crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return JSON.parse(data) as MemberSession;
    }
  } catch (error) {
    // Return null on parsing or verification failure
  }
  return null;
}
