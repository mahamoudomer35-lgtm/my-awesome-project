# SomaZon Version 0.01

Experimental marketplace refactor from the supplied single-file HTML source.

## Structure
- `index.html`: marketplace and account interface
- `login.html`: sign-in page
- `register.html`: account registration page
- `css/style.css`: shared styles
- `js/supabase.js`: Supabase browser client configuration
- `js/auth.js`: standalone login and registration flows
- `js/dashboard.js`: marketplace, cart, account, profile and UI logic
- `assets/icons/`: reserved for project icons

## Supabase setup
Edit `js/supabase.js` and replace the two placeholders with the Project URL and Publishable/anon key. Never use a `service_role` key in frontend code. The app expects the Supabase JS v2 CDN to load. The current profile integration is limited to the supplied `profiles` fields: `id`, `full_name`, `avatar_url`, `language`, and `updated_at`. Wishlist data is kept in browser local storage for this early version.

## Version 0.01 scope
Identity verification/KYC is disabled. The account panel displays an unavailable notice; KYC document upload is not offered. Email confirmation remains governed by Supabase Auth settings.

## Important
This is an initial file split, not a production security review. Order creation, commissions, storage policies, database schema and Row Level Security still require backend review and testing before real transactions.
