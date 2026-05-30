import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
 
interface Props { searchParams: { token?: string } }
 
export const metadata = { title: 'Unsubscribe — DevTrack' };
 
export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = searchParams;
  let success = false;
 
  if (token) {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ digest_enabled: false })
      .eq('digest_unsubscribe_token', token);
    if (!error) success = true;
  }
 
  return (
    <main className='flex min-h-screen items-center justify-center
                     bg-gray-50 px-4'>
      <div className='w-full max-w-md rounded-xl border border-gray-200
                      bg-white p-8 text-center shadow-sm'>
        <div className='mb-4 text-4xl'>{success ? '✅' : '❌'}</div>
        <h1 className='mb-2 text-lg font-semibold text-gray-900'>
          {success ? 'You have been unsubscribed' : 'Invalid link'}
        </h1>
        <p className='mb-6 text-sm text-gray-500'>
          {success
            ? 'You will no longer receive weekly digest emails. Re-enable anytime in Settings.'
            : 'This unsubscribe link is invalid or has already been used.'}
        </p>
        <Link href='/dashboard'
          className='inline-block rounded-lg bg-blue-600 px-5 py-2.5
                     text-sm font-medium text-white hover:bg-blue-700'>
          Go to Dashboard
        </Link>
        {success && (
          <p className='mt-4 text-xs text-gray-400'>
            Changed your mind?{' '}
            <Link href='/settings'
              className='text-blue-600 hover:underline'>
              Re-enable in Settings
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
