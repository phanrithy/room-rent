import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Languages,
  Sun,
  Moon,
  Upload,
  CheckCircle2,
  User,
  Phone,
  CreditCard,
  Mail,
  Send,
  Calendar,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { setAppLanguage } from '../i18n/index.js';
import { formatMoney } from '../utils/format.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { useToast } from '../context/ToastContext.jsx';

export function PublicApplyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { activeTheme, toggleTheme } = useTheme();
  const { showSuccess, showError } = useToast();

  const queryRoom = searchParams.get('room') || '';
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [roomDetails, setRoomDetails] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRoom, setLoadingRoom] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().slice(0, 10));
  const [idFile, setIdFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Load available rooms or room info
  useEffect(() => {
    fetch('/api/public/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data.rooms) {
          setAvailableRooms(data.rooms);
          if (queryRoom) {
            const matched = data.rooms.find(
              (r) => String(r.roomNumber) === String(queryRoom) || String(r.id) === String(queryRoom)
            );
            if (matched) {
              setSelectedRoomId(String(matched.id));
              setRoomDetails(matched);
            }
          } else if (data.rooms.length > 0) {
            setSelectedRoomId(String(data.rooms[0].id));
            setRoomDetails(data.rooms[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to load available rooms', err));
  }, [queryRoom]);

  // When room selection changes
  const handleRoomChange = (e) => {
    const id = e.target.value;
    setSelectedRoomId(id);
    const found = availableRooms.find((r) => String(r.id) === String(id));
    setRoomDetails(found || null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showError('File must be smaller than 5 MB');
        return;
      }
      setIdFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Please enter your full name');
      return;
    }
    if (!phone.trim()) {
      showError('Please enter your phone number');
      return;
    }
    if (!idNumber.trim()) {
      showError('Please enter your National ID or Passport number');
      return;
    }
    if (!selectedRoomId) {
      showError('Please select a room');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      formData.append('idNumber', idNumber.trim());
      formData.append('roomId', selectedRoomId);
      if (email.trim()) formData.append('email', email.trim());
      if (telegram.trim()) formData.append('telegramChatId', telegram.trim());
      if (moveInDate) formData.append('moveInDate', moveInDate);
      if (idFile) formData.append('idCard', idFile);

      const res = await fetch('/api/public/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit rental application');
      }

      setSubmissionResult(data);
      showSuccess('Application submitted successfully!');
    } catch (err) {
      showError(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'km' : 'en';
    setAppLanguage(next);
  };

  const copyCredentials = () => {
    if (!submissionResult) return;
    const text = `Sunrise Apartments Tenant Login:\nUsername: ${submissionResult.credentials.username}\nPassword: ${submissionResult.credentials.tempPassword}\nPortal: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    showSuccess('Credentials copied to clipboard!');
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  return (
    <div className="min-h-screen bg-app flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-2xl w-full mx-auto pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-content-primary leading-tight text-sm sm:text-base">
              Sunrise Apartments
            </h1>
            <p className="text-[11px] text-content-muted">
              {i18n.language === 'km' ? 'ពាក្យស្នើសុំជួលបន្ទប់' : 'Tenant Lease Application'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-content-primary transition-colors min-h-[36px]"
          >
            <Languages className="w-4 h-4 text-primary" />
            <span>{i18n.language === 'en' ? 'ភាសាខ្មែរ' : 'EN'}</span>
          </button>

          {/* Theme Switch */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-hover text-content-secondary hover:text-content-primary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            {activeTheme === 'dark' ? (
              <Moon className="w-4 h-4 text-blue-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto my-auto py-4">
        {submissionResult ? (
          /* Success Screen */
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-lg text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-content-primary">
                {i18n.language === 'km'
                  ? 'ការដាក់ពាក្យជួលបានជោគជ័យ!'
                  : 'Application Submitted Successfully!'}
              </h2>
              <p className="text-xs sm:text-sm text-content-muted">
                {i18n.language === 'km'
                  ? `បន្ទប់ ${submissionResult.room.roomNumber} ត្រូវបានកក់ទុកសម្រាប់អ្នក។ គណនីរបស់អ្នករួចរាល់ហើយ!`
                  : `Room ${submissionResult.room.roomNumber} has been reserved. Your tenant portal login is ready!`}
              </p>
            </div>

            {/* Generated Login Credentials Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-surface-subtle border border-border text-left space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-content-secondary uppercase tracking-wider">
                  {i18n.language === 'km' ? 'ព័ត៌មានគណនីចូលប្រើ' : 'Tenant Login Credentials'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {i18n.language === 'km' ? 'សកម្ម' : 'Active'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-content-muted block">{i18n.language === 'km' ? 'ឈ្មោះគណនី / លេខទូរស័ព្ទ' : 'Username / Phone'}:</span>
                  <span className="font-mono font-bold text-sm text-content-primary">
                    {submissionResult.credentials.username}
                  </span>
                </div>
                <div>
                  <span className="text-content-muted block">{i18n.language === 'km' ? 'ពាក្យសម្ងាត់បណ្តោះអាសន្ន' : 'Temporary Password'}:</span>
                  <span className="font-mono font-bold text-sm text-primary">
                    {submissionResult.credentials.tempPassword}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-content-muted space-y-1">
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {i18n.language === 'km'
                      ? 'ព័ត៌មានរបស់អ្នកត្រូវបានផ្ញើជូនម្ចាស់ផ្ទះតាម Telegram រួចរាល់!'
                      : 'Application dispatched to landlord via Telegram!'}
                  </span>
                </div>
                <p>
                  {i18n.language === 'km'
                    ? 'អ្នកអាចប្រើគណនីនេះដើម្បីចូលមើលព័ត៌មានបន្ទប់ ពិនិត្យស្ថានភាពកិច្ចសន្យា និងបង់ប្រាក់តាម Bakong KHQR។'
                    : 'Log in now to review your applied room details, track lease contract approval, and pay bills via Bakong KHQR.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                icon={copiedCreds ? Check : Copy}
                onClick={copyCredentials}
                className="w-full sm:w-1/2"
              >
                {copiedCreds ? 'Copied Details' : 'Copy Login Details'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                icon={ArrowRight}
                onClick={() => navigate('/login')}
                className="w-full sm:w-1/2"
              >
                {i18n.language === 'km' ? 'ចូលទៅកាន់ផ្ទាំងអ្នកជួល' : 'Sign In to Portal'}
              </Button>
            </div>
          </div>
        ) : (
          /* Application Form */
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
            {/* Target Room Banner */}
            {roomDetails ? (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {i18n.language === 'km' ? 'បន្ទប់ជ្រើសរើស' : 'Selected Room'}
                  </span>
                  <h3 className="text-lg font-black text-content-primary">
                    Room {roomDetails.roomNumber} (Floor {roomDetails.floor})
                  </h3>
                  <p className="text-xs text-content-muted">
                    {roomDetails.note || 'Air-conditioned residential room'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-primary block">
                    {formatMoney(roomDetails.monthlyRent)}
                  </span>
                  <span className="text-[10px] text-content-muted font-medium">/ month</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-content-primary">
                  {i18n.language === 'km' ? 'ជ្រើសរើសបន្ទប់ដែលចង់ជួល' : 'Select Room to Lease'}
                </label>
                <select
                  value={selectedRoomId}
                  onChange={handleRoomChange}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-content-primary text-sm outline-none focus:border-primary"
                >
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} - Floor {r.floor} ({formatMoney(r.monthlyRent)}/mo)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <Input
                label={i18n.language === 'km' ? 'ឈ្មោះពេញរបស់អ្នកជួល' : 'Tenant Full Name'}
                icon={User}
                placeholder="e.g. Sokha Chan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              {/* Phone Number */}
              <Input
                label={i18n.language === 'km' ? 'លេខទូរស័ព្ទ (សម្រាប់ចូលប្រើប្រព័ន្ធ)' : 'Phone Number (Used for Login)'}
                icon={Phone}
                placeholder="e.g. 012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              {/* National ID / Passport */}
              <Input
                label={i18n.language === 'km' ? 'លេខអត្តសញ្ញាណប័ណ្ណ ឬ លិខិតឆ្លងដែន' : 'National ID / Passport Number'}
                icon={CreditCard}
                placeholder="e.g. ID01020304"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                required
              />

              {/* File Upload: National ID Card / Passport photo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-content-primary flex items-center justify-between">
                  <span>
                    {i18n.language === 'km'
                      ? 'រូបថតអត្តសញ្ញាណប័ណ្ណ ឬ លិខិតឆ្លងដែន (JPG, PNG, PDF)'
                      : 'Upload ID Card or Passport Photo (JPG, PNG, PDF)'}
                  </span>
                  <span className="text-[11px] text-content-muted">Max 5 MB</span>
                </label>
                <div className="relative border-2 border-dashed border-border hover:border-primary rounded-xl p-4 text-center cursor-pointer bg-surface-subtle transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Upload className="w-6 h-6 text-primary" />
                    {idFile ? (
                      <span className="text-xs font-bold text-primary truncate max-w-xs">
                        {idFile.name}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-content-primary">
                          {i18n.language === 'km'
                            ? 'ចុចទីនេះដើម្បីជ្រើសរើសរូបថត'
                            : 'Click to select or drag photo here'}
                        </span>
                        <span className="text-[11px] text-content-muted">
                          Camera photo or document upload
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Email & Telegram (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={i18n.language === 'km' ? 'អ៊ីមែល (មិនបង្ខំ)' : 'Email Address (Optional)'}
                  icon={Mail}
                  placeholder="tenant@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label={i18n.language === 'km' ? 'Telegram (មិនបង្ខំ)' : 'Telegram Username / ID'}
                  icon={Send}
                  placeholder="@sokha_c"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                />
              </div>

              {/* Move-in Date */}
              <Input
                type="date"
                label={i18n.language === 'km' ? 'ថ្ងៃគ្រោងចូលនៅ' : 'Preferred Move-in Date'}
                icon={Calendar}
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                className="w-full mt-4"
              >
                {submitting
                  ? (i18n.language === 'km' ? 'កំពុងផ្ញើ...' : 'Submitting Application...')
                  : (i18n.language === 'km' ? 'ដាក់ពាក្យស្នើសុំជួល' : 'Submit Rental Application')}
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-2xl w-full mx-auto text-center text-xs text-content-muted pt-4 border-t border-border/40">
        © 2026 Sunrise Apartments Management • Phnom Penh, Cambodia
      </footer>
    </div>
  );
}
export default PublicApplyPage;