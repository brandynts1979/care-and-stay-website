/* Stay Culture Journal, new HubSpot form editor.
 * The new editor uses HubSpot's v4 form-frame embed, not hbspt.forms.create.
 * This file serves as a reference/configuration for the production integration.
 * The actual embed is in the Journal preview HTML, loading HubSpot's script.
 * Portal: 247944652; form: cb4cb784-d69e-4730-afc8-3ae579dda438; region na2.
 * Do not add automated marketing sends here.
 */
(function () {
  'use strict';
  const target = document.querySelector('.hs-form-frame[data-form-id="cb4cb784-d69e-4730-afc8-3ae579dda438"]');
  if (!target) return;
  target.dataset.region = 'na2';
  target.dataset.portalId = '247944652';
})();
