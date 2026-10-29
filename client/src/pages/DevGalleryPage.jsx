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
  const { t } = useTranslation();
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
    { key: 'room', label: 'Room #', sortable: true },
    { key: 'floor', label: 'Floor', sortable: true },
    {
      key: 'rent',
      label: 'Monthly Rent',
      sortable: true,
      render: (r) => <span className="font-mono font-medium">{formatMoney(r.rent)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          <IconButton icon={Edit} label="Edit" size="sm" onClick={() => showInfo(`Edit room ${r.room}`)} />
          <IconButton icon={Trash2} label="Delete" size="sm" variant="danger" onClick={() => setIsConfirmOpen(true)} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      <PageHeader
        title="UI Component Library Gallery"
        subtitle="Live showcase of core components, design tokens, light/dark mode, and Khmer typography"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Dev Gallery' },
        ]}
        action={
          <Button variant="primary" icon={Sparkles} onClick={() => showSuccess('Tokens & Gallery Verified!')}>
            Test Toast
          </Button>
        }
      />

      {/* 1. Buttons & IconButtons */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">1. Buttons & Icon Buttons</h2>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" loading>Loading</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="primary" icon={Plus}>With Icon</Button>
            <Button variant="secondary" size="sm">Small</Button>
            <Button variant="secondary" size="lg">Large</Button>
            <IconButton icon={Edit} label="Edit" />
            <IconButton icon={Trash2} label="Delete" variant="danger" />
          </div>
        </Card>
      </section>

      {/* 2. Status Badges */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">2. Status Badges (Color + Icon + Label)</h2>
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
        <h2 className="text-lg font-bold text-content-primary">3. Stat Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Occupancy Rate"
            value="87.5%"
            subtitle="7 of 8 rooms occupied"
            icon={DoorOpen}
            color="primary"
          />
          <StatCard
            title="Income This Month"
            value="$1,240.00"
            trend="+8.5%"
            subtitle="vs last month"
            icon={DollarSign}
            color="success"
          />
          <StatCard
            title="Unpaid Balance"
            value="$340.00"
            subtitle="2 overdue invoices"
            icon={TrendingUp}
            color="danger"
          />
          <StatCard
            title="Active Tenants"
            value="5 Tenants"
            subtitle="1 expiring next month"
            icon={Users}
            color="info"
          />
        </div>
      </section>

      {/* 4. Form Controls */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">4. Form Inputs & Pickers</h2>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input label="Standard Input" placeholder="Type here..." helperText="Helper text under input" />
            <Input label="With Error" value="Invalid input" error="This field is invalid" />
            <Select
              label="Select Dropdown"
              options={[
                { value: '1', label: 'Option 1' },
                { value: '2', label: 'Option 2' },
                { value: '3', label: 'Option 3' },
              ]}
            />
            <DatePicker label="Date Picker (YYYY-MM-DD)" defaultValue="2026-10-29" />
            <DatePicker label="Month Picker (YYYY-MM)" mode="month" defaultValue="2026-10" />
            <MoneyInput
              label="Money Input (stores cents)"
              value={moneyCents}
              onChange={(newCents) => setMoneyCents(newCents)}
              helperText={`Stored cents: ${moneyCents}`}
            />
            <div className="md:col-span-2 lg:col-span-3">
              <SearchBox
                value={searchQuery}
                onChange={(q) => setSearchQuery(q)}
                placeholder="Search rooms, tenants, invoices..."
              />
              {searchQuery && (
                <p className="text-xs text-content-muted mt-1.5">
                  Debounced Query: <span className="font-semibold text-primary">{searchQuery}</span>
                </p>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* 5. Data Table & Pagination */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">5. Data Table (Desktop Table + Mobile Cards)</h2>
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
        <h2 className="text-lg font-bold text-content-primary">6. Tabs, Modals & Drawers</h2>
        <Card>
          <Tabs
            tabs={[
              { id: 'all', label: 'All Invoices', count: 12 },
              { id: 'unpaid', label: 'Unpaid', count: 3 },
              { id: 'overdue', label: 'Overdue', count: 1 },
              { id: 'paid', label: 'Paid', count: 8 },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab)}
          />

          <div className="flex flex-wrap gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Open Demo Modal
            </Button>
            <Button variant="secondary" onClick={() => setIsDrawerOpen(true)}>
              Open Demo Drawer
            </Button>
            <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
              Open Confirm Dialog
            </Button>
          </div>
        </Card>
      </section>

      {/* 7. Toasts */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">7. Toast Notifications (with Undo)</h2>
        <Card>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => showSuccess('Payment of $150.00 saved successfully!')}>
              Success Toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                showSuccess('Room 101 marked as maintenance', {
                  onUndo: () => showInfo('Undone! Room 101 restored to available.'),
                })
              }
            >
              Success with Undo
            </Button>
            <Button variant="danger" onClick={() => showError('Failed to generate invoice: meter reading missing')}>
              Error Toast
            </Button>
            <Button variant="outline" onClick={() => showWarning('Contract ending in 15 days')}>
              Warning Toast
            </Button>
            <Button variant="ghost" onClick={() => showInfo('New Bakong transaction received')}>
              Info Toast
            </Button>
          </div>
        </Card>
      </section>

      {/* 8. Skeletons & Avatars & Empty State */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">8. Skeletons, Avatars & Empty State</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Avatars">
            <div className="flex items-center gap-3">
              <Avatar name="Sokha Chan" size="sm" status="online" />
              <Avatar name="Dara Vorn" size="md" status="online" />
              <Avatar name="Sunrise Apartments" size="lg" />
            </div>
          </Card>

          <Card title="Skeletons">
            <div className="space-y-2.5">
              <Skeleton height="h-4" width="w-3/4" />
              <Skeleton height="h-4" width="w-full" />
              <Skeleton height="h-8" width="w-1/2" />
            </div>
          </Card>

          <Card title="Empty State">
            <EmptyState
              title="No Invoices Found"
              description="There are no overdue invoices for this month."
            />
          </Card>
        </div>
      </section>

      {/* 9. File Upload & KHQR Card */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">9. File Upload & KHQR Code Card</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <Card title="File Upload">
            <FileUpload onFileSelect={(file) => showSuccess(`Selected file: ${file?.name}`)} />
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
        title="Sample Modal Dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Confirm Action
            </Button>
          </>
        }
      >
        <p className="text-sm text-content-secondary leading-relaxed">
          This is a reusable accessible modal with keyboard ESC dismissal, backdrop blur, and focus management.
        </p>
      </Modal>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Sample Side Drawer"
      >
        <p className="text-sm text-content-secondary">
          Drawer content sliding in from the right edge with scrollable container.
        </p>
      </Drawer>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          showSuccess('Room deleted successfully!');
        }}
        title="Delete Room"
        message="Are you sure you want to delete this room? This action cannot be undone."
      />
    </div>
  );
}
