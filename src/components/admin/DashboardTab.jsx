import React from 'react'
import { BarChart3, Users, CheckSquare, BookOpen, Trash2, Download } from 'lucide-react'
import { useStore } from '../../hooks/useStore'

/**
 * Admin dashboard — shows completion stats and personality distribution.
 */
export default function DashboardTab({ questions }) {
  const [results, setResults] = useStore('safe_results', [])
  const dist    = {}
  results.forEach(r => { dist[r.type] = (dist[r.type] || 0) + 1 })
  const total = results.length || 1

  const stats = [
    { label: 'Assessments Completed', value: results.length,                                  icon: Users,        color: 'text-sky bg-sky/10 border-sky/20' },
    { label: 'Total Questions',        value: questions.length,                                icon: BookOpen,     color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { label: 'Active Questions',       value: questions.filter(q => q.active).length,          icon: CheckSquare,  color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  ]

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this participant record?')) {
      setResults(results.filter(r => r.id !== id))
    }
  }

  const handleExportCSV = () => {
    if (!results || results.length === 0) return

    const headers = [
      'Date',
      'Name',
      'Time Taken',
      'Organization',
      'Location',
      'Gender',
      'Date of Birth',
      'Phone Number',
      'Email Id',
      'Result Code',
      'Personality Type'
    ]

    const rows = results.map(r => {
      const date = r.date ? new Date(r.date).toLocaleDateString() : ''
      const name = r.user?.['Name'] || r.user?.['Full Name'] || ''
      const timeTaken = r.timeSpent || r.user?.['Time Taken'] || ''
      const org = r.user?.['Name of the Organization'] || ''
      const loc = r.user?.['Location'] || ''
      const gender = r.user?.['Gender'] || ''
      const dob = r.user?.['Date of Birth'] || ''
      const phone = r.user?.['Phone Number'] || ''
      const email = r.user?.['Email Id'] || r.user?.['Email'] || ''
      const code = r.code || ''
      const type = r.type || ''

      return [
        `"${date}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${timeTaken.replace(/"/g, '""')}"`,
        `"${org.replace(/"/g, '""')}"`,
        `"${loc.replace(/"/g, '""')}"`,
        `"${gender.replace(/"/g, '""')}"`,
        `"${dob.replace(/"/g, '""')}"`,
        `"${phone.replace(/"/g, '""')}"`,
        `"${email.replace(/"/g, '""')}"`,
        `"${code.replace(/"/g, '""')}"`,
        `"${type.replace(/"/g, '""')}"`
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `safe_assessment_participants_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-7">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="font-heading font-bold text-2xl text-slate-800">{value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Distribution */}
      {results.length > 0 ? (
        <div className="space-y-10">
          <div>
            <h3 className="font-heading font-bold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky" /> Personality Distribution
            </h3>
            <div className="space-y-2.5">
              {Object.entries(dist)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-bold text-slate-600 shrink-0">{type}</span>
                    <div className="flex-1 h-7 bg-slate-100 rounded-xl overflow-hidden">
                      <div
                        className="h-full rounded-xl flex items-center pl-3 text-xs text-white font-bold"
                        style={{
                          width: `${(count / total) * 100}%`,
                          minWidth: '3rem',
                          background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)',
                        }}
                      >
                        {count}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Recent Participants Table */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading font-bold text-slate-700 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" /> Recent Participants ({results.length})
              </h3>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Download all participant details as CSV"
              >
                <Download className="w-4 h-4" /> Download CSV
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Participant Details</th>
                      <th className="px-4 py-3 font-semibold">Result</th>
                      <th className="px-4 py-3 font-semibold w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.slice().reverse().map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap align-top">
                          {new Date(r.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-bold text-slate-800 mb-1">
                            {r.user?.['Full Name'] || r.user?.['Email'] || 'Anonymous'}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {Object.entries(r.user || {})
                              .filter(([k, v]) => v && k !== 'Full Name')
                              .map(([k, v]) => (
                                <span key={k} className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {k}: <strong className="text-slate-600">{v}</strong>
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-sky/10 text-sky font-bold text-xs mt-0.5">
                            {r.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-14 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No assessments completed yet.</p>
          <p className="text-sm mt-1">Data will appear here once participants finish the assessment.</p>
        </div>
      )}
    </div>
  )
}
