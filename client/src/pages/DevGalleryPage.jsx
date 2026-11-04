import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  Edit,
  DollarSign,
  TrendingUp,
  Users,
  DoorOpen,
  Calendar,
  Sparkles,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { IconButton } from '../components/common/IconButton.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { DatePicker } from '../components/common/DatePicker.jsx';
import { MoneyInput } from '../components/common/MoneyInput.jsx';
import { SearchBox } from '../components/common/SearchBox.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Drawer } from '../components/common/Drawer.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { Avatar } from '../components/common/Avatar.jsx';
import { FileUpload } from '../components/common/FileUpload.jsx';
import { QrCard } from '../components/common/QrCard.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatMoney } from '../utils/format.js';

export function DevGalleryPage() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === 'km';
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  // State for interactive gallery demos
  const [moneyCents, setMoneyCents] = useState(15000); // $150.00
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [sortKey, setSortKey] = useState('room');
  const [sortOrder, setSortOrder] = useState('asc');

  const demoRooms = [
    { id: 1, room: '101', floor: 1, rent: 15000, status: 'available' },
    { id: 2, room: '102', floor: 1, rent: 15000, status: 'occupied' },
    { id: 3, room: '103', floor: 1, rent: 16000, status: 'occupied' },
    { id: 4, room: '104', floor: 1, rent: 16000, status: 'maintenance' },
    { id: 5, room: '201', floor: 2, rent: 18000, status: 'occupied' },
    { id: 6, room: '202', floor: 2, rent: 18000, status: 'occupied' },
    { id: 7, room: '203', floor: 2, rent: 20000, status: 'available' },
  ];

  const columns = [
    { key: 'room', label: isKm ? 'លេខបន្ទប់' : 'Room #', sortable: true },
    { key: 'floor', label: isKm ? 'ជាន់' : 'Floor', sortable: true },
    {
      key: 'rent',
      label: isKm ? 'ថ្លៃឈ្នួលប្រចាំខែ' : 'Monthly Rent',
      sortable: true,
      render: (r) => <span className="font-mono font-medium">{formatMoney(r.rent)}</span>,
    },
    {
      key: 'status',
      label: t('common.status'),
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (r) => (
        <div className="flex items-center gap-1">
          <IconButton
            icon={Edit}
            label={t('common.edit')}
            size="sm"
            onClick={() => showInfo(isKm ? `កែសម្រួលបន្ទប់ ${r.room}` : `Edit room ${r.room}`)}
          />
          <IconButton
            icon={Trash2}
            label={t('common.delete')}
            size="sm"
            variant="danger"
            onClick={() => setIsConfirmOpen(true)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      <PageHeader
        title={isKm ? 'បណ្ណាល័យសមាសភាគ UI (UI Component Gallery)' : 'UI Component Library Gallery'}
        subtitle={
          isKm
            ? 'ការបង្ហាញសមាសភាគស្នូល និមិត្តសញ្ញារចនា ស្បែកពណ៌ Light/Dark និងអក្សរខ្មែរ'
            : 'Live showcase of core components, design tokens, light/dark mode, and Khmer typography'
        }
        breadcrumbs={[
          { label: t('nav.home'), to: '/' },
          { label: t('nav.devGallery') },
        ]}
        action={
          <Button
            variant="primary"
            icon={Sparkles}
            onClick={() =>
              showSuccess(
                isKm
                  ? 'ផ្ទៀងផ្ទាត់សមាសភាគ និងប្រព័ន្ធ UI រួចរាល់!'
                  : 'Tokens & Gallery Verified!'
              )
            }
          >
            {isKm ? 'សាកល្បង Toast' : 'Test Toast'}
          </Button>
        }
      />

      {/* 1. Buttons & IconButtons */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          {isKm ? '១. ប៊ូតុង និងប៊ូតុងរូបតំណាង (Buttons & Icon Buttons)' : '1. Buttons & Icon Buttons'}
        </h2>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">{isKm ? 'ប៊ូតុងចម្បង' : 'Primary'}</Button>
            <Button variant="secondary">{isKm ? 'ប៊ូតុងរង' : 'Secondary'}</Button>
            <Button variant="outline">{isKm ? 'ស៊ុមក្រៅ' : 'Outline'}</Button>
            <Button variant="danger">{isKm ? 'គ្រោះថ្នាក់' : 'Danger'}</Button>
            <Button variant="ghost">{isKm ? 'ស្រាល' : 'Ghost'}</Button>
            <Button variant="primary" loading>
              {isKm ? 'កំពុងដំណើរការ' : 'Loading'}
            </Button>
            <Button variant="primary" disabled>
              {isKm ? 'បិទដំណើរការ' : 'Disabled'}
            </Button>
            <Button variant="primary" icon={Plus}>
              {isKm ? 'ជាមួយរូបតំណាង' : 'With Icon'}
            </Button>
            <Button variant="secondary" size="sm">
              {isKm ? 'តូច' : 'Small'}
            </Button>
            <Button variant="secondary" size="lg">
              {isKm ? 'ធំ' : 'Large'}
            </Button>
            <IconButton icon={Edit} label={t('common.edit')} />
            <IconButton icon={Trash2} label={t('common.delete')} variant="danger" />
          </div>
        </Card>
      </section>

      {/* 2. Status Badges */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          {isKm ? '២. ផ្លាកសញ្ញាស្ថានភាព (Status Badges)' : '2. Status Badges (Color + Icon + Label)'}
        </h2>
        <Card>
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status="available" />
            <StatusBadge status="occupied" />
            <StatusBadge status="maintenance" />
            <StatusBadge status="paid" />
            <StatusBadge status="partial" />
            <StatusBadge status="unpaid" />
            <StatusBadge status="overdue" />
            <StatusBadge status="active" />
            <StatusBadge status="ended" />
            <StatusBadge status="open" />
            <StatusBadge status="in_progress" />
            <StatusBadge status="done" />
          </div>
        </Card>
      </section>

      {/* 3. Stat Cards */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          {isKm ? '៣. ប័ណ្ណស្ថិតិ (Stat Cards)' : '3. Stat Cards'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={isKm ? 'អត្រាមានអ្នកជួល' : 'Occupancy Rate'}
            value="87.5%"
            subtitle={isKm ? '៧ ក្នុងចំណោម ៨ បន្ទប់មានអ្នកជួល' : '7 of 8 rooms occupied'}
            icon={DoorOpen}
            color="primary"
          />
          <StatCard
            title={isKm ? 'ចំណូលក្នុងខែនេះ' : 'Income This Month'}
            value="$1,240.00"
            trend="+8.5%"
            subtitle={isKm ? 'ប្រៀបធៀបនឹងខែមុន' : 'vs last month'}
            icon={DollarSign}
            color="success"
          />
          <StatCard
            title={isKm ? 'ប្រាក់មិនទាន់ប្រមូល' : 'Unpaid Balance'}
            value="$340.00"
            subtitle={isKm ? '២ វិក្កយបត្រហួសកាលកំណត់' : '2 overdue invoices'}
            icon={TrendingUp}
            color="danger"
          />
          <StatCard
            title={isKm ? 'អ្នកជួលសកម្ម' : 'Active Tenants'}
            value={isKm ? '៥ នាក់' : '5 Tenants'}
            subtitle={isKm ? '១ នាក់ជិតផុតកំណត់ខែក្រោយ' : '1 expiring next month'}
            icon={Users}
            color="info"
          />
        </div>
      </section>

      {/* 4. Form Controls */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          {isKm ? '៤. ប្រអប់បញ្ចូលទិន្នន័យ (Form Inputs & Pickers)' : '4. Form Inputs & Pickers'}
        </h2>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input
              label={isKm ? 'ប្រអប់បញ្ចូលទូទៅ' : 'Standard Input'}
              placeholder={isKm ? 'វាយបញ្ចូលទីនេះ...' : 'Type here...'}
              helperText={isKm ? 'អត្ថបទជំនួយនៅខាងក្រោមប្រអប់' : 'Helper text under input'}
            />
            <Input
              label={isKm ? 'ប្រអប់មានកំហុស' : 'With Error'}
              value={isKm ? 'ទិន្នន័យមិនត្រឹមត្រូវ' : 'Invalid input'}
              error={isKm ? 'ប្រអប់នេះមិនត្រឹមត្រូវឡើយ' : 'This field is invalid'}
            />
            <Select
              label={isKm ? 'បញ្ជីទម្លាក់ចុះ (Select)' : 'Select Dropdown'}
              options={[
                { value: '1', label: isKm ? 'ជម្រើសទី ១' : 'Option 1' },
                { value: '2', label: isKm ? 'ជម្រើសទី ២' : 'Option 2' },
                { value: '3', label: isKm ? 'ជម្រើសទី ៣' : 'Option 3' },
              ]}
            />
            <DatePicker
              label={isKm ? 'ជ្រើសរើសថ្ងៃ (YYYY-MM-DD)' : 'Date Picker (YYYY-MM-DD)'}
              defaultValue="2026-10-29"
            />
            <DatePicker
              label={isKm ? 'ជ្រើសរើសខែ (YYYY-MM)' : 'Month Picker (YYYY-MM)'}
              mode="month"
              defaultValue="2026-10"
            />
            <MoneyInput
              label={isKm ? 'ប្រអប់បញ្ចូលទឹកប្រាក់ (គិតជាសេន)' : 'Money Input (stores cents)'}
              value={moneyCents}
              onChange={(newCents) => setMoneyCents(newCents)}
              helperText={
                isKm
                  ? `ចំនួនសេនដែលបានរក្សាទុក៖ ${moneyCents}`
                  : `Stored cents: ${moneyCents}`
              }
            />
            <div className="md:col-span-2 lg:col-span-3">
              <SearchBox
                value={searchQuery}
                onChange={(q) => setSearchQuery(q)}
                placeholder={
                  isKm
                    ? 'ស្វែងរកបន្ទប់ អ្នកជួល វិក្កយបត្រ...'
                    : 'Search rooms, tenants, invoices...'
                }
              />
              {searchQuery && (
                <p className="text-xs text-content-muted mt-1.5">
                  {isKm ? 'ពាក្យគន្លឹះស្វែងរក៖ ' : 'Debounced Query: '}
                  <span className="font-semibold text-primary">{searchQuery}</span>
                </p>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* 5. Data Table & Pagination */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          {isKm ? '៥. តារាងទិន្នន័យ (Data Table)' : '5. Data Table (Desktop Table + Mobile Cards)'}
        </h2>
        <DataTable
          columns={columns}
          data={demoRooms}
          total={demoRooms.length}
          page={tablePage}
          pageSize={5}
          onPageChange={(p) => setTablePage(p)}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
        />
      </section>

      {/* 6. Tabs & Modals & Drawers */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          {isKm ? '៦. ផ្ទាំង Tab និងផ្ទាំងបើក (Tabs, Modals & Drawers)' : '6. Tabs, Modals & Drawers'}
        </h2>
        <Card>
          <Tabs
            tabs={[
              { id: 'all', label: isKm ? 'វិក្កយបត្រទាំងអស់' : 'All Invoices', count: 12 },
              { id: 'unpaid', label: isKm ? 'មិនទាន់បង់' : 'Unpaid', count: 3 },
              { id: 'overdue', label: isKm ? 'ហួសកំណត់' : 'Overdue', count: 1 },
              { id: 'paid', label: isKm ? 'បានបង់រួច' : 'Paid', count: 8 },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab)}
          />

          <div className="flex flex-wrap gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              {isKm ? 'បើកផ្ទាំងគំរូ (Demo Modal)' : 'Open Demo Modal'}
            </Button>
            <Button variant="secondary" onClick={() => setIsDrawerOpen(true)}>
              {isKm ? 'បើកផ្ទាំងចំហៀង (Demo Drawer)' : 'Open Demo Drawer'}
            </Button>
            <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
              {isKm ? 'បើកផ្ទាំងផ្ទៀងផ្ទាត់ (Confirm Dialog)' : 'Open Confirm Dialog'}
            </Button>
          </div>
        </Card>
      </section>

      {/* 7. Toasts */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          {isKm ? '៧. សារជូនដំណឹង (Toast Notifications)' : '7. Toast Notifications (with Undo)'}
        </h2>
        <Card>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() =>
                showSuccess(
                  isKm
                    ? 'ការទូទាត់ប្រាក់ $150.00 ត្រូវបានរក្សាទុកដោយជោគជ័យ!'
                    : 'Payment of $150.00 saved successfully!'
                )
              }
            >
              {isKm ? 'Toast ជោគជ័យ' : 'Success Toast'}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                showSuccess(
                  isKm ? 'បន្ទប់ 101 ត្រូវបានដាក់ជាកំពុងជួសជុល' : 'Room 101 marked as maintenance',
                  {
                    onUndo: () =>
                      showInfo(
                        isKm
                          ? 'បានមិនធ្វើវិញ! បន្ទប់ 101 បានត្រឡប់មកនៅទំនេរវិញ។'
                          : 'Undone! Room 101 restored to available.'
                      ),
                  }
                )
              }
            >
              {isKm ? 'Toast មានប៊ូតុងមិនធ្វើវិញ (Undo)' : 'Success with Undo'}
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                showError(
                  isKm
                    ? 'មិនអាចបង្កើតវិក្កយបត្របានទេ៖ ខ្វះលេខកុងទ័រ'
                    : 'Failed to generate invoice: meter reading missing'
                )
              }
            >
              {isKm ? 'Toast កំហុស' : 'Error Toast'}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                showWarning(
                  isKm
                    ? 'កិច្ចសន្យានឹងផុតកំណត់ក្នុងរយៈពេល ១៥ ថ្ងៃទៀត'
                    : 'Contract ending in 15 days'
                )
              }
            >
              {isKm ? 'Toast ព្រមាន' : 'Warning Toast'}
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                showInfo(
                  isKm
                    ? 'ទទួលបានប្រតិបត្តិការថ្មីពី Bakong'
                    : 'New Bakong transaction received'
                )
              }
            >
              {isKm ? 'Toast ព័ត៌មាន' : 'Info Toast'}
            </Button>
          </div>
        </Card>
      </section>

      {/* 8. Skeletons & Avatars & Empty State */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          {isKm
            ? '៨. រូបតំណាង (Avatars), ផ្ទាំងរង់ចាំ (Skeletons) & ផ្ទាំងទទេ (Empty State)'
            : '8. Skeletons, Avatars & Empty State'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title={isKm ? 'រូបតំណាង (Avatars)' : 'Avatars'}>
            <div className="flex items-center gap-3">
              <Avatar name="Sokha Chan" size="sm" status="online" />
              <Avatar name="Dara Vorn" size="md" status="online" />
              <Avatar name="Sunrise Apartments" size="lg" />
            </div>
          </Card>

          <Card title={isKm ? 'ផ្ទាំងរង់ចាំ (Skeletons)' : 'Skeletons'}>
            <div className="space-y-2.5">
              <Skeleton height="h-4" width="w-3/4" />
              <Skeleton height="h-4" width="w-full" />
              <Skeleton height="h-8" width="w-1/2" />
            </div>
          </Card>

          <Card title={isKm ? 'ផ្ទាំងទទេ (Empty State)' : 'Empty State'}>
            <EmptyState
              title={isKm ? 'រកមិនឃើញវិក្កយបត្រទេ' : 'No Invoices Found'}
              description={
                isKm
                  ? 'មិនមានវិក្កយបត្រហួសកាលកំណត់សម្រាប់ខែនេះឡើយ។'
                  : 'There are no overdue invoices for this month.'
              }
            />
          </Card>
        </div>
      </section>

      {/* 9. File Upload & KHQR Card */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          {isKm ? '៩. ការបញ្ចូលឯកសារ & កាត Bakong KHQR' : '9. File Upload & KHQR Code Card'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <Card title={isKm ? 'បញ្ចូលឯកសារ' : 'File Upload'}>
            <FileUpload
              onFileSelect={(file) =>
                showSuccess(
                  isKm
                    ? `បានជ្រើសរើសឯកសារ៖ ${file?.name}`
                    : `Selected file: ${file?.name}`
                )
              }
            />
          </Card>

          <div>
            <QrCard
              qrString="00020101021229300016landlord@devb0108BAKONGKH5204599953038405406150.005802KH5918Sunrise Apartments6010Phnom Penh62140110INV-2026-096304ABCD"
              amountCents={15000}
              billNumber="2026-09-101"
              merchantName="Sunrise Apartments"
            />
          </div>
        </div>
      </section>

      {/* Modals & Dialogs */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isKm ? 'ផ្ទាំងគំរូ Modal Dialog' : 'Sample Modal Dialog'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              {isKm ? 'យល់ព្រមប្រតិបត្តិការ' : 'Confirm Action'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-content-secondary leading-relaxed">
          {isKm
            ? 'នេះគឺជា Modal គំរូដែលអាចប្រើឡើងវិញបាន គាំទ្រការចុចគ្រាប់ចុច ESC និងគ្រប់គ្រងការផ្ដោតអារម្មណ៍។'
            : 'This is a reusable accessible modal with keyboard ESC dismissal, backdrop blur, and focus management.'}
        </p>
      </Modal>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={isKm ? 'ផ្ទាំងចំហៀងគំរូ (Side Drawer)' : 'Sample Side Drawer'}
      >
        <p className="text-sm text-content-secondary">
          {isKm
            ? 'ខ្លឹមសារផ្ទាំងចំហៀងដែលរុញចូលពីគែមខាងស្តាំ ជាមួយកន្លែងរំកិលមើលបាន។'
            : 'Drawer content sliding in from the right edge with scrollable container.'}
        </p>
      </Drawer>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          showSuccess(isKm ? 'បន្ទប់ត្រូវបានលុបដោយជោគជ័យ!' : 'Room deleted successfully!');
        }}
        title={isKm ? 'លុบบន្ទប់' : 'Delete Room'}
        message={
          isKm
            ? 'តើអ្នកប្រាកដជាចង់លុบบន្ទប់នេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ។'
            : 'Are you sure you want to delete this room? This action cannot be undone.'
        }
      />
    </div>
  );
}
