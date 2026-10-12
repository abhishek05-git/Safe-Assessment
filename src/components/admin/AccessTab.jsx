import React, { useState } from 'react'
import { CheckCircle2, XCircle, Clock, ShieldCheck, Trash2, Search, CheckCheck, RefreshCw, AlertTriangle, Users } from 'lucide-react'
import Button from '../ui/Button'

const APPS_SCRIPT_CODE = `function doGet(e) {
  var action = (e.parameter && e.parameter['Action']) || '';
  
  if (action === 'GET_APPROVALS') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Access_Requests');
    if (!sheet) {
      sheet = ss.insertSheet('Access_Requests');
      sheet.appendRow(['Email', 'Name', 'Organization', 'Phone', 'Status', 'RequestedAt', 'ApprovedAt']);
    }
    var rows = sheet.getDataRange().getValues();
    var approvals = {};
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (r[0]) {
        var emailKey = String(r[0]).trim().toLowerCase();
        approvals[emailKey] = {
          email: String(r[0]),
          name: String(r[1] || ''),
          org: String(r[2] || ''),
          phone: String(r[3] || ''),
          status: String(r[4] || 'pending'),
          requestedAt: r[5] ? String(r[5]) : '',
          approvedAt: r[6] ? String(r[6]) : ''
        };
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: approvals }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'REQUEST_ACCESS') {
    var email = (e.parameter['Email'] || '').trim().toLowerCase();
    var name = e.parameter['Name'] || '';
    var org = e.parameter['Organization'] || '';
    var phone = e.parameter['Phone'] || '';
    
    if (email) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('Access_Requests');
      if (!sheet) {
        sheet = ss.insertSheet('Access_Requests');
        sheet.appendRow(['Email', 'Name', 'Organization', 'Phone', 'Status', 'RequestedAt', 'ApprovedAt']);
      }
      var rows = sheet.getDataRange().getValues();
      var found = false;
      var now = new Date().toISOString();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).trim().toLowerCase() === email) {
          found = true;
          if (rows[i][4] !== 'approved') {
            sheet.getRange(i + 1, 2).setValue(name);
            sheet.getRange(i + 1, 3).setValue(org);
            sheet.getRange(i + 1, 4).setValue(phone);
            sheet.getRange(i + 1, 5).setValue('pending');
            sheet.getRange(i + 1, 6).setValue(now);
          }
          break;
        }
      }
      if (!found) {
        sheet.appendRow([email, name, org, phone, 'pending', now, '']);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Requested' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'SET_APPROVAL') {
    var email = (e.parameter['Email'] || '').trim().toLowerCase();
    var newStatus = e.parameter['Status'] || 'approved';
    
    if (email) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('Access_Requests');
      if (sheet) {
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (String(rows[i][0]).trim().toLowerCase() === email) {
            sheet.getRange(i + 1, 5).setValue(newStatus);
            sheet.getRange(i + 1, 7).setValue(newStatus === 'approved' ? new Date().toISOString() : '');
            break;
          }
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', email: email, status: newStatus }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'SAFE Assessment Google Apps Script Web App is active and secure.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var action = (e.parameter && e.parameter['Action']) || '';
  
  if (action === 'SEND_OTP') {
    var email = e.parameter['Email'] || '';
    var name = e.parameter['Name'] || 'Participant';
    var otp = e.parameter['OTP'] || '';
    if (email) {
      MailApp.sendEmail({
        to: email,
        subject: "Your SAFE Ltd. Assessment OTP",
        htmlBody: "Hello " + name + ",<br><br>Your verification code to start the assessment is: <b>" + otp + "</b><br><br>Thank you!"
      });
    }
    return ContentService.createTextOutput("OTP Sent").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'SAVE_RESULT') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Results') || ss.getActiveSheet();
    var date = e.parameter['Date'] || '';
    var name = e.parameter['Name'] || '';
    var org = e.parameter['Organization'] || '';
    var loc = e.parameter['Location'] || '';
    var gender = e.parameter['Gender'] || '';
    var dob = e.parameter['DOB'] || '';
    var phone = e.parameter['Phone'] || '';
    var email = e.parameter['Email'] || '';
    var code = e.parameter['Result Code'] || '';
    var type = e.parameter['Personality Type'] || '';
    sheet.appendRow([date, name, org, loc, gender, dob, phone, email, code, type]);
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  }

  return doGet(e);
}`

