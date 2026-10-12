import React, { useState } from 'react'
import { ArrowRight, User } from 'lucide-react'
import Shell  from '../layout/Shell'
import Button from '../ui/Button'

/**
 * Pre-assessment info form.
 * Hardcoded fields as requested: Name, Organization, Location, Gender, DOB, Phone, Email
 */
export default function InfoForm({ initialData, onHome, onContinue, user, onLogout }) {
  const [formData, setFormData] = useState({
    'Name': initialData?.['Name'] || '',
    'Name of the Organization': initialData?.['Name of the Organization'] || '',
    'Location': initialData?.['Location'] || '',
    'Gender': initialData?.['Gender'] || '',
    'Date of Birth': initialData?.['Date of Birth'] || '',
    'Phone Number': initialData?.['Phone Number'] || '',
    'Email Id': initialData?.['Email Id'] || ''
  })
  
  const [error, setError] = useState('')

  const update = (key, val) => setFormData(prev => ({ ...prev, [key]: val }))

  const updatePhone = (val) => {
    // Only allow digits and cap at 10 digits
    const cleaned = val.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, 'Phone Number': cleaned }))
  }

  const handleContinue = () => {
    // Check if all fields are filled
    const allFilled = Object.values(formData).every(val => val.trim() !== '')
    if (!allFilled) {
      setError('Please fill out all required fields before continuing.')
      return
    }
    
    // Validate Phone Number: must be exactly 10 digits
    if (formData['Phone Number'].length !== 10) {
      setError('Phone number must be exactly 10 digits.')
      return
    }

    // Validate Date of Birth: cannot be in the future
    const selectedDob = new Date(formData['Date of Birth'])
    if (isNaN(selectedDob.getTime()) || selectedDob > new Date()) {
      setError('Please select a valid Date of Birth.')
      return
    }

    // Format YYYY-MM-DD to DD/MM/YYYY for consistency
    let finalData = { ...formData }
    const parts = finalData['Date of Birth'].split('-')
    if (parts.length === 3) {
      finalData['Date of Birth'] = `${parts[2]}/${parts[1]}/${parts[0]}`
    }

    setError('')
    onContinue(finalData)
  }

  return (
    <Shell onHome={onHome} user={user} onLogout={onLogout}>
      <div className="max-w-lg mx-auto pt-6 sm:pt-8 slide-up mb-10 px-1 sm:px-0">
        <div className="glass p-5 sm:p-8 md:p-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-7">
            <div className="w-12 h-12 bg-sky/10 border border-sky/20 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-sky" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-2xl text-navy leading-tight">Before We Begin</h2>
              <p className="text-slate-500 text-sm mt-0.5">Please provide your details below</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name *</label>
              <input type="text" value={formData['Name']} onChange={e => update('Name', e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky transition-colors bg-white" placeholder="Enter your full name" />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name of the Organization *</label>
              <input type="text" value={formData['Name of the Organization']} onChange={e => update('Name of the Organization', e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky transition-colors bg-white" placeholder="Enter your organization" />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location *</label>
              <input type="text" value={formData['Location']} onChange={e => update('Location', e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky transition-colors bg-white" placeholder="Enter your city or location" />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender *</label>
              <select value={formData['Gender']} onChange={e => update('Gender', e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky transition-colors bg-white">
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of Birth *</label>
              <input 
                type="date" 
                max={new Date().toISOString().split('T')[0]}
                value={formData['Date of Birth']} 
                onChange={e => update('Date of Birth', e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky transition-colors bg-white" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number *</label>
              <input 
                type="tel" 
                maxLength={10}
                value={formData['Phone Number']} 
                onChange={e => updatePhone(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky transition-colors bg-white" 
                placeholder="Enter 10-digit phone number" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Id *</label>
              <input type="email" value={formData['Email Id']} onChange={e => update('Email Id', e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky transition-colors bg-white" placeholder="Enter your email address" />
            </div>
          </div>
          
          {error && (
            <p className="text-red-500 text-sm mb-4 font-semibold text-center">
              {error}
            </p>
          )}

          <Button
            id="continue-btn"
            variant="navy"
            size="md"
            className="w-full justify-center text-base"
            onClick={handleContinue}
            iconRight={<ArrowRight className="w-5 h-5" />}
          >
            Continue to Assessment
          </Button>
        </div>
      </div>
    </Shell>
  )
}
