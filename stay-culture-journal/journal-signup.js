/* Stay Culture Journal — HubSpot form integration.
 * Deliberately NOT loaded by the public Journal or preview until
 * privacy notice, consent and subscriber tests are approved.
 * To activate after approval, include:
 * <div id="stay-culture-journal-signup"></div>
 * <script src="https://js.hsforms.net/forms/embed/v2.js"></script>
 * <script src="/stay-culture-journal/journal-signup.js"></script>
 * Once enabled, verify with a controlled subscription test.
 */
(function () {
  'use strict';
  const target = document.getElementById('stay-culture-journal-signup');
  if (!target || !window.hbspt || !window.hbspt.forms || typeof window.hbspt.forms.create !== 'function') return;
  window.hbspt.forms.create({
    region: 'na2',
    portalId: '247944652',
    formId: 'cb4cb784-d69e-4730-afc8-3ae579dda438',
    target: '#stay-culture-journal-signup'
  });
})();
