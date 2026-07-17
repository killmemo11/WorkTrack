// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { sanitizeHTML } from '../../../shared/utils/sanitize';

export default function LogoStrip({ logos = [], className = '' }) {
  const doubled = [...logos, ...logos];

  return (
    <div className={`landing-logo-strip ${className}`}>
      <div className="landing-logo-strip-mask landing-logo-strip-mask--left" aria-hidden="true" />
      <div className="landing-logo-strip-mask landing-logo-strip-mask--right" aria-hidden="true" />
      <div className="landing-logo-strip-track">
        {doubled.map((logo, i) => (
          <div key={i} className="landing-logo-strip-item" title={logo.name}>
            {logo.svg ? (
              <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(logo.svg) }} />
            ) : (
              <span className="landing-logo-strip-placeholder">{logo.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
