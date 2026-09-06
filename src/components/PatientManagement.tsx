import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  ChevronRight,
  Pill,
  FileText,
  Activity,
  HeartPulse,
  Clock,
  Phone,
  Mail,
  Calendar,
  Plus,
  CheckCircle2,
  X,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';
import { PatientRecord, PrescriptionItem, DoctorNoteItem, AppointmentItem } from '../types';

interface PatientManagementProps {
  onOpenNewPatientModal: () => void;
  selectedPatientId?: string | null;
}

export const PatientManagement: React.FC<PatientManagementProps> = ({
  onOpenNewPatientModal,
  selectedPatientId,
}) => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'under_observation' | 'discharged'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Active sub-tab inside selected patient: 'overview' | 'notes' | 'prescriptions'
  const [patientTab, setPatientTab] = useState<'overview' | 'notes' | 'prescriptions'>('overview');

  // Sub-items for selected patient
  const [notes, setNotes] = useState<DoctorNoteItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingPrescription, setIsAddingPrescription] = useState(false);

  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [clinicalImpression, setClinicalImpression] = useState('');

  // Prescription form state
  const [rxName, setRxName] = useState('');
  const [rxDosage, setRxDosage] = useState('');
  const [rxFrequency, setRxFrequency] = useState('Once daily');
  const [rxDuration, setRxDuration] = useState('7 days');
  const [rxInstructions, setRxInstructions] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('medtrack_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/patients', { headers });
      if (res.ok) {
        const data = await res.json();
        const list: PatientRecord[] = data.patients || [];
        setPatients(list);

        if (selectedPatientId) {
          const found = list.find((p) => p.id === selectedPatientId);
          if (found) setSelectedPatient(found);
        } else if (list.length > 0 && !selectedPatient) {
          setSelectedPatient(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientSubData(selectedPatient.id);
    }
  }, [selectedPatient]);

  const fetchPatientSubData = async (patientId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('medtrack_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const [notesRes, rxRes] = await Promise.all([
        fetch('/api/doctor-notes', { headers }),
        fetch('/api/prescriptions', { headers }),
      ]);

      if (notesRes.ok) {
        const nData = await notesRes.json();
        const filtered = (nData.notes || []).filter((n: any) => n.patient_id === patientId || n.patientId === patientId);
        setNotes(filtered);
      }

      if (rxRes.ok) {
        const rData = await rxRes.json();
        const filtered = (rData.prescriptions || []).filter((r: any) => r.patient_id === patientId || r.patientId === patientId);
        setPrescriptions(filtered);
      }
    } catch (err) {
      console.error('Failed to load patient sub-records:', err);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !noteContent.trim()) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('medtrack_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/doctor-notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          patientId: selectedPatient.id,
          title: noteTitle.trim() || 'Clinical Encounter Note',
          content: noteContent.trim(),
          clinicalImpression: clinicalImpression.trim() || null,
        }),
      });

      if (res.ok) {
        setNoteTitle('');
        setNoteContent('');
        setClinicalImpression('');
        setIsAddingNote(false);
        fetchPatientSubData(selectedPatient.id);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !rxName.trim() || !rxDosage.trim()) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('medtrack_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          patientId: selectedPatient.id,
          patientName: selectedPatient.fullName,
          medicationName: rxName.trim(),
          dosage: rxDosage.trim(),
          frequency: rxFrequency,
          duration: rxDuration,
          instructions: rxInstructions.trim() || null,
        }),
      });

      if (res.ok) {
        setRxName('');
        setRxDosage('');
        setRxInstructions('');
        setIsAddingPrescription(false);
        fetchPatientSubData(selectedPatient.id);
      }
    } catch (err) {
      console.error('Failed to save prescription:', err);
    }
  };

  // Filtered patients list
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.phone && p.phone.includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="patient-management-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            Patient Records & Clinical Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain longitudinal patient records, vitals, clinical progress notes, and prescriptions.
          </p>
        </div>

        <button
          id="add-patient-open-modal-btn"
          onClick={onOpenNewPatientModal}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Main Grid: Left List (1 col), Right Details (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient Directory */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col h-[680px]">
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white"
            />
          </div>

          {/* Status Filters */}
          <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar pb-1">
            {(['all', 'active', 'under_observation', 'discharged'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* List or Empty State */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="text-center py-12 text-xs text-slate-400">Loading patients...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-16 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-4">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Patients Found</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {searchQuery ? 'Try adjusting your search query.' : 'Register your first patient to start.'}
                </p>
              </div>
            ) : (
              filteredPatients.map((patient) => {
                const isSelected = selectedPatient?.id === patient.id;
                return (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500/60 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center">
                          {patient.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {patient.fullName}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {patient.age} yrs • {patient.gender} • {patient.bloodGroup || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                          patient.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {patient.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Patient Clinical Detail (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col h-[680px]">
          {selectedPatient ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Patient Top Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-bold text-lg flex items-center justify-center shadow-md">
                    {selectedPatient.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {selectedPatient.fullName}
                      <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 capitalize">
                        {selectedPatient.status.replace('_', ' ')}
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>Age: {selectedPatient.age}</span>
                      <span>•</span>
                      <span>Gender: {selectedPatient.gender}</span>
                      <span>•</span>
                      <span>Blood Group: {selectedPatient.bloodGroup || 'Not specified'}</span>
                      {selectedPatient.phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedPatient.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPatientTab('notes');
                      setIsAddingNote(true);
                    }}
                    className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Note
                  </button>
                  <button
                    onClick={() => {
                      setPatientTab('prescriptions');
                      setIsAddingPrescription(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Rx
                  </button>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 pt-3 gap-6 text-xs">
                <button
                  onClick={() => setPatientTab('overview')}
                  className={`pb-2.5 font-semibold transition-colors relative ${
                    patientTab === 'overview'
                      ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Clinical Baseline & Vitals
                </button>
                <button
                  onClick={() => setPatientTab('notes')}
                  className={`pb-2.5 font-semibold transition-colors relative ${
                    patientTab === 'notes'
                      ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Doctor Progress Notes ({notes.length})
                </button>
                <button
                  onClick={() => setPatientTab('prescriptions')}
                  className={`pb-2.5 font-semibold transition-colors relative ${
                    patientTab === 'prescriptions'
                      ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Prescriptions & Medications ({prescriptions.length})
                </button>
              </div>

              {/* Tab Content Area */}
              <div className="flex-1 overflow-y-auto py-4 pr-1">
                {/* 1. OVERVIEW TAB */}
                {patientTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Vitals Cards */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                        <HeartPulse className="w-4 h-4 text-rose-500" />
                        Recorded Vitals
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-400 font-medium">Blood Pressure</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedPatient.vitals?.bloodPressure || '120/80 mmHg'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-400 font-medium">Heart Rate</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedPatient.vitals?.heartRate ? `${selectedPatient.vitals.heartRate} bpm` : '72 bpm'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-400 font-medium">Glucose (Fasting)</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedPatient.vitals?.glucoseLevel || '95 mg/dL'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-400 font-medium">Oxygen Saturation</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {selectedPatient.vitals?.oxygenSaturation || '98% SpO2'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Medical History */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Medical History & Chronic Conditions
                      </h4>
                      {selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPatient.medicalHistory.map((cond, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {cond}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No prior chronic conditions recorded.</p>
                      )}
                    </div>

                    {/* Allergies & Medications */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
                        <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Known Allergies
                        </h4>
                        {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPatient.allergies.map((allergy, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              >
                                {allergy}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400">No known drug/food allergies.</p>
                        )}
                      </div>

                      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                        <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5" />
                          Active Medications
                        </h4>
                        {selectedPatient.currentMedications && selectedPatient.currentMedications.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPatient.currentMedications.map((med, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 text-xs text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              >
                                {med}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400">No current medications listed.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. NOTES TAB */}
                {patientTab === 'notes' && (
                  <div className="space-y-4">
                    {isAddingNote && (
                      <form
                        onSubmit={handleSaveNote}
                        className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-teal-500/40 space-y-3 animate-in fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            New Clinical Encounter Note
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsAddingNote(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Note Title (e.g. Routine Hypertension Follow-up)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                        />
                        <textarea
                          required
                          rows={4}
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Document subjective symptoms, objective exam observations, and clinical assessment..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                        />
                        <input
                          type="text"
                          value={clinicalImpression}
                          onChange={(e) => setClinicalImpression(e.target.value)}
                          placeholder="Clinical Impression & Treatment Plan (e.g. Stable BP, continue lifestyle changes)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingNote(false)}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Save Clinical Note
                          </button>
                        </div>
                      </form>
                    )}

                    {notes.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">No Clinical Notes Yet</p>
                        <p className="mt-0.5 text-slate-400">Document your observations and encounter assessments.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((note) => (
                          <div
                            key={note.id}
                            className="p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white">{note.title}</h5>
                              <span className="text-[10px] text-slate-400">
                                {new Date(note.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {note.content}
                            </p>
                            {note.clinicalImpression && (
                              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                                Impression: {note.clinicalImpression}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. PRESCRIPTIONS TAB */}
                {patientTab === 'prescriptions' && (
                  <div className="space-y-4">
                    {isAddingPrescription && (
                      <form
                        onSubmit={handleSavePrescription}
                        className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-emerald-500/40 space-y-3 animate-in fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Issue New Prescription
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsAddingPrescription(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            value={rxName}
                            onChange={(e) => setRxName(e.target.value)}
                            placeholder="Medication Name (e.g. Amoxicillin)"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          />
                          <input
                            type="text"
                            required
                            value={rxDosage}
                            onChange={(e) => setRxDosage(e.target.value)}
                            placeholder="Dosage (e.g. 500mg)"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={rxFrequency}
                            onChange={(e) => setRxFrequency(e.target.value)}
                            placeholder="Frequency (e.g. Twice daily with meals)"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          />
                          <input
                            type="text"
                            value={rxDuration}
                            onChange={(e) => setRxDuration(e.target.value)}
                            placeholder="Duration (e.g. 10 days)"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                          />
                        </div>
                        <input
                          type="text"
                          value={rxInstructions}
                          onChange={(e) => setRxInstructions(e.target.value)}
                          placeholder="Special Instructions (e.g. Finish entire course, drink plenty of water)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingPrescription(false)}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Authorize Prescription
                          </button>
                        </div>
                      </form>
                    )}

                    {prescriptions.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">No Prescriptions On File</p>
                        <p className="mt-0.5 text-slate-400">Issue medications with dosage and frequency instructions.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {prescriptions.map((rx) => (
                          <div
                            key={rx.id}
                            className="p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between"
                          >
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Pill className="w-3.5 h-3.5 text-emerald-600" />
                                {rx.medicationName} — {rx.dosage}
                              </h5>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                                {rx.frequency} • Duration: {rx.duration}
                              </p>
                              {rx.instructions && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1">
                                  "{rx.instructions}"
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 capitalize">
                              {rx.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Patient Selected</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Select a patient from the registry on the left to inspect clinical encounters, vitals, and issue prescriptions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
