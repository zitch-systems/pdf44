/* ============================================================================
 *  PDF44 — account / subscription / ad-gating controller (client)
 *
 *  Loads Supabase, manages auth (email + Google), profiles, the $1/mo & $10/yr
 *  Paystack checkout, and turns ads off for premium users. Self-contained:
 *  if window.PDF44_CONFIG.enabled is false it returns immediately and the site
 *  behaves exactly as it did before.
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.PDF44_CONFIG;
  if (!CFG || !CFG.enabled) return; // ← live site untouched until configured

  var SUPA_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

  var SB = null;          // supabase client
  var session = null;     // auth session
  var profile = null;     // profiles row
  var sub = null;         // latest subscription row (or null)
  var adsEnabled = true;  // site_settings.ads_enabled (admin kill-switch)
  var overlay = null;     // overlay DOM node

  /* ── helpers ───────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function initials(name, email) {
    var s = (name || email || '?').trim();
    var parts = s.split(/\s+/);
    return ((parts[0] ? parts[0][0] : '') + (parts[1] ? parts[1][0] : '')).toUpperCase() || s[0].toUpperCase();
  }
  var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function loadSupabase() {
    return new Promise(function (res, rej) {
      if (window.supabase && window.supabase.createClient) return res();
      var s = document.createElement('script');
      s.src = SUPA_CDN; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('Could not load Supabase')); };
      document.head.appendChild(s);
    });
  }

  /* ── premium / ad state ────────────────────────────────────────────────── */
  function isPremium() {
    return !!(sub && sub.status === 'active' &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date()));
  }
  function applyAds() {
    var suppress = (!adsEnabled) || isPremium();
    try { localStorage.setItem('pdf44_prem', isPremium() ? '1' : '0'); } catch (e) {}
    if (typeof window.PDF44_applyAdState === 'function') window.PDF44_applyAdState(suppress);
  }

  /* ── data loading ──────────────────────────────────────────────────────── */
  function loadState() {
    return SB.auth.getSession().then(function (r) {
      session = r.data.session;
      return SB.from('site_settings').select('key,value').eq('key', 'ads_enabled').maybeSingle()
        .then(function (s) {
          if (s.data) adsEnabled = s.data.value === true || s.data.value === 'true';
        }).catch(function () {});
    }).then(function () {
      if (session && session.user) return loadUserData();
      profile = null; sub = null;
    }).then(function () {
      applyAds();
      renderButton();
    }).catch(function (e) { console.warn('[PDF44 account] state', e); });
  }

  function loadUserData() {
    var uid = session.user.id;
    return Promise.all([
      SB.from('profiles').select('*').eq('id', uid).maybeSingle(),
      SB.from('subscriptions').select('*').eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(function (rs) {
      profile = (rs[0] && rs[0].data) || { id: uid, email: session.user.email, full_name: '' };
      sub = (rs[1] && rs[1].data) || null;
    });
  }

  /* ── topbar button ─────────────────────────────────────────────────────── */
  function renderButton() {
    var bar = document.querySelector('.topbar-actions');
    if (!bar) return;
    var btn = document.getElementById('pdf44AcctBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'pdf44AcctBtn';
      btn.className = 'pdf44-acct-btn';
      btn.onclick = function () { session ? showProfile() : showAuth('signin'); };
      var clearBtn = document.getElementById('clearBtn');
      if (clearBtn) bar.insertBefore(btn, clearBtn); else bar.appendChild(btn);
    }
    if (session && profile) {
      var nm = profile.full_name || (profile.email || '').split('@')[0] || 'Account';
      var av = profile.avatar_url
        ? '<img class="pdf44-avatar" src="' + esc(profile.avatar_url) + '" alt="">'
        : '<span class="pdf44-avatar" style="display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#fff;font-size:10px;font-weight:800;">' + esc(initials(profile.full_name, profile.email)) + '</span>';
      btn.innerHTML = av + '<span>' + esc(nm) + '</span>' +
        (isPremium() ? '<span class="pdf44-badge-pill">Pro</span>' : '');
    } else {
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Sign in</span>';
    }
  }

  /* ── overlay plumbing ──────────────────────────────────────────────────── */
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = h('<div class="pdf44-acct-overlay"><div class="pdf44-acct-sheet" role="dialog" aria-modal="true"></div></div>');
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOverlay(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOverlay(); });
    document.body.appendChild(overlay);
    return overlay;
  }
  function openOverlay(inner, wide) {
    ensureOverlay();
    var sheet = overlay.querySelector('.pdf44-acct-sheet');
    sheet.className = 'pdf44-acct-sheet' + (wide ? ' wide' : '');
    sheet.innerHTML = '<button class="pdf44-acct-x" aria-label="Close">&times;</button>' + inner;
    sheet.querySelector('.pdf44-acct-x').onclick = closeOverlay;
    requestAnimationFrame(function () { overlay.classList.add('open'); });
    return sheet;
  }
  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove('open');
    if (history.state && history.state.pdf44acct) history.replaceState({}, '', '/');
  }
  function msg(sheet, text, kind) {
    var box = sheet.querySelector('.pdf44-acct-msg');
    if (!box) { box = h('<div class="pdf44-acct-msg"></div>'); sheet.querySelector('form, .pdf44-acct-body').prepend(box); }
    box.className = 'pdf44-acct-msg ' + (kind || 'err');
    box.textContent = text;
  }

  /* ── auth views ────────────────────────────────────────────────────────── */
  function googleBtnHTML() {
    if (!CFG.auth || CFG.auth.google === false) return '';
    return '<button type="button" class="pdf44-acct-btn-ghost" id="pdf44Google">' +
      '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/></svg>' +
      'Continue with Google</button>' +
      '<div class="pdf44-acct-divider">or</div>';
  }

  function showAuth(mode) {
    var signup = mode === 'signup';
    var sheet = openOverlay(
      '<div class="pdf44-acct-head"><div class="pdf44-acct-logo">P</div>' +
      '<div class="pdf44-acct-title">' + (signup ? 'Create your account' : 'Welcome back') + '</div></div>' +
      '<p class="pdf44-acct-sub">' + (signup
        ? 'Sign up to manage your subscription and go ad-free.'
        : 'Sign in to your ' + esc(CFG.brand || 'PDF44') + ' account.') + '</p>' +
      googleBtnHTML() +
      '<form id="pdf44AuthForm" class="pdf44-acct-body" autocomplete="on">' +
        (signup ? '<div class="pdf44-acct-field"><label>Name</label><input name="name" type="text" placeholder="Your name" autocomplete="name"></div>' : '') +
        '<div class="pdf44-acct-field"><label>Email</label><input name="email" type="email" required placeholder="you@example.com" autocomplete="email"></div>' +
        '<div class="pdf44-acct-field"><label>Password</label><input name="password" type="password" required minlength="6" placeholder="••••••••" autocomplete="' + (signup ? 'new-password' : 'current-password') + '"></div>' +
        '<button type="submit" class="pdf44-acct-btn-primary">' + (signup ? 'Create account' : 'Sign in') + '</button>' +
      '</form>' +
      '<div class="pdf44-acct-switch">' + (signup
        ? 'Already have an account? <a id="pdf44ToSignin">Sign in</a>'
        : 'New here? <a id="pdf44ToSignup">Create an account</a>') + '</div>'
    );

    var g = sheet.querySelector('#pdf44Google');
    if (g) g.onclick = googleAuth;
    var toSignup = sheet.querySelector('#pdf44ToSignup'); if (toSignup) toSignup.onclick = function () { showAuth('signup'); };
    var toSignin = sheet.querySelector('#pdf44ToSignin'); if (toSignin) toSignin.onclick = function () { showAuth('signin'); };

    sheet.querySelector('#pdf44AuthForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('button[type=submit]');
      var email = f.email.value.trim(), pw = f.password.value, name = f.name ? f.name.value.trim() : '';
      btn.disabled = true; btn.innerHTML = '<span class="pdf44-acct-spin"></span>' + (signup ? 'Creating…' : 'Signing in…');
      var p = signup
        ? SB.auth.signUp({ email: email, password: pw, options: { data: { full_name: name } } })
        : SB.auth.signInWithPassword({ email: email, password: pw });
      p.then(function (r) {
        if (r.error) throw r.error;
        if (signup && !r.data.session) { msg(sheet, 'Check your email to confirm your account, then sign in.', 'ok'); btn.disabled = false; btn.textContent = 'Create account'; return; }
        return loadState().then(function () { showProfile(); });
      }).catch(function (err) {
        msg(sheet, err.message || 'Something went wrong', 'err');
        btn.disabled = false; btn.textContent = signup ? 'Create account' : 'Sign in';
      });
    });
  }

  function googleAuth() {
    SB.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/account' } });
  }

  /* ── profile / account view ────────────────────────────────────────────── */
  function planLabel() {
    if (!sub) return '';
    var pl = CFG.plans[sub.plan];
    return pl ? pl.label : sub.plan;
  }
  function showProfile() {
    if (!session) return showAuth('signin');
    var prem = isPremium();
    var nm = profile.full_name || '';
    var av = profile.avatar_url
      ? '<img class="pdf44-avatar-lg" src="' + esc(profile.avatar_url) + '" alt="">'
      : '<div class="pdf44-avatar-lg">' + esc(initials(profile.full_name, profile.email)) + '</div>';

    var planCard;
    if (prem) {
      var end = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : null;
      var canChange = !sub.cancel_at_period_end;
      planCard =
        '<div class="pdf44-plan-card premium"><div class="pdf44-plan-row">' +
        '<div><strong style="color:var(--text)">' + esc(planLabel()) + ' plan</strong>' +
        '<div class="pdf44-plan-status">Ad-free is active' + (end ? ' · renews ' + esc(end) : '') +
        (sub.cancel_at_period_end ? ' · cancels at period end' : '') + '</div></div>' +
        '<span class="pdf44-status-chip active">Active</span></div>' +
        ((canChange && sub.plan === 'monthly')
          ? '<button class="pdf44-acct-btn-ghost" id="pdf44Upgrade" style="margin-top:12px;">Upgrade to annual — 2 months free</button>' : '') +
        (canChange
          ? '<button class="pdf44-acct-btn-ghost" id="pdf44Cancel" style="margin-top:8px;color:var(--error);">Cancel subscription</button>' : '') +
        '</div>';
    } else {
      planCard =
        '<div class="pdf44-plan-card"><div class="pdf44-plan-row">' +
        '<div><strong style="color:var(--text)">Free plan</strong>' +
        '<div class="pdf44-plan-status">Ads support the free tools.</div></div>' +
        '<span class="pdf44-status-chip free">Free</span></div>' +
        '<button class="pdf44-acct-btn-primary" id="pdf44Upgrade" style="margin-top:14px;">Remove ads — Go Premium</button></div>';
    }

    var sheet = openOverlay(
      '<div class="pdf44-acct-profile-top">' + av +
      '<div><div class="pdf44-acct-profile-name">' + esc(nm || 'Your account') + '</div>' +
      '<div class="pdf44-acct-profile-email">' + esc(profile.email) + '</div></div></div>' +
      planCard +
      '<form id="pdf44ProfForm" class="pdf44-acct-body">' +
        '<div class="pdf44-acct-field"><label>Display name</label><input name="name" type="text" value="' + esc(nm) + '" placeholder="Your name"></div>' +
        '<button type="submit" class="pdf44-acct-btn-ghost">Save profile</button>' +
      '</form>' +
      '<form id="pdf44PwForm" class="pdf44-acct-body" style="margin-top:6px;">' +
        '<div class="pdf44-acct-field"><label>New password</label><input name="newpw" type="password" minlength="6" placeholder="At least 6 characters" autocomplete="new-password"></div>' +
        '<button type="submit" class="pdf44-acct-btn-ghost">Change password</button>' +
      '</form>' +
      (profile.role === 'admin' ? '<a class="pdf44-acct-btn-ghost" href="/admin" style="margin-top:10px;text-decoration:none;">Open admin portal</a>' : '') +
      '<button class="pdf44-acct-btn-ghost" id="pdf44SignOut" style="margin-top:10px;">Sign out</button>'
    );

    var up = sheet.querySelector('#pdf44Upgrade');
    if (up) up.onclick = prem ? upgradeToAnnual : showPricing;

    var cancelBtn = sheet.querySelector('#pdf44Cancel');
    if (cancelBtn) cancelBtn.onclick = function () {
      if (!window.confirm('Cancel your subscription? You’ll keep premium until the end of the current billing period, then ads return.')) return;
      var b = this; b.disabled = true; b.textContent = 'Cancelling…';
      cancelSubscription().then(function () { showProfile(); }).catch(function (err) {
        b.disabled = false; b.textContent = 'Cancel subscription'; msg(sheet, err.message || 'Could not cancel', 'err');
      });
    };

    sheet.querySelector('#pdf44PwForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = e.target.querySelector('button'), pw = e.target.newpw.value;
      if (!pw || pw.length < 6) { msg(sheet, 'Password must be at least 6 characters', 'err'); return; }
      btn.disabled = true; btn.textContent = 'Updating…';
      SB.auth.updateUser({ password: pw }).then(function (r) {
        if (r.error) throw r.error;
        e.target.newpw.value = ''; btn.disabled = false; btn.textContent = 'Password updated ✓';
        setTimeout(function () { btn.textContent = 'Change password'; }, 1800);
      }).catch(function (err) { btn.disabled = false; btn.textContent = 'Change password'; msg(sheet, err.message || 'Could not update password', 'err'); });
    });

    sheet.querySelector('#pdf44SignOut').onclick = function () { signOut(); };
    sheet.querySelector('#pdf44ProfForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = e.target.querySelector('button'); var name = e.target.name.value.trim();
      btn.disabled = true; btn.textContent = 'Saving…';
      SB.from('profiles').update({ full_name: name }).eq('id', session.user.id)
        .then(function (r) {
          if (r.error) throw r.error;
          profile.full_name = name; renderButton();
          btn.disabled = false; btn.textContent = 'Saved ✓';
          setTimeout(function () { btn.textContent = 'Save profile'; }, 1500);
        }).catch(function (err) { msg(sheet, err.message, 'err'); btn.disabled = false; btn.textContent = 'Save profile'; });
    });
  }

  /* ── pricing / paywall ─────────────────────────────────────────────────── */
  function showPricing(ctx) {
    var m = CFG.plans.monthly, a = CFG.plans.annual;
    var title = (ctx && ctx.title) || 'Go Premium';
    var subText = (ctx && ctx.sub) ||
      ('Remove every ad and support ' + esc(CFG.brand || 'PDF44') + '. Same private, in-browser tools — just cleaner.');
    var feat = ['Unlimited downloads', 'No file-size limit', 'No ads, anywhere', 'All 41+ PDF tools', 'Cancel anytime'];
    var sheet = openOverlay(
      '<div class="pdf44-acct-head"><div class="pdf44-acct-logo">P</div>' +
      '<div class="pdf44-acct-title">' + esc(title) + '</div></div>' +
      '<p class="pdf44-acct-sub">' + subText + '</p>' +
      '<div class="pdf44-pricing">' +
        '<div class="pdf44-price-card" data-plan="monthly"><div class="pdf44-price-name">' + esc(m.label) + '</div>' +
          '<div class="pdf44-price-amount">' + esc(m.price) + '<span>' + esc(m.per) + '</span></div>' +
          '<div class="pdf44-price-blurb">' + esc(m.blurb) + '</div></div>' +
        '<div class="pdf44-price-card best" data-plan="annual"><span class="pdf44-price-tag">Best value</span>' +
          '<div class="pdf44-price-name">' + esc(a.label) + '</div>' +
          '<div class="pdf44-price-amount">' + esc(a.price) + '<span>' + esc(a.per) + '</span></div>' +
          '<div class="pdf44-price-blurb">' + esc(a.blurb) + '</div></div>' +
      '</div>' +
      '<ul class="pdf44-feat">' + feat.map(function (f) { return '<li>' + CHECK + esc(f) + '</li>'; }).join('') + '</ul>' +
      '<div class="pdf44-acct-msg" style="display:none"></div>' +
      '<button class="pdf44-acct-btn-primary" id="pdf44Pay" style="margin-top:6px;">Continue</button>' +
      '<p class="pdf44-acct-fineprint">Secure payment via Paystack. Questions? <a href="mailto:' + esc(CFG.supportEmail || '') + '">' + esc(CFG.supportEmail || '') + '</a></p>',
      true
    );

    var chosen = 'annual';
    function paint() {
      sheet.querySelectorAll('.pdf44-price-card').forEach(function (c) {
        var sel = c.dataset.plan === chosen;
        // Set the unselected border explicitly to var(--border): the annual card
        // carries a permanent accent border via the `.best` CSS rule, so an empty
        // string wouldn't clear it (the red border would stay on annual).
        c.style.borderColor = sel ? 'var(--accent)' : 'var(--border)';
        c.style.boxShadow = sel ? 'var(--shadow)' : 'none';
      });
    }
    sheet.querySelectorAll('.pdf44-price-card').forEach(function (c) {
      c.onclick = function () { chosen = c.dataset.plan; paint(); };
    });
    paint();

    sheet.querySelector('#pdf44Pay').onclick = function () {
      if (!session) { showAuth('signin'); return; }
      var btn = this; btn.disabled = true; btn.innerHTML = '<span class="pdf44-acct-spin"></span>Redirecting to checkout…';
      subscribe(chosen).catch(function (err) {
        var box = sheet.querySelector('.pdf44-acct-msg'); box.style.display = ''; box.className = 'pdf44-acct-msg err'; box.textContent = err.message || 'Could not start checkout';
        btn.disabled = false; btn.textContent = 'Continue';
      });
    };
  }

  /* ── billing ───────────────────────────────────────────────────────────── */
  function fnUrl(name) { return CFG.supabaseUrl.replace(/\/$/, '') + '/functions/v1/' + name; }
  function subscribe(planKey) {
    return SB.auth.getSession().then(function (r) {
      var token = r.data.session && r.data.session.access_token;
      if (!token) throw new Error('Please sign in first');
      return fetch(fnUrl(CFG.functions.initialize), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': CFG.supabaseAnonKey },
        body: JSON.stringify({ plan: planKey }),
      });
    }).then(function (res) { return res.json(); }).then(function (j) {
      if (j && j.authorization_url) { location.href = j.authorization_url; return; }
      throw new Error((j && j.error) || 'Could not start checkout');
    });
  }

  // Cancel: stop the Paystack subscription renewing; premium stays until the
  // period end (server marks cancel_at_period_end). Refreshes local state.
  function cancelSubscription() {
    return SB.auth.getSession().then(function (r) {
      var token = r.data.session && r.data.session.access_token;
      if (!token) throw new Error('Please sign in first');
      return fetch(fnUrl(CFG.functions.cancel || 'paystack-cancel'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': CFG.supabaseAnonKey },
        body: '{}',
      });
    }).then(function (res) { return res.json(); }).then(function (j) {
      if (j && j.error) throw new Error(j.error);
      return loadState().then(function () { return j; });
    });
  }

  // Upgrade monthly → annual: stop the monthly renewal, then start annual
  // checkout. The webhook replaces the active subscription on the new charge.
  function upgradeToAnnual() {
    if (!window.confirm('Upgrade to the annual plan? Your monthly plan is cancelled and you’ll be taken to checkout for the annual plan (₦15,000/yr).')) return;
    cancelSubscription()
      .then(function () { return subscribe('annual'); })
      .catch(function (err) { window.alert(err.message || 'Could not start the upgrade'); });
  }

  function verifyReturn(reference) {
    var sheet = openOverlay(
      '<div class="pdf44-acct-head"><div class="pdf44-acct-logo">P</div><div class="pdf44-acct-title">Confirming payment…</div></div>' +
      '<p class="pdf44-acct-sub"><span class="pdf44-acct-spin" style="border-color:var(--border-strong);border-top-color:var(--accent)"></span>Hang tight while we activate your ad-free access.</p>'
    );
    SB.auth.getSession().then(function (r) {
      var token = r.data.session && r.data.session.access_token;
      return fetch(fnUrl(CFG.functions.verify), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': CFG.supabaseAnonKey },
        body: JSON.stringify({ reference: reference }),
      });
    }).then(function (res) { return res.json(); }).then(function (j) {
      return loadState().then(function () { return j; });
    }).then(function (j) {
      if (j && j.status === 'active' || isPremium()) {
        openOverlay(
          '<div class="pdf44-acct-head"><div class="pdf44-acct-logo" style="background:linear-gradient(135deg,var(--success),#15803d)">' + CHECK + '</div>' +
          '<div class="pdf44-acct-title">You\'re ad-free 🎉</div></div>' +
          '<p class="pdf44-acct-sub">Your ' + esc(planLabel() || 'premium') + ' subscription is active. Ads are now off across ' + esc(CFG.brand || 'PDF44') + '.</p>' +
          '<button class="pdf44-acct-btn-primary" id="pdf44Done">Start using PDF44</button>'
        ).querySelector('#pdf44Done').onclick = closeOverlay;
      } else {
        openOverlay(
          '<div class="pdf44-acct-head"><div class="pdf44-acct-logo">P</div><div class="pdf44-acct-title">Payment pending</div></div>' +
          '<p class="pdf44-acct-sub">We haven\'t confirmed this payment yet. If you completed checkout it can take a moment — refresh your profile shortly.</p>' +
          '<button class="pdf44-acct-btn-ghost" id="pdf44Done">Close</button>'
        ).querySelector('#pdf44Done').onclick = closeOverlay;
      }
    }).catch(function (err) {
      var s = overlay && overlay.querySelector('.pdf44-acct-sheet');
      if (s) msg(s, err.message || 'Could not confirm payment', 'err');
    });
  }

  function signOut() {
    SB.auth.signOut().then(function () { sub = null; profile = null; session = null; applyAds(); renderButton(); closeOverlay(); });
  }

  /* ── deep links ────────────────────────────────────────────────────────── */
  function handlePath() {
    var p = location.pathname, qs = new URLSearchParams(location.search);
    if (/\/billing\/callback\/?$/.test(p)) {
      var ref = qs.get('reference') || qs.get('trxref');
      if (ref) verifyReturn(ref); else if (session) showProfile();
    } else if (p === '/account' || p === '/account/') {
      session ? showProfile() : showAuth('signin');
    } else if (p === '/pricing' || p === '/pricing/') {
      showPricing();
    }
  }

  /* ── public API + boot ─────────────────────────────────────────────────── */
  window.PDF44Account = {
    open: function () { session ? showProfile() : showAuth('signin'); },
    openPricing: showPricing,
    paywall: function (ctx) { showPricing(ctx || {}); },
    signOut: signOut,
    isPremium: isPremium,
    // Current access token (or null) — lets the app prove premium to the
    // download-quota function so subscribers are never metered.
    getToken: function () { return (session && session.access_token) || null; },
    refresh: loadState,
  };

  loadSupabase().then(function () {
    SB = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    var first = true;
    SB.auth.onAuthStateChange(function (_evt, s) {
      session = s;
      loadState();
    });

    // Re-check subscription/ad state when the user returns to the tab (e.g. back
    // from Paystack checkout), so premium activates without a manual reload even
    // if the /billing/callback verify step didn't run. Throttled.
    var lastRefresh = Date.now();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && session && Date.now() - lastRefresh > 8000) {
        lastRefresh = Date.now();
        loadState();
      }
    });

    return loadState().then(function () {
      if (first) { first = false; handlePath(); }
    });
  }).catch(function (e) { console.warn('[PDF44 account] init failed:', e.message); });
})();
