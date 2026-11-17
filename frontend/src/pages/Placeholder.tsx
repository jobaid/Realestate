import { useHead } from '../lib/head';

export default function Placeholder({ title }: { title: string }) {
  const isNotFound = title.toLowerCase().includes('not found');
  useHead({
    title,
    robots: isNotFound ? 'noindex,nofollow' : 'index,follow',
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-3 text-navy-500">
        {isNotFound ? "The page you're looking for isn't here." : 'This page ships in a later phase.'}
      </p>
    </div>
  );
}
