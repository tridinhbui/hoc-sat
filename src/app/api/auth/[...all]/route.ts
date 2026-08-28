import { getAuth } from "@/lib/auth";

async function handler(req: Request) {
  const auth = await getAuth();
  return auth.handler(req);
}

export const GET = handler;
export const POST = handler;
