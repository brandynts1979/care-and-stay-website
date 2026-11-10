# Individual Leadership 360 website integration

The marketing page is served at /individual-leadership-360/, linked from the homepage Assessments menu and assessment cards. It preserves the approved individual coaching prices and pilot scope. /client-portal/ includes a separate Individual 360 entry; /individual-login/ hands off to the tested independent workspace.

Only public marketing content and navigation are integrated into this repository. Assessment code and data remain in brandynts1979/care-and-stay-individual-360 and the independent Supabase project. Family and Employer Portal routes remain unchanged. Do not reuse organizational Stay Culture 360 pricing, account sessions or database tables for this product.

Homepage navigation uses site-navigation.js and individual-site-nav.css. These restore the missing homepage menu script and support the Assessments dropdown on desktop and mobile. No form submission, credential handling or assessment API code was added to the marketing site.
