import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  List,
  Plus,
  DoorOpen,
  Lock,
  Unlock,
  Wrench,
  Edit,
  Trash2,
  FileSignature,
  Phone,
  User,
  Filter,
  FileSpreadsheet,
  QrCode,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { IconButton } from '../components/common/IconButton.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { MoneyInput } from '../components/common/MoneyInput.jsx';
import { SearchBox } from '../components/common/SearchBox.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { CsvImportModal } from '../components/modals/CsvImportModal.jsx';
import { RoomQrPosterModal } from '../components/rooms/RoomQrPosterModal.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney } from '../utils/format.js';

export function RoomsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('rooms_view_mode') || 'grid');
  const [rooms, setRooms] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [floors, setFloors] = useState([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [qrModalRoom, setQrModalRoom] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form State
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formFloor, setFormFloor] = useState('1');
  const [formMonthlyRent, setFormMonthlyRent] = useState(15000); // $150.00
  const [formStatus, setFormStatus] = useState('available');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: '50',
      });
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (floorFilter !== 'all') queryParams.append('floor', floorFilter);
      if (searchQuery.trim()) queryParams.append('q', searchQuery.trim());

      const data = await apiRequest(`rooms?${queryParams.toString()}`);
      setRooms(data.items);
      setTotal(data.total);
    } catch (err) {
      showError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, floorFilter, searchQuery, showError]);

  const fetchFloors = async () => {
    try {
      const data = await apiRequest('rooms/floors');
      setFloors(data.floors || []);
    } catch (err) {
      console.warn('Failed to fetch floors:', err);
    }
  };

  useEffect(() => {
    fetchFloors();
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('rooms_view_mode', mode);
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setFormRoomNumber('');
    setFormFloor('1');
    setFormMonthlyRent(15000);
    setFormStatus('available');
    setFormNote('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setFormRoomNumber(room.roomNumber);
    setFormFloor(String(room.floor));
    setFormMonthlyRent(room.monthlyRent);
    setFormStatus(room.status);
    setFormNote(room.note || '');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formRoomNumber.trim()) {
      setFormError('Room number is required');
      return;
    }
    setFormSubmitting(true);
    setFormError('');

    try {
      if (editingRoom) {
        await apiRequest(`rooms/${editingRoom.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            roomNumber: formRoomNumber.trim(),
            floor: parseInt(formFloor, 10),
            monthlyRent: formMonthlyRent,
            status: formStatus,
            note: formNote.trim() || null,
          }),
        });
        showSuccess(`Room ${formRoomNumber} updated successfully`);
      } else {
        await apiRequest('rooms', {
          method: 'POST',
          body: JSON.stringify({
            roomNumber: formRoomNumber.trim(),
            floor: parseInt(formFloor, 10),
            monthlyRent: formMonthlyRent,
            status: formStatus,
            note: formNote.trim() || null,
          }),
        });
        showSuccess(`Room ${formRoomNumber} created successfully`);
      }
      setIsAddModalOpen(false);
      fetchRooms();
      fetchFloors();
    } catch (err) {
      setFormError(t(`errors.${err.code}`, err.message || 'Operation failed'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRoom) return;
    try {
      await apiRequest(`rooms/${deletingRoom.id}`, { method: 'DELETE' });
      showSuccess(`Room ${deletingRoom.roomNumber} deleted successfully`);
      setDeletingRoom(null);
      fetchRooms();
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Failed to delete room'));
    }
  };

  const handleToggleMaintenance = async (room) => {
    if (room.status === 'occupied') {
      showError('Cannot set an occupied room directly to maintenance');
      return;
    }
    const nextStatus = room.status === 'maintenance' ? 'available' : 'maintenance';
    try {
      await apiRequest(`rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      showSuccess(`Room ${room.roomNumber} is now ${nextStatus}`);
      fetchRooms();
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Update failed'));
    }
  };

  // Status counts
  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'maintenance').length;

  const tableColumns = [
    {
      key: 'roomNumber',
      label: t('rooms.roomNumber'),
      sortable: true,
      render: (r) => (
        <span className="font-bold text-content-primary text-base">#{r.roomNumber}</span>
      ),
    },
    {
      key: 'floor',
      label: t('rooms.floor'),
      sortable: true,
      render: (r) => t('rooms.floorN', { floor: r.floor }),
    },
    {
      key: 'monthlyRent',
      label: t('rooms.monthlyRent'),
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-content-primary">
            {formatMoney(r.monthlyRent)}
          </span>
          <span className="block text-[11px] text-content-muted">
            {formatMoney(r.monthlyRent, { showRiel: true })}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'tenant',
      label: t('nav.tenants'),
      render: (r) =>
        r.tenantName ? (
          <div className="flex items-center gap-1.5 text-xs text-content-secondary">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">{r.tenantName}</span>
          </div>
        ) : (
          <span className="text-content-muted text-xs">—</span>
        ),
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status === 'available' && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              icon={FileSignature}
              onClick={() => navigate(`/contracts?action=new&roomId=${r.id}`)}
            >
              {t('rooms.quickContract')}
            </Button>
          )}

          {isAdmin && (
            <>
              <IconButton
                icon={QrCode}
                label="Scan to Rent QR Poster"
                size="sm"
                variant="ghost"
                onClick={() => setQrModalRoom(r)}
              />
              <IconButton
                icon={Wrench}
                label="Toggle Maintenance"
                size="sm"
                variant={r.status === 'maintenance' ? 'primary' : 'ghost'}
                onClick={() => handleToggleMaintenance(r)}
              />
              <IconButton
                icon={Edit}
                label={t('common.edit')}
                size="sm"
                onClick={() => openEditModal(r)}
              />
              {!r.activeContractId && (
                <IconButton
                  icon={Trash2}
                  label={t('common.delete')}
                  size="sm"
                  variant="danger"
                  onClick={() => setDeletingRoom(r)}
                />
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('rooms.title')}
        subtitle={t('rooms.subtitle')}
        action={
          isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                icon={FileSpreadsheet}
                onClick={() => setIsImportModalOpen(true)}
              >
                CSV
              </Button>
              <Button variant="primary" icon={Plus} onClick={openAddModal}>
                {t('rooms.addRoom')}
              </Button>
            </div>
          )
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Rooms"
          value={total}
          subtitle="Building capacity"
          icon={DoorOpen}
          color="primary"
        />
        <StatCard
          title={t('status.available')}
          value={availableCount}
          subtitle="Ready for lease"
          icon={Unlock}
          color="success"
        />
        <StatCard
          title={t('status.occupied')}
          value={occupiedCount}
          subtitle="Currently active"
          icon={Lock}
          color="primary"
        />
        <StatCard
          title={t('status.maintenance')}
          value={maintenanceCount}
          subtitle="Needs attention"
          icon={Wrench}
          color="warning"
        />
      </div>

      {/* Control Bar: Filters, Search, View Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface border border-border rounded-xl p-3 shadow-xs">
        {/* Status Tabs */}
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <Tabs
            tabs={[
              { id: 'all', label: t('common.all'), count: total },
              { id: 'available', label: t('status.available'), count: availableCount },
              { id: 'occupied', label: t('status.occupied'), count: occupiedCount },
              { id: 'maintenance', label: t('status.maintenance'), count: maintenanceCount },
            ]}
            activeTab={statusFilter}
            onChange={(tab) => {
              setStatusFilter(tab);
              setPage(1);
            }}
          />
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          {/* Floor filter */}
          {floors.length > 0 && (
            <div className="w-32">
              <Select
                value={floorFilter}
                onChange={(e) => {
                  setFloorFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Floors' },
                  ...floors.map((f) => ({ value: String(f), label: `Floor ${f}` })),
                ]}
              />
            </div>
          )}

          {/* Search */}
          <div className="w-48 sm:w-60">
            <SearchBox
              value={searchQuery}
              onChange={(q) => {
                setSearchQuery(q);
                setPage(1);
              }}
              placeholder={t('common.search')}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-surface-subtle">
            <button
              type="button"
              onClick={() => handleViewModeChange('grid')}
              title="Grid View"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-surface shadow-xs text-primary font-bold'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('table')}
              title="Table View"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-surface shadow-xs text-primary font-bold'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton height="h-44" />
              <Skeleton height="h-44" />
              <Skeleton height="h-44" />
              <Skeleton height="h-44" />
            </div>
          ) : rooms.length === 0 ? (
            <Card>
              <div className="p-8 text-center text-content-muted">
                <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-content-primary">{t('common.noData')}</p>
                <p className="text-xs mt-1">No rooms match the selected filters.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={`bg-surface border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between hover:shadow-md ${
                    room.status === 'occupied'
                      ? 'border-primary/30'
                      : room.status === 'maintenance'
                      ? 'border-warning/30'
                      : 'border-border'
                  }`}
                >
                  {/* Top: Room # and Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs uppercase font-semibold text-content-muted tracking-wider">
                        {t('rooms.floorN', { floor: room.floor })}
                      </span>
                      <h3 className="text-2xl font-black text-content-primary tracking-tight">
                        #{room.roomNumber}
                      </h3>
                    </div>
                    <StatusBadge status={room.status} />
                  </div>

                  {/* Middle: Price & Tenant info */}
                  <div className="my-4 pt-3 border-t border-border/60 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-content-muted">{t('rooms.monthlyRent')}</span>
                      <span className="font-mono font-bold text-base text-content-primary">
                        {formatMoney(room.monthlyRent)}
                      </span>
                    </div>

                    {room.tenantName ? (
                      <div className="p-2 rounded-lg bg-surface-subtle border border-border/80 flex items-center justify-between text-xs mt-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-medium text-content-primary truncate">
                            {room.tenantName}
                          </span>
                        </div>
                        {room.tenantPhone && (
                          <a
                            href={`tel:${room.tenantPhone}`}
                            className="p-1 rounded text-content-muted hover:text-primary"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-content-muted italic">
                        {room.note || 'No active tenant'}
                      </p>
                    )}
                  </div>

                  {/* Bottom: Action buttons */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                    {room.status === 'available' ? (
                      isAdmin ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={FileSignature}
                            className="flex-1"
                            onClick={() => navigate(`/contracts?action=new&roomId=${room.id}`)}
                          >
                            {t('rooms.quickContract')}
                          </Button>
                          <IconButton
                            icon={QrCode}
                            label="Scan to Rent QR Poster"
                            size="sm"
                            variant="outline"
                            onClick={() => setQrModalRoom(room)}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-success font-medium">Available</span>
                      )
                    ) : (
                      <div className="flex items-center gap-1 w-full justify-end">
                        <IconButton
                          icon={QrCode}
                          label="Scan to Rent QR Poster"
                          size="sm"
                          variant="ghost"
                          onClick={() => setQrModalRoom(room)}
                        />
                        {isAdmin && (
                          <>
                            <IconButton
                              icon={Wrench}
                              label="Maintenance"
                              size="sm"
                              variant={room.status === 'maintenance' ? 'primary' : 'ghost'}
                              onClick={() => handleToggleMaintenance(room)}
                            />
                            <IconButton
                              icon={Edit}
                              label={t('common.edit')}
                              size="sm"
                              onClick={() => openEditModal(room)}
                            />
                            {!room.activeContractId && (
                              <IconButton
                                icon={Trash2}
                                label={t('common.delete')}
                                size="sm"
                                variant="danger"
                                onClick={() => setDeletingRoom(room)}
                              />
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <DataTable
          columns={tableColumns}
          data={rooms}
          total={total}
          page={page}
          pageSize={50}
          onPageChange={(p) => setPage(p)}
          loading={loading}
        />
      )}

      {/* Add / Edit Room Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingRoom ? t('rooms.editRoom') : t('rooms.addRoom')}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-danger-bg border border-danger-border text-danger-text text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('rooms.roomNumber')}
              placeholder="e.g. 101"
              value={formRoomNumber}
              onChange={(e) => setFormRoomNumber(e.target.value)}
              required
            />
            <Input
              label={t('rooms.floor')}
              type="number"
              placeholder="1"
              value={formFloor}
              onChange={(e) => setFormFloor(e.target.value)}
              required
            />
          </div>

          <MoneyInput
            label={t('rooms.monthlyRent')}
            value={formMonthlyRent}
            onChange={(cents) => setFormMonthlyRent(cents)}
            required
            helperText="Default price applied to new rental contracts"
          />

          {!editingRoom && (
            <Select
              label={t('common.status')}
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              options={[
                { value: 'available', label: t('status.available') },
                { value: 'maintenance', label: t('status.maintenance') },
              ]}
              helperText="Rooms become occupied automatically when a contract is created"
            />
          )}

          <Input
            label={t('common.note')}
            placeholder="e.g. Balcony, air conditioner, window view..."
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" loading={formSubmitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onConfirm={handleDeleteConfirm}
        title={t('common.delete')}
        message={
          deletingRoom
            ? t('rooms.confirmDelete', { number: deletingRoom.roomNumber })
            : ''
        }
      />

      {/* Room QR Poster Modal */}
      <RoomQrPosterModal
        isOpen={!!qrModalRoom}
        room={qrModalRoom}
        onClose={() => setQrModalRoom(null)}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t('import.titleRooms')}
        type="rooms"
        onImport={(rows) =>
          apiRequest('rooms/import', {
            method: 'POST',
            body: JSON.stringify({ rows }),
          })
        }
        onSuccess={fetchRooms}
      />
    </div>
  );
}
