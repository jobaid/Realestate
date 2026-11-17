export default function PropertyDetailsSkeleton() {
  return (
    <article className="mx-auto max-w-7xl px-4 py-8 animate-pulse">
      <div className="h-4 w-48 bg-navy-100 rounded mb-4" />
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-3 md:row-span-2 aspect-[16/10] bg-navy-100 rounded-2xl" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/3] bg-navy-100 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="h-6 w-24 bg-navy-100 rounded-full" />
          <div className="h-10 w-3/4 bg-navy-100 rounded" />
          <div className="h-4 w-1/2 bg-navy-100 rounded" />
          <div className="h-12 w-40 bg-navy-100 rounded mt-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-navy-100 rounded-xl" />
            ))}
          </div>
          <div className="h-24 bg-navy-100 rounded mt-6" />
        </div>
        <aside className="h-80 bg-navy-100 rounded-2xl" />
      </div>
    </article>
  );
}
