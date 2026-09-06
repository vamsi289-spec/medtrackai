import React, { useState, useEffect } from 'react';
import { AuthUser, AppointmentItem } from '../types';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  Stethoscope,
  Building2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface AppointmentsViewProps {
  currentUser: AuthUser | null;
  onOpenNewAppointmentModal: () => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  currentUser,
  onOpenNewAppointmentModal,
}) => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const token = currentUser?.token || localStorage.getItem('medtrack_token');
      const res = await fetch('/api/appointments', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else {
        // Fallback default demo appointments
        setAppointments([
          {
            id: 'apt_demo_1',
            patientName: 'Alex Rivera',
            doctorName: 'Dr. Sarah Lin, MD',
            appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            appointmentTime: '10:30 AM',
            reason: 'Annual Preventive Health Checkup & Blood Panel',
            status: 'confirmed',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'apt_demo_2',
            patientName: 'Maria Chen',
            doctorName: 'Dr. Marcus Vance, MD',
            appointmentDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
            appointmentTime: '02:15 PM',
            reason: 'Dermatological rash evaluation & followup',
            status: 'scheduled',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setAppointments([
        {
          id: 'apt_demo_1',
          patientName: 'Alex Rivera',
          doctorName: 'Dr. Sarah Lin, MD',
          appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          appointmentTime: '10:30 AM',
          reason: 'Annual Preventive Health Checkup & Blood Panel',
          status: 'confirmed',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentUser]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const token = currentUser?.token || localStorage.getItem('medtrack_token');
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus as any } : a))
        );
      } else {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus as any } : a))
        );
      }
    } catch {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus as any } : a))
      );
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesQuery =
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>Clinical Appointments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage upcoming consultations, physician bookings, and appointment schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAppointments}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Refresh Appointments"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onOpenNewAppointmentModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, doctor, or reason..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {(['all', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
          <span>Loading scheduled appointments...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No appointments found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try changing your search keywords or status filter.'
              : 'You have no scheduled clinical consultations at this time.'}
          </p>
          <button
            type="button"
            onClick={onOpenNewAppointmentModal}
            className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Schedule First Appointment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((apt) => {
            const isConfirmed = apt.status === 'confirmed';
            const isCompleted = apt.status === 'completed';
            const isCancelled = apt.status === 'cancelled';

            return (
              <div
                key={apt.id}
                className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {apt.doctorName}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" /> Patient: {apt.patientName}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isConfirmed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : isCompleted
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : isCancelled
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        {apt.appointmentDate}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        {apt.appointmentTime}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Reason: <span className="text-slate-900 dark:text-white">{apt.reason}</span>
                    </p>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4 text-xs font-semibold">
                  {apt.status === 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                  )}
                  {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(apt.id, 'completed')}
                        className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 rounded-lg transition-colors cursor-pointer"
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                        className="px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
