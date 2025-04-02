import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createUser, deleteUser, updateUser } from '@/lib/actions/user.actions';
import { clerkClient } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error('WEBHOOK_SECRET is missing. Please add it to .env or .env.local');
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing Svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ Error verifying webhook:', err);
    return new Response('Invalid webhook signature', { status: 400 });
  }

  const eventType = evt.type;
  if (eventType.startsWith('session.')) {
    console.log(`ℹ️ Ignoring session event: ${eventType}`);
    return new Response('Ignored', { status: 200 });
  }

  try {
    if (eventType === 'user.created') {
      const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;
      if (!first_name || !last_name) {
        console.error('❌ Error: Missing firstName or lastName in Clerk event data');
        return NextResponse.json({ message: 'Missing firstName or lastName' }, { status: 400 });
      }

      const user = {
        clerkId: id,
        email: email_addresses?.[0]?.email_address || '',
        username: username || `user_${id}`,
        firstName: first_name,
        lastName: last_name,
        photo: image_url || '',
      };

      const newUser = await createUser(user);

      if (newUser) {
        await clerkClient.users.updateUserMetadata(id, {
          publicMetadata: { userId: newUser._id },
        });
      }

      return NextResponse.json({ message: 'User created successfully', user: newUser });
    }

    if (eventType === 'user.updated') {
      const { id, image_url, first_name, last_name, username } = evt.data;
      const user = {
        firstName: first_name || '',
        lastName: last_name || '',
        username: username || '',
        photo: image_url || '',
      };

      const updatedUser = await updateUser(id, user);
      return NextResponse.json({ message: 'User updated successfully', user: updatedUser });
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;
      if (!id) {
        console.error('❌ Error: User ID is missing in deletion event');
        return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
      }
      const deletedUser = await deleteUser(id);
      return NextResponse.json({ message: 'User deleted successfully', user: deletedUser });
    }

    return new Response('Unhandled event type', { status: 400 });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
