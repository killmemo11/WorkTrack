// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from '../Footer';
import SkipLink from '../SkipLink';

export default function Layout() {
  return (
    <div className="layout">
      <SkipLink />
      <Navbar />
      <main className="main-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
