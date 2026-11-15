// Public registration is opt-in; staging never opens it by default.
const button = document.getElementById('signup-button');
const intro = document.getElementById('registration-intro');
const hint = document.getElementById('registration-hint');
try {
  const response = await fetch('/community/members/config.json', {cache:'no-store'});
  if (!response.ok) throw new Error('Community configuration unavailable');
  const config = await response.json();
  if (config.enabled === true && config.registrationOpen === true) {
    button.hidden = false;
    intro.textContent = 'Sign in or create a free account to join one or both Care & Stay communities.';
    hint.textContent = 'New accounts must verify their email address. By joining a community, you acknowledge its current membership terms, guidelines, and privacy notice.';
  }
} catch {
  // Fail closed: sign-in stays available, but no new registration is offered.
}
