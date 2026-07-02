

/**
 * LectureTable: Standard table for educational content with highlighting support.
 */
export function LectureTable({ title, headers, rows, highlightColumns = [] }: any) {
  return (
    <div style={{ overflowX: 'auto', margin: '2.5rem 0', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem', backgroundColor: '#ffffff' }}>
        {title && (
          <caption style={{ padding: '1.25rem 1.5rem', fontWeight: '700', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#1e293b', textAlign: 'left', fontSize: '1.1rem' }}>
            {title}
          </caption>
        )}
        <thead style={{ backgroundColor: '#f1f5f9' }}>
          <tr>
            {headers?.map((h: any, i: number) => (
              <th key={i} style={{ padding: '1rem 1.5rem', borderBottom: '2px solid #e2e8f0', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((r: any, i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
              {r.map((c: any, j: number) => (
                <td
                  key={j}
                  style={{
                    padding: '1rem 1.5rem',
                    color: '#334155',
                    lineHeight: '1.6',
                    backgroundColor: highlightColumns.includes(j) ? '#eff6ff' : 'transparent',
                    fontWeight: highlightColumns.includes(j) ? '500' : '400',
                  }}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * LectureProcess: Visual steps for processes or evolution.
 */
export function LectureProcess({ title, steps }: any) {
  return (
    <div style={{ margin: '2.5rem 0', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      {title && <h4 style={{ marginTop: 0, marginBottom: '2rem', color: '#0f172a', fontSize: '1.25rem', fontWeight: '700', textAlign: 'center' }}>{title}</h4>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
        {steps?.map((step: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: '1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', zIndex: 1, boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}>
                {i + 1}
              </div>
              {i < steps.length - 1 && <div style={{ width: '2px', flexGrow: 1, backgroundColor: '#bfdbfe', margin: '0.5rem 0' }}></div>}
            </div>
            <div style={{ paddingBottom: i < steps.length - 1 ? '1.5rem' : 0 }}>
              <strong style={{ color: '#1e293b', display: 'block', fontSize: '1.05rem', marginBottom: '0.4rem' }}>{step.label}</strong>
              <p style={{ margin: 0, color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem' }}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Fallback components that look better than basic placeholders.
 */
export function LecturePieChart({ title }: any) {
  return (
    <div style={{ padding: '3rem 2rem', backgroundColor: '#f8fafc', borderRadius: '1rem', textAlign: 'center', color: '#64748b', border: '2px dashed #cbd5e1', margin: '2.5rem 0' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⭕</div>
      <div style={{ fontWeight: '600', color: '#1e293b' }}>Pie Chart: {title || 'Data Visualization'}</div>
      <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>(Please use &lt;PieChart /&gt; for actual rendering)</div>
    </div>
  );
}

export function LectureBarChart({ title }: any) {
  return (
    <div style={{ padding: '3rem 2rem', backgroundColor: '#f8fafc', borderRadius: '1rem', textAlign: 'center', color: '#64748b', border: '2px dashed #cbd5e1', margin: '2.5rem 0' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
      <div style={{ fontWeight: '600', color: '#1e293b' }}>Bar Chart: {title || 'Data Visualization'}</div>
      <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>(Please use &lt;BarChart /&gt; for actual rendering)</div>
    </div>
  );
}