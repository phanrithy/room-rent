import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DoorOpen, Users, Receipt, Gauge, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.home')}
        subtitle={`Welcome back, ${user?.username || 'Landlord'}`}
        action={
          <Link to="/dev/components">
            <Button variant="outline" icon={Sparkles}>
              View Component Gallery
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/rooms">
          <Card className="hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-light text-primary rounded-lg">
                <DoorOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-content-primary">{t('nav.rooms')}</h4>
                <p className="text-xs text-content-muted">Manage building rooms</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/tenants">
          <Card className="hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-info-bg text-info rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-content-primary">{t('nav.tenants')}</h4>
                <p className="text-xs text-content-muted">Contacts & leases</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/readings">
          <Card className="hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-warning-bg text-warning rounded-lg">
                <Gauge className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-content-primary">{t('nav.readings')}</h4>
                <p className="text-xs text-content-muted">Water & electricity</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/invoices">
          <Card className="hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-success-bg text-success rounded-lg">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-content-primary">{t('nav.invoices')}</h4>
                <p className="text-xs text-content-muted">Billing & payments</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <Card title="Phase 1 Foundation Ready">
        <div className="space-y-3 text-sm text-content-secondary leading-relaxed">
          <p>
            Phase 1 is complete! The system foundation, design tokens (light & dark mode), Khmer and English i18n, authentication, responsive layout (collapsible desktop sidebar and mobile bottom tab bar), and core reusable components are active.
          </p>
          <div className="pt-2">
            <Link to="/dev/components">
              <Button variant="primary">Explore Component Gallery</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
