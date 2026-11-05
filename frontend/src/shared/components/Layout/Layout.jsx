// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { Link, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from '../Footer';
import SkipLink from '../SkipLink';
import { useSession } from '../../context/SessionContext';

export default function Layout() {
  const { session } = useSession();
  const pendingPolicies = session?.policies?.pending_acknowledgements || 0;

  return (
    <div className="layout">
      <SkipLink />
      <Navbar />
      <main className="main-content" id="main-content" tabIndex={-1}>
        {pendingPolicies > 0 && (
          <div
            className="glass-alert glass-alert-warning"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
          >
            <span>
              You have {pendingPolicies} company {pendingPolicies === 1 ? 'policy' : 'policies'} waiting for your acknowledgement.
            </span>
            <Link to="/policies" className="glass-btn glass-btn-sm glass-btn-primary">Review policies</Link>
          </div>
        )}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
