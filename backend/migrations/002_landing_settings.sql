-- ─────────────────────────────────────────────
-- Landing Page Content Settings
-- Adds all editable landing page content keys
-- ─────────────────────────────────────────────

INSERT IGNORE INTO platform_settings (`key`, `value`, `description`) VALUES
  ('landing_nav_title',          'WorkTrack',                                          'Brand name in the top nav bar'),
  ('landing_hero_badge',         'HR Management Platform',                             'Small badge above the hero title'),
  ('landing_hero_title',         'Simplify Your HR Operations in One Place',            'Hero title (main heading)'),
  ('landing_hero_subtitle',      'Track attendance, manage leaves, streamline recruitment, and empower your team — all from one modern dashboard.', 'Hero subtitle / description'),
  ('landing_cta_text',           'Start Your Company',                                 'Hero primary button text'),
  ('landing_cta_secondary_text', 'Sign In',                                            'Hero secondary button text'),
  ('landing_features_title',     'Everything You Need to Run Your Team',               'Features section title'),
  ('landing_features_subtitle',  'Powerful tools designed to make HR management effortless', 'Features section subtitle'),
  ('landing_features_list',      '{"items":[{"icon":"lucide:clock","title":"Attendance Tracking","desc":"Real-time attendance tracking with geofence support and missing sign-out alerts."},{"icon":"lucide:calendar","title":"Leave Management","desc":"Comprehensive leave management with approval workflows and balance tracking."},{"icon":"lucide:users","title":"HR & People Ops","desc":"Employee profiles, organization charts, documents, contracts, and checklists in one place."},{"icon":"lucide:briefcase","title":"Recruitment ATS","desc":"Full applicant tracking system with candidate pipeline, interview scheduling, and offer management."},{"icon":"lucide:bar-chart-3","title":"Reports & Analytics","desc":"Detailed reports and analytics for attendance, headcount, and audit compliance."},{"icon":"lucide:shield","title":"Security & RBAC","desc":"Role-based access control with granular permissions and audit trails for every action."}]}', 'JSON array of feature cards — keys: icon, title, desc'),
  ('landing_steps_title',        'Get Started in 3 Simple Steps',                       'How-it-works section title'),
  ('landing_steps_subtitle',     'No technical expertise required — be up and running in minutes', 'How-it-works section subtitle'),
  ('landing_steps_list',         '{"steps":[{"icon":"lucide:user-plus","title":"Register Your Company","desc":"Create your account and tell us about your team."},{"icon":"lucide:check-circle","title":"Get Approved","desc":"Our team reviews and approves your workspace within 24 hours."},{"icon":"lucide:rocket","title":"Set Up & Go","desc":"Add your employees, configure settings, and start managing."}]}', 'JSON array of steps — keys: icon, title, desc'),
  ('landing_cta_card_1_title',   'Ready to Get Started?',                               'CTA card 1 title'),
  ('landing_cta_card_1_text',    'Create your company workspace and start your free trial today. No credit card required.', 'CTA card 1 body text'),
  ('landing_cta_card_1_button',  'Register Your Company',                               'CTA card 1 button'),
  ('landing_cta_card_2_title',   'Already Have an Account?',                            'CTA card 2 title'),
  ('landing_cta_card_2_text',    'Sign in to your workspace and pick up right where you left off.', 'CTA card 2 body text'),
  ('landing_cta_card_2_button',  'Sign In',                                             'CTA card 2 button'),
  ('landing_footer_text',        'Empowering teams with modern HR tools.',             'Footer tagline under brand name'),
  ('landing_footer_links',       '{"links":[{"label":"Careers","url":"/careers"},{"label":"Sign In","url":"/login"},{"label":"Register","url":"/tenant-register"}]}', 'JSON array of footer links — keys: label, url'),
  ('landing_show_plans',         '1',                                                   'Show pricing section (1 = yes, 0 = no)'),
  ('landing_show_features',      '1',                                                   'Show features section (1 = yes, 0 = no)'),
  ('landing_show_how_it_works',  '1',                                                   'Show how-it-works section (1 = yes, 0 = no)'),
  ('landing_show_cta_cards',    '1',                                                   'Show CTA cards section (1 = yes, 0 = no)');
