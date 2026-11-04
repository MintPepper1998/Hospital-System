export default function MasterFinanceLoading() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded-lg" />
      <div className="h-4 w-48 bg-slate-100 rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-36">
            <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
            <div className="h-7 w-32 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-52" />
        ))}
      </div>
    </div>
  )
}
