'use client';

/**
 * Branded letterhead for dashboard reports (screen + print).
 *
 * @param {string} reportTitle   Main report name shown in the black bar (e.g. "STOCK REPORT")
 * @param {string[]} [metaLines] Optional lines under the title (period, filters, tab, generated time)
 * @param {string} [className]  Extra classes on the wrapper
 */
export default function ReportPageHeader({ reportTitle, metaLines = [], className = '' }) {
  const lines = (metaLines || []).filter(Boolean);
  return (
    <div className={`text-center border-b-2 border-slate-800 pb-3 mb-4 print:border-black print:mb-3 ${className}`}>
      <div className="flex items-center justify-center gap-3 mb-1">
        <img
          src="/zain-logo.png"
          alt="Zain Traders"
          className="w-12 h-12 object-contain print:w-10 print:h-10"
        />
        <div className="text-left">
          <h1 className="text-2xl font-black tracking-wider text-slate-900 leading-tight">ZAIN TRADERS</h1>
          <p className="text-xs font-bold tracking-widest text-slate-600 uppercase">MANDI BAHAUDDIN</p>
          <p className="text-xs text-slate-600 font-medium">Phalia Road , Near Aljannat Petrol pump M.B.Din. | Tel: 0302-2133218, 0347-7743218</p>
        </div>
      </div>
      <div className="mt-2 py-1.5 bg-slate-900 text-white print:bg-black">
        <h2 className="text-sm sm:text-base font-bold tracking-widest uppercase px-1">{reportTitle}</h2>
      </div>
      {lines.length > 0 && (
        <div className="mt-2 text-xs text-slate-500 space-y-0.5">
          {lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