/**
 * AccessTab:
 * Admin interface to approve or revoke candidate access to the assessment.
 */
export default function AccessTab({ approvals = {}, setApprovals, googleSheetUrl }) {
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'approved'
  const [search, setSearch] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const list = Object.values(approvals || {})

  const pendingCount = list.filter(item => item.status !== 'approved').length
  const approvedCount = list.filter(item => item.status === 'approved').length

  const filteredList = list.filter(item => {
    if (filter === 'pending' && item.status === 'approved') return false
    if (filter === 'approved' && item.status !== 'approved') return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = (item.name || '').toLowerCase().includes(q)
      const matchEmail = (item.email || '').toLowerCase().includes(q)
      const matchOrg = (item.org || '').toLowerCase().includes(q)
      const matchPhone = (item.phone || '').toLowerCase().includes(q)
      return matchName || matchEmail || matchOrg || matchPhone
    }
    return true
  }).sort((a, b) => {
    // Show pending first, then by requestedAt descending
    if (a.status !== 'approved' && b.status === 'approved') return -1
    if (a.status === 'approved' && b.status !== 'approved') return 1
    return new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0)
  })

  const notifyChange = (newApprovals) => {
    setApprovals(newApprovals)
    // Dispatch local event for same-tab reactivity
    window.dispatchEvent(new Event('safe_approval_change'))
  }

  const handleSyncCloud = async () => {
    if (!googleSheetUrl) return
    setIsSyncing(true)
    try {
      const res = await fetch(`${googleSheetUrl}?Action=GET_APPROVALS&_t=${Date.now()}`, { mode: 'cors' })
      const json = await res.json()
      if (json && json.data && typeof json.data === 'object') {
        const merged = { ...approvals }
        for (const [k, v] of Object.entries(json.data)) {
          merged[k] = { ...merged[k], ...v }
        }
        notifyChange(merged)
      }
    } catch (e) {
      console.error('Failed to sync with Google Sheets', e)
    } finally {
      setTimeout(() => setIsSyncing(false), 500)
    }
  }

  const handleApprove = (emailKey) => {
    const cur = approvals[emailKey]
    if (!cur) return
    const updated = {
      ...approvals,
      [emailKey]: {
        ...cur,
        status: 'approved',
        approvedAt: new Date().toISOString()
      }
    }
    notifyChange(updated)

    // Sync approval to Google Sheets so candidate on other device unlocks
    if (googleSheetUrl && emailKey) {
      fetch(`${googleSheetUrl}?Action=SET_APPROVAL&Email=${encodeURIComponent(emailKey)}&Status=approved`, { mode: 'cors' }).catch(() => {})
    }
  }

  const handleRevoke = (emailKey) => {
    const cur = approvals[emailKey]
    if (!cur) return
    const updated = {
      ...approvals,
      [emailKey]: {
        ...cur,
        status: 'pending',
        approvedAt: null
      }
    }
    notifyChange(updated)

    // Sync revocation to Google Sheets
    if (googleSheetUrl && emailKey) {
      fetch(`${googleSheetUrl}?Action=SET_APPROVAL&Email=${encodeURIComponent(emailKey)}&Status=pending`, { mode: 'cors' }).catch(() => {})
    }
  }

  const handleDelete = (emailKey) => {
    if (window.confirm(`Remove access request for ${approvals[emailKey]?.name || emailKey}?`)) {
      const copy = { ...approvals }
      delete copy[emailKey]
      notifyChange(copy)
    }
  }

  const handleApproveAllPending = () => {
    if (pendingCount === 0) return
    if (window.confirm(`Approve all ${pendingCount} pending candidate(s) now?`)) {
      const now = new Date().toISOString()
      const updated = { ...approvals }
      Object.keys(updated).forEach(k => {
        if (updated[k].status !== 'approved') {
          updated[k] = {
            ...updated[k],
            status: 'approved',
            approvedAt: now
          }
          if (googleSheetUrl) {
            fetch(`${googleSheetUrl}?Action=SET_APPROVAL&Email=${encodeURIComponent(k)}&Status=approved`, { mode: 'cors' }).catch(() => {})
          }
        }
      })
      notifyChange(updated)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Candidates</div>
            <div className="font-heading font-black text-2xl text-slate-800 mt-1">{list.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-700 uppercase">Pending Approval</div>
            <div className="font-heading font-black text-2xl text-amber-900 mt-1">{pendingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-700 uppercase">Approved to Test</div>
            <div className="font-heading font-black text-2xl text-emerald-900 mt-1">{approvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search candidate or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-sky"
            />
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'all' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({list.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'pending' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'approved' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Approved ({approvedCount})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {googleSheetUrl && (
            <button
              onClick={handleSyncCloud}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold border border-sky-200 transition-all cursor-pointer disabled:opacity-50"
              title="Pull latest requests directly from Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Cloud'}
            </button>
          )}

          <button
            onClick={() => setShowSetupGuide(!showSetupGuide)}
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            📋 Setup Guide
          </button>

          {pendingCount > 0 && (
            <button
              onClick={handleApproveAllPending}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" /> Approve All Pending ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Setup Guide */}
      {showSetupGuide && (
        <div className="p-5 bg-sky-50/80 border border-sky-200 rounded-2xl text-left space-y-3 slide-up">
          <div className="flex justify-between items-center">
            <h4 className="font-heading font-bold text-sky-950 text-sm flex items-center gap-2">
              ☁️ How Cross-Device Google Sheets Approval Works
            </h4>
            <button
              onClick={() => {
                navigator.clipboard.writeText(APPS_SCRIPT_CODE)
                setCopySuccess(true)
                setTimeout(() => setCopySuccess(false), 2500)
              }}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              {copySuccess ? '✓ Copied Code!' : 'Copy Apps Script Code'}
            </button>
          </div>
          <p className="text-xs text-sky-900 leading-relaxed">
            When candidates and admins are on different devices (e.g. deployed on Vercel), they sync in real-time through your connected Google Sheet. 
            To enable cross-device approval:
          </p>
          <ol className="text-xs text-sky-900 list-decimal list-inside space-y-1 bg-white/70 p-3.5 rounded-xl border border-sky-100">
            <li>Open your Google Sheet &rarr; Click <strong>Extensions</strong> &rarr; <strong>Apps Script</strong>.</li>
            <li>Replace the code with the updated script (click <strong>Copy Apps Script Code</strong> above).</li>
            <li>Click <strong>Deploy</strong> &rarr; <strong>Manage deployments</strong> &rarr; Click the <strong>Pencil (Edit)</strong> icon &rarr; Under Version choose <strong>New version</strong> &rarr; Click <strong>Deploy</strong>.</li>
          </ol>
        </div>
      )}

      {/* Candidates List Table */}
      {filteredList.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">Candidate Details</th>
                  <th className="px-4 py-3 font-semibold">Organization / Phone</th>
                  <th className="px-4 py-3 font-semibold">Requested At</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Access Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(item => {
                  const isAppr = item.status === 'approved'
                  const emailKey = (item.email || '').toLowerCase()
                  const reqTime = item.requestedAt ? new Date(item.requestedAt).toLocaleString() : '—'
                  const apprTime = item.approvedAt ? new Date(item.approvedAt).toLocaleTimeString() : null

                  return (
                    <tr key={emailKey} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-bold text-slate-800 text-sm">
                          {item.name || 'Anonymous Candidate'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {item.email}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle text-xs text-slate-600">
                        <div>{item.org || '—'}</div>
                        {item.phone && <div className="text-slate-400 mt-0.5">{item.phone}</div>}
                      </td>

                      <td className="px-4 py-3.5 align-middle text-xs text-slate-500 whitespace-nowrap">
                        <div>{reqTime}</div>
                        {isAppr && apprTime && (
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            Approved at {apprTime}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        {isAppr ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            Awaiting Approval
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAppr ? (
                            <button
                              onClick={() => handleRevoke(emailKey)}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              title="Revoke access (candidate will be placed back on waiting screen)"
                            >
                              Revoke Access
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApprove(emailKey)}
                              className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                              title="Grant access to start test"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Approve Access
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(emailKey)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove candidate from list"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-14 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-slate-600 text-sm">
            {search ? 'No matching candidate requests found.' : 'No candidate access requests yet.'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            When candidates register and verify OTP, their requests will appear here awaiting your approval.
          </p>
        </div>
      )}
    </div>
  )
}
